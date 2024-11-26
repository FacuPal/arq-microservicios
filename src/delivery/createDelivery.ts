"use strict";
import { DeliveryEventStatusEnum } from "../enums/status.enum";
import { logger } from "../server/logger";
import * as nodeCache from "node-cache";

/**
 * Servicios internos de Delivery, normalmente son llamados por procesos Rabbit o background
 */

import { DeliveryEvent } from "./schema";
import { sendNotification } from "../rabbit/deliveryService";


const trackingNumberCache = new nodeCache({ stdTTL: 3600, checkperiod: 60 });

export interface ICreateDelivery {
    orderId: string;
    userId: string;
    status: string;
}

/** Calcula el trackingNumber. Si existe un evento de envío para esa orden, devuelve el mismo trackingNumber. Si existe el trackingNumber en caché, se calcula en base a ese,
 * sino se calcula en base a los eventos
 * 
 * @returns newTrackingNumber
 */
function calculateTrackingNumber(orderId: string) {
    return DeliveryEvent.findOne({ orderId: orderId })
        .then(event => {
            if (event) return event.trackingNumber

            //Buscamos en caché si existe el último trackingNumber asignado
            const previousTrackingNumber: number = trackingNumberCache.get("trackingNumber")

            //Si existe, lo usamos para generar el próximo
            if (previousTrackingNumber) return Promise.resolve(previousTrackingNumber + 1)

            //Si no está cacheado, lo calculamos en base a los eventos existentes.
            return DeliveryEvent.find({})
                .select("trackingNumber")
                .then(list => {
                    return list.map(tn => tn.trackingNumber)
                        .reduce((acc, tn) => {
                            return Math.max(acc, tn);
                        }, 0) + 1
                })
        })
};


/**
 * Procesa una validación realizada a través de rabbit.
 * Si un articulo no es valido se elimina del cart.
 */
export function createDelivery(data: ICreateDelivery) {
    logger.info("RabbitMQ Consume create-delivery : " + data.orderId + " - " + data.userId + " - " + data.status);

    //Generamos el tracking number y creamos el evento
    calculateTrackingNumber(data.orderId).then(newTrackingNumber => {
        new DeliveryEvent({
            orderId: data.orderId,
            trackingNumber: newTrackingNumber,
            userId: data.userId,
            eventType: DeliveryEventStatusEnum.PENDING,
            creationDate: new Date()
        }).save()

        //Actualizamos el trackingNumber en caché para futuros usos 
        trackingNumberCache.set("trackingNumber", newTrackingNumber)

        sendNotification({
            notificationType: "delivery_created",
            trackingNumber: newTrackingNumber,
            userId: data.userId
        })
    });
}