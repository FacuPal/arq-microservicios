"use strict";

import * as async from "async";
import { RestClient } from "typed-rest-client/RestClient";
import * as env from "../server/environment";
import * as error from "../server/error";
import { Cart, DeliveryEvent, DeliveryProjection, FailedDeliveryProjection, ICart, ICartArticle, IDeliveryEvent, IDeliveryProjection, ITrackingEvent } from "./schema";
import { DeliveryEventStatusEnum } from "../enums/status.enum";
// import { sendArticleValidation, sendPlaceOrder } from "../rabbit/deliveryService";

const conf = env.getConfig(process.env);

interface CartValidationItem {
    articleId: string;
    message: string;
}
interface ICartValidation {
    errors: CartValidationItem[];
    warnings: CartValidationItem[];
}

interface UpdateDeliveryRequest {
    lastKnownLocation: string;
    delivered: boolean;
}

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
                        if (![DeliveryEventStatusEnum.TRANSIT_RETURN, DeliveryEventStatusEnum.RETURNED].includes(projection.status))
                            throw inconsistentTransitionError(projection.status, event.eventType)
                        break;
                    case DeliveryEventStatusEnum.RETURNED:
                        if (projection.status !== DeliveryEventStatusEnum.DELIVERED)
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

export function updateDelivery(token: string, trackingNumber: number, updateDeliveryRequest: UpdateDeliveryRequest): Promise<IDeliveryEvent> {
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

                //Se guarda el nuevo evento y la proyección
                newEvent.save()
                projection.save()

                resolve(newEvent)
            }).catch(err => {
                reject(err)
            })


        });
    });
}

export function currentCart(userId: string): Promise<ICart> {
    return new Promise((resolve, reject) => {
        Cart.findOne({
            userId: userId,
            enabled: true
        }, function (err: any, cart: ICart) {
            if (err) return reject(err);

            // if (!cart) {
            //     const result = new Cart();
            //     result.userId = userId;
            //     result.save(function (err: any) {
            //         if (err) return reject(err);
            //         resolve(result);
            //     });
            // } else {
            //     new Promise((result, reject) => {
            //         cart.articles.forEach(article => {
            //             if (!article.validated) {
            //                 sendArticleValidation(cart._id, article.articleId).then();
            //             }
            //         });
            //     }).catch(err => console.log(err));
            //     resolve(cart);
            // }
        });
    });
}

interface AddArticleRequest {
    articleId?: string;
    quantity?: number;
}
export async function addArticle(userId: string, body: AddArticleRequest): Promise<ICart> {
    try {
        body = await validateAddArticle(body);
        const cart = await currentCart(userId);
        const article: ICartArticle = {
            articleId: body.articleId,
            quantity: body.quantity
        };

        cart.addArticle(article);

        // Save the Cart
        return new Promise<ICart>((resolve, reject) => {
            cart.save(function (err: any) {
                if (err) return reject(err);

                resolve(cart);
            });
        });
    } catch (err) {
        return Promise.reject(err);
    }
}

export async function decrementArticle(userId: string, body: AddArticleRequest): Promise<ICart> {
    try {
        body = await validateAddArticle(body);
        const cart = await currentCart(userId);
        const article: ICartArticle = {
            articleId: body.articleId,
            quantity: body.quantity
        };

        cart.decrementArticle(article);

        // Save the Cart
        return new Promise<ICart>((resolve, reject) => {
            cart.save(function (err: any) {
                if (err) return reject(err);

                resolve(cart);
            });
        });
    } catch (err) {
        return Promise.reject(err);
    }
}

function validateAddArticle(body: AddArticleRequest): Promise<AddArticleRequest> {
    const result: error.ValidationErrorMessage = {
        messages: []
    };

    if (!body.articleId) {
        result.messages.push({ path: "articleId", message: "No puede quedar vacío." });
    }

    if (!body.quantity || body.quantity <= 0) {
        result.messages.push({ path: "quantity", message: "Debe se numérico." });
    }

    if (result.messages.length > 0) {
        return Promise.reject(result);
    }
    return Promise.resolve(body);
}

export async function deleteArticle(userId: string, articleId: string): Promise<void> {
    try {
        const cart = await currentCart(userId);

        cart.removeArticle(articleId);

        // Save the Cart
        return new Promise<void>((resolve, reject) => {
            cart.save(function (err: any) {
                if (err) return reject(err);

                resolve();
            });
        });
    } catch (err) {
        return Promise.reject(err);
    }
}

/**
 * Esta validación es muy cara porque valida todo contra otros servicios en forma síncrona.
 */
interface Article {
    "_id": string;
    "name": string;
    "price": number;
    "stock": number;
    "enabled": boolean;
}
export function validateCheckout(userId: string, token: string): Promise<ICartValidation> {
    return new Promise((resolve, reject) => {
        currentCart(userId)
            .then(cart => {
                async.map(cart.articles,
                    (article: ICartArticle, callback) => {
                        const restClient: RestClient = new RestClient("GetArticle", conf.catalogServer);
                        restClient.get<any>("/v1/articles/" + article.articleId,
                            { additionalHeaders: { "Authorization": token } }).then(
                                (data) => {
                                    callback(undefined, data.result as Article);
                                }
                            ).catch(
                                (exception) => {
                                    callback(undefined, { "id": undefined });
                                }
                            );
                    },
                    (err, results: Article[]) => {
                        if (err) {
                            return reject(err);
                        }

                        const validation: ICartValidation = {
                            errors: [],
                            warnings: []
                        };

                        cart.articles.map((article) => {
                            return {
                                article: article,
                                result: results.find(element => element._id == article.articleId)
                            };
                        }).forEach(element => {
                            if (!element.result) {
                                validation.errors.push({
                                    articleId: element.article.articleId,
                                    message: "No se encuentra"
                                });
                            } else if (!element.result.enabled) {
                                validation.errors.push({
                                    articleId: element.article.articleId,
                                    message: "Articulo inválido"
                                });
                            } else {
                                if (element.result.stock < element.article.quantity) {
                                    validation.warnings.push({
                                        articleId: element.article.articleId,
                                        message: "Insuficiente stock"
                                    });
                                }
                            }
                        });

                        resolve(validation);
                    });
            }).catch(err => reject(err));
    });
}

/**
 * @api {post} /v1/cart/checkout Checkout
 * @apiName Checkout
 * @apiGroup Carrito
 *
 * @apiDescription Realiza el checkout del carrito.
 *
 * @apiSuccessExample {string} Body
 *    HTTP/1.1 200 Ok
 *
 * @apiUse ParamValidationErrors
 * @apiUse OtherErrors
 */
export function placeOrder(userId: string): Promise<void> {
    return new Promise((resolve, reject) => {
        currentCart(userId)
            .then(cart => {
                if (cart.articles.length == 0) {
                    reject(error.newError(
                        400,
                        "No posee items"
                    ));
                }
                cart.enabled = false;
                // Save the Cart
                cart.save(function (err: any) {
                    if (err) return reject(err);

                    // sendPlaceOrder(cart);
                    resolve();
                });
            }).catch(err => reject(err));
    });
}
