"use strict";

/**
 *  Servicios de escucha de eventos rabbit
 */
import { RabbitDirectConsumer } from "./tools/directConsumer";
import { RabbitDirectEmitter } from "./tools/directEmitter";
import { IRabbitMessage } from "./tools/common";
import { logger } from "../server/logger";

interface ICreateDeliveryMessage {
    orderId: string;
    userId: string;
    status: string;
}
interface INotificationMessage {
    notificationType: string;
    userId: string;
    trackingNumber: string;
}

export function init() {
    const delivery = new RabbitDirectConsumer("delivery_create_delivery", "create_delivery");
    delivery.addProcessor("create-delivery", processCreateDelivery);
    delivery.init();
}

/**
 * @api {direct} create_delivery/delivery_create_delivery Creación de un nuevo envío
 * @apiGroup RabbitMQ GET
 *
 * @apiDescription Escucha de mensajes delivery_create_delivery desde delivery. Crea un nuevo envío.
 *
 * @apiSuccessExample {json} Mensaje
 *     {
 *        "type": "article-exist",
 *        "message": {
 *             "referenceId": "{cartId}",
 *             "articleId": "{articleId}",
 *             "valid": true|false
 *        }
 *     }
 */
function processCreateDelivery(rabbitMessage: IRabbitMessage) {
    const article = rabbitMessage.message as ICreateDeliveryMessage;
    // validation.articleValidationCheck(article);
    logger.info(article)
    const notification = {
		notificationType: "delivery_created",
		userId: "234123",
		trackingNumber: "12341324"
	}
    sendNotification(notification)
}


/**
 * @api {direct} send_notification/send_notification Envía una nueva notificación
 * @apiGroup RabbitMQ POST
 *
 * @apiDescription Delivery enviá un mensaje a Notification para enviar una nueva notificación.
 *
 * @apiExample {json} Mensaje
 *     {
 *        "type": "send-notification",
 *        "queue": "send_notification",
 *        "exchange": "send_notification",
 *         "message": {
 *             "notificationType": "{notificationType}",
 *             "userId": "{userId}",
 *             "trackingNumber": "{trackingNumber}"
 *        }
 *     }
 */
export async function sendNotification(notification: INotificationMessage): Promise<IRabbitMessage> {
    const message: IRabbitMessage = {
        type: "send-notification",
        exchange: "send_notification",
        queue: "send_notification",
        message: notification
    };

    return RabbitDirectEmitter.getEmitter("send_notification", "send_notification").send(message);
}