"use strict";
import { DeliveryEventStatusEnum } from "../enums/status.enum";
import { logger } from "../server/logger";
/**
 * Servicios internos de Cart, normalmente son llamados por procesos Rabbit o background
 */

import { Cart, DeliveryEvent, ICart } from "./schema";

export interface ICreateDelivery {
    orderId: string;
    userId: string;
    status: string;
}

/**
 * Procesa una validación realizada a través de rabbit.
 * Si un articulo no es valido se elimina del cart.
 */
export function createDelivery(data: ICreateDelivery) {
    logger.info("RabbitMQ Consume create-delivery : " + data.orderId + " - " + data.userId + " - " + data.status);

    const calculateTrackingNumber = "asdasd"

    new DeliveryEvent({
        orderId: data.orderId,
        trackingNumber: calculateTrackingNumber,
        eventType: DeliveryEventStatusEnum.PENDING,
        creationDate: new Date()
    }).save()

    // Cart.findById(data.cartId, function (err: any, cart: ICart) {
    //     if (err) return;

    //     if (cart) {
    //         cart.orderId = data.orderId;

    //         // Save the Cart
    //         cart.save(function (err: any) {
    //         });
    //     }
    // });
}
