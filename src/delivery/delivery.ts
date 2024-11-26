"use strict";

import { RestClient } from "typed-rest-client/RestClient";
import * as env from "../server/environment";
import * as error from "../server/error";
import { DeliveryEvent, DeliveryProjection, FailedDeliveryProjection, IDeliveryEvent, IDeliveryProjection, ITrackingEvent } from "./schema";
import { DeliveryEventStatusEnum } from "../enums/status.enum";
import { sendNotification } from "../rabbit/deliveryService";

const conf = env.getConfig(process.env);

interface IOrderResponse {
    created: string,
    orderId: string,
    status: string,
    userId: string
}

/**
 * Obtener los datos de la orden desde el servicio de orders.
 */
export function getOrderInfo(orderId: string, token: string): Promise<IOrderResponse> {
    const restClient: RestClient = new RestClient("GetOrderInfo", conf.orderServer);

    return restClient.get<any>("/v1/orders/" + orderId,
        { additionalHeaders: { "Authorization": token.replace("Bearer", "bearer") } }).then(
            (data) => {
                if (data.result.error)
                    throw error.newError(error.ERROR_INTERNAL_ERROR, data.result.error)
                return data.result as IOrderResponse
            }
        ).catch(exception => {
            throw error.newError(error.ERROR_INTERNAL_ERROR, exception.message || "Hubo un error al consultar el servicio de ordenes.")
        });
}

function inconsistentTransitionError(originStatus: string, destinationStatus: string) {
    return { message: `La transición ${originStatus} -> ${destinationStatus} es inconsistente.` }
}

/**
 * Crea la proyección del envío en base al trackingNumber enviado
 * 
 * @param token token obtenido del request para poder consultar otros microservicios
 * @param trackingNumber trackingNumber a utilizar para generar la proyección
 * @returns 
 */
export async function projectDelivery(token: string, trackingNumber: number) {

    //Borramos cualquier proyección que exista para el trackingNumber
    await DeliveryProjection.deleteMany({ trackingNumber: trackingNumber })

    return await DeliveryEvent.find({
        trackingNumber
    }).sort("created").then(async (events) => {
        // Validamos que el envío exista
        if (events.length === 0)
            throw error.newError(error.ERROR_NOT_FOUND, `El envío solicitado no existe.`)

        const order = await getOrderInfo(events[0].orderId, token)

        //Creamos una nueva proyección para el envío
        const projection = new DeliveryProjection({
            trackingNumber: trackingNumber,
            userId: order.userId,
            orderId: order.orderId,
            status: DeliveryEventStatusEnum.PENDING,
            creationDate: new Date(),
        })

        //Se cargan todos los eventos a la proyección.
        projection.trackingEvents = events.map(event => {
            return {
                eventType: event.eventType,
                locationName: event.lastKnownLocation,
                updateDate: event.created,
            }
        });

        //Recorremos los eventos y vamos aplicandolos a la proyección
        try {
            for (const event of events) {
                if (projection.orderId !== event.orderId)
                    throw { message: `Existen varios orderId para el mismo trackingNumber: [${projection.orderId}, ${event.orderId}]` }

                switch (event.eventType) {
                    case DeliveryEventStatusEnum.PENDING:
                        if (projection.status !== DeliveryEventStatusEnum.PENDING)
                            throw inconsistentTransitionError(projection.status, event.eventType)
                        break;

                    case DeliveryEventStatusEnum.TRANSIT:
                        if (![DeliveryEventStatusEnum.PENDING, DeliveryEventStatusEnum.TRANSIT].includes(projection.status))
                            throw inconsistentTransitionError(projection.status, event.eventType)
                        break;

                    case DeliveryEventStatusEnum.CANCELED:
                    case DeliveryEventStatusEnum.DELIVERED:
                        if (projection.status !== DeliveryEventStatusEnum.TRANSIT)
                            throw inconsistentTransitionError(projection.status, event.eventType)
                        break;
                    case DeliveryEventStatusEnum.PENDING_RETURN:
                        if (projection.status !== DeliveryEventStatusEnum.DELIVERED)
                            throw inconsistentTransitionError(projection.status, event.eventType)
                        break;
                    case DeliveryEventStatusEnum.TRANSIT_RETURN:
                        if (![DeliveryEventStatusEnum.TRANSIT_RETURN, DeliveryEventStatusEnum.PENDING_RETURN].includes(projection.status))
                            throw inconsistentTransitionError(projection.status, event.eventType)
                        break;
                    case DeliveryEventStatusEnum.RETURNED:
                        if (projection.status !== DeliveryEventStatusEnum.TRANSIT_RETURN)
                            throw inconsistentTransitionError(projection.status, event.eventType)
                        break;

                    default:
                        throw { message: `Estado desconocido: ${event.eventType}` }
                        break;
                }
                // Actualizamos la proyección
                projection.status = event.eventType;
                projection.lastKnownLocation = event.lastKnownLocation;
                projection.updated = event.updated
            }
            //Guardamos la proyección
            await projection.save()
        } catch (err: any) {
            // Generamos la proyección fallida
            await new FailedDeliveryProjection({
                orderId: projection.orderId,
                userId: projection.userId,
                trackingNumber: projection.trackingNumber,
                failedMessage: err.message,
                trackingEvents: projection.trackingEvents,
                created: new Date()
            }).save()
            throw error.newError(error.ERROR_INTERNAL_ERROR, `Hubo un error al calcular el estado del envío.`)
        }

        //Retornamos la proyección
        return projection;
    })
}


interface UpdateDeliveryBody {
    lastKnownLocation: string;
    delivered: boolean;
}

export function updateDelivery(token: string, trackingNumber: number, updateDeliveryRequest: UpdateDeliveryBody): Promise<IDeliveryEvent> {
    return new Promise((resolve, reject) => {

        DeliveryEvent.findOne({
            trackingNumber: trackingNumber
        }, function (err: any, event: IDeliveryEvent) {
            if (err) return reject(err);
            //Si no existe ningún evento con el trackingNumber, devolvemos error
            if (!event) return reject(error.newError(error.ERROR_NOT_FOUND, "El envío solicitado no existe."));

            projectDelivery(token, trackingNumber).then(projection => {
                //Se crea el nuevo evento.
                const newEvent = new DeliveryEvent()

                switch (projection.status) {
                    case DeliveryEventStatusEnum.PENDING:
                    case DeliveryEventStatusEnum.TRANSIT:
                        newEvent.eventType = updateDeliveryRequest.delivered ? DeliveryEventStatusEnum.DELIVERED : DeliveryEventStatusEnum.TRANSIT
                        break;
                    case DeliveryEventStatusEnum.PENDING_RETURN:
                        if (updateDeliveryRequest.delivered)
                            throw error.newError(error.ERROR_INTERNAL_ERROR, `No se puede entregar al cliente si el envío está pendiente de devolución.`)
                    case DeliveryEventStatusEnum.TRANSIT_RETURN:
                        newEvent.eventType = updateDeliveryRequest.delivered ? DeliveryEventStatusEnum.RETURNED : DeliveryEventStatusEnum.TRANSIT_RETURN
                        break;
                    default:
                        throw error.newError(error.ERROR_INTERNAL_ERROR, `El envío no puede actualizar su ubicación.`)

                }

                //Se actualizan los campos del nuevo evento
                newEvent.lastKnownLocation = updateDeliveryRequest.lastKnownLocation;
                newEvent.orderId = projection.orderId;
                newEvent.trackingNumber = trackingNumber;
                newEvent.created = new Date();

                //Se actualiza el estado de la proyección
                projection.status = newEvent.eventType;
                projection.lastKnownLocation = newEvent.lastKnownLocation;

                //Se guarda el nuevo evento y la proyección
                newEvent.save()
                projection.save()

                // Si el nuevo estado es DELIVERED o RETURNED, se notifica
                if ([DeliveryEventStatusEnum.DELIVERED, DeliveryEventStatusEnum.RETURNED].includes(newEvent.eventType))
                    sendNotification({
                        notificationType: newEvent.eventType === DeliveryEventStatusEnum.DELIVERED ? "delivery_delivered" : "delivery_returned",
                        trackingNumber: trackingNumber,
                        userId: projection.userId
                    })

                resolve(newEvent)
            }).catch(err => {
                reject(err)
            })
        });
    });
}

export function getDelivery(token: string, userId: string, isAdmin: boolean = false, trackingNumber: number): Promise<IDeliveryProjection> {
    return new Promise((resolve, reject) => {
        DeliveryProjection.findOne({
            trackingNumber: trackingNumber
        }, function (err: any, projection: IDeliveryProjection) {
            if (err) reject(err)

            if (!projection)
                projectDelivery(token, trackingNumber)
                    .then(projection => {
                        if (projection.userId !== userId && !isAdmin)
                            reject(error.newError(error.ERROR_FORBIDDEN, `El envío ${trackingNumber} no le pertenece.`))
                        resolve(projection)
                    })
                    .catch(err => reject(err))
            else
                resolve(projection)
        });
    });
}

export function cancelDelivery(token: string, trackingNumber: number): Promise<void> {
    return new Promise((resolve, reject) => {
        projectDelivery(token, trackingNumber).then(projection => {
            if (projection.status !== DeliveryEventStatusEnum.TRANSIT)
                return reject(error.newError(error.ERROR_INTERNAL_ERROR, `No se puede cancelar un envío que no está en tránsito.`))

            //Creamos el nuevo evento
            const newEvent = new DeliveryEvent({
                orderId: projection.orderId,
                trackingNumber: trackingNumber,
                eventType: DeliveryEventStatusEnum.CANCELED,
                created: new Date()
            }).save().then(event => {
                //Actualizamos la proyección
                projection.status = event.eventType;
                projection.trackingEvents.push({
                    eventType: event.eventType,
                    locationName: event.lastKnownLocation,
                    updateDate: event.created
                });
                projection.save()
            })

            sendNotification({
                notificationType: "delivery_canceled",
                trackingNumber: trackingNumber,
                userId: projection.userId
            })

            resolve(newEvent)
        }).catch(err => reject(err))
    });
}

export function returnDelivery(token: string, userId: string, trackingNumber: number): Promise<void> {
    return new Promise((resolve, reject) => {
        projectDelivery(token, trackingNumber).then(projection => {
            if (projection.userId !== userId)
                return reject(error.newError(error.ERROR_FORBIDDEN, `El envío no le pertenece.`))
            if (projection.status !== DeliveryEventStatusEnum.DELIVERED)
                return reject(error.newError(error.ERROR_INTERNAL_ERROR, `No se puede solicitar la devolución para un envío que no fue entregado.`))

            //Creamos el nuevo evento
            const newEvent = new DeliveryEvent({
                orderId: projection.orderId,
                trackingNumber: trackingNumber,
                eventType: DeliveryEventStatusEnum.PENDING_RETURN,
                created: new Date()
            }).save().then(event => {
                //Actualizamos la proyección
                projection.status = event.eventType;
                projection.trackingEvents.push({
                    eventType: event.eventType,
                    locationName: event.lastKnownLocation,
                    updateDate: event.created
                });
                projection.save()
            })

            sendNotification({
                notificationType: "delivery_pending_return",
                trackingNumber: trackingNumber,
                userId: projection.userId
            })

            resolve(newEvent)
        }).catch(err => reject(err))
    });
}

interface IListDeliveriesFilters {
    status?: string,
    startDate?: string,
    endDate?: string,
    page?: string,
}

export function listDeliveries(filters: IListDeliveriesFilters): Promise<IDeliveryEvent[]> {
    const filter = {
        $match: {}
    };

    if (filters.startDate || filters.endDate)
        filter.$match = {
            ...filter.$match,
            "created": {
                ...(filters.startDate && {
                    $gte: new Date(filters.startDate)
                }),
                ...(filters.endDate && {
                    $lte: new Date(filters.endDate)
                }),
            }
        };

    if (filters.status)
        filter.$match = {
            ...filter.$match,
            "status": filters.status
        };

    return new Promise((resolve, reject) => {
        DeliveryEvent.aggregate([{
            $group: {
                _id: "$trackingNumber",
                trackingNumber: { $first: "$trackingNumber"},
                created: { $min: "$created" },
                status: { $last: "$eventType" },
                lastKnownLocation: { $last: "$lastKnownLocation"}
            },
        },
            filter
        ])
            //Saltamos a la página indicada por el filtro. Sino se toma por defecto la primera página.
            .skip(conf.rowsPerPage * (parseInt(filters.page ?? "1") - 1))
            //Numero de registros por página
            .limit(conf.rowsPerPage)
            .then(list => resolve(list))
            .catch(err => reject(err))
    })
}
