"use strict";

import { Express } from "express";
import * as token from "../token";
import * as delivery from "../delivery";
import * as error from "./error";
import * as express from "express";
import { NextFunction } from "connect";

/**
 * Modulo de seguridad, login/logout, cambio de contraseñas, etc
 */
export function init(app: Express) {
  //Autenticamos todos los endpoints
  app.use(validateToken);
  // Listar los envíos del sistema (Admin)
  app.route("/v1/delivery").get(validateAdminAccess, listDeliveries);
  // Obtener ubicación del envío
  app.route("/v1/delivery/:trackingNumber").get(getDelivery);
  //Actualizar la ubicación del envío
  app.route("/v1/delivery/:trackingNumber").put(validateAdminAccess, updateDelivery);
  //Cancelar un envío (Admin)
  app.route("/v1/delivery/:trackingNumber").delete(validateAdminAccess, cancelDelivery);
  //Solicitar devolución de un envío
  app.route("/v1/delivery/:trackingNumber/return").post(returnDelivery);
  //Realizar proyección de un envío (Admin)
  app.route("/v1/delivery/:trackingNumber/project").post(validateAdminAccess, projectDelivery);
}

interface IUserSessionRequest extends express.Request {
  user: token.ISession;
}

/**
 * @apiDefine AuthHeader
 *
 * @apiExample {String} Header Autorización
 *    Authorization=bearer {token}
 *
 * @apiErrorExample 401 Unauthorized
 *    HTTP/1.1 401 Unauthorized
 */
function validateToken(req: IUserSessionRequest, res: express.Response, next: NextFunction) {
  const auth = req.header("Authorization");
  if (!auth) {
    return error.handle(res, error.newError(error.ERROR_UNAUTHORIZED, "Unauthorized"));
  }

  token.validate(auth)
    .then(user => {
      req.user = user;
      next();
    })
    .catch(err => error.handle(res, err));
}

/**
 * @apiDefine AdminAccess
 *
 * @apiExample {String} Header Autorización
 *    Authorization=bearer {token}
 *
 * @apiErrorExample 403 Forbidden
 *     HTTP/1.1 403 Forbidden
 *     {
 *        "code": 403
 *        "message" : { motivo }
 *     }
 */
function validateAdminAccess(req: IUserSessionRequest, res: express.Response, next: NextFunction) {
  //Validamos que sea admin
  if (!req.user.user.permissions.includes("admin"))
    return error.handle(res, error.newError(error.ERROR_FORBIDDEN, "No cuenta con los permisos para acceder a este recurso."));
  next()
}



/**
 * @api {get} /v1/delivery Listar los Envíos
 * @apiName Listar Envíos
 * @apiGroup Envíos
 *
 * @apiDescription Lista los envíos del sistema
 * 
 * @apiQuery {Date} [startDate] Fecha desde a buscar. Se compara contra el created_date
 * @apiQuery {Date} [endDate] Fecha hasta a buscar. Se compara contra el created_date
 * @apiQuery {String} [status] Estado a filtrar. Puede ser alguno de ["PENDING", "TRANSIT", "CANCELED", "DELIVERED", "PENDING_RETURN", "TRANSIT_RETURN", "RETURNED"]
 * @apiQuery {Number} [page=1] Número de página a devolver.
 *
 *
 * @apiSuccessExample {json} Body
 *  {
 *     "data": [
 *         {
 *             "trackingNumber": 5,
 *             "status": "PENDING",
 *             "lastKnownLocation": null,
 *             "created": "2024-11-26T12:30:15.091Z"
 *         },
 *         {
 *             "trackingNumber": 1,
 *             "status": "TRANSIT_RETURN",
 *             "lastKnownLocation": "Agencia BSAS",
 *             "created": "2024-11-20T01:04:12.419Z"
 *         }
 *     ],
 *     "page": "1"
 *  }
 * @apiUse AuthHeader
 * @apiUse AdminAccess
 * @apiUse ParamValidationErrors
 * @apiUse OtherErrors
 */
interface IListDeliveriesRequest extends IUserSessionRequest {
  query: {
    status?: string,
    startDate?: string,
    endDate?: string,
    page?: string,
  }
}
function listDeliveries(req: IListDeliveriesRequest, res: express.Response) {
  delivery.listDeliveries(req.query)
    .then(deliveries => {
      res.json({
        data: deliveries.map((delivery: any) => {
          return {
            trackingNumber: delivery.trackingNumber,
            status: delivery.status,
            lastKnownLocation: delivery.lastKnownLocation,
            created: delivery.created
          }
        }),
        page: req.query.page ?? "1"
      });
    })
    .catch(err => {
      error.handle(res, err);
    });
}


/**
 * @api {get} /v1/delivery/:trackingNumber Obtener ubicación del envío
 * @apiName Consultar Envío
 * @apiGroup Envíos
 *
 * @apiDescription Obtiene la ubicación de un envío
 * 
 * @apiParam {Number} trackingNumber trackingNumber a consultar.
 *
 * @apiSuccessExample {json} Body
 *  {
 *  	"orderId":"1234", 
 *  	"trackingNumber": 1234,
 *  	"status": "TRANSIT", 
 *  	"lastKnowLocation": "Agencia 1", 
 *  	"deliveryEvents": [{ 
 *  		"updateDate": "2024-11-10", 
 *  		"lastKnownLocation": "Agencia 1", 
 *  		"eventType": "TRANSIT"
 *  	}, { 
 *  		"updateDate": "2024-11-09", 
 *  		"lastKnownLocation": "Depósito", 
 *  		"eventType": "PENDING"
 *  	}] 
 *  }
 * 
 * @apiErrorExample 403 Forbidden
 *     HTTP/1.1 403 Forbidden
 *     { 
 *        "code": "403",
 *        "message" : "El envío ${trackingNumber} no le pertenece."
 *     }
 * 
 * @apiUse AuthHeader
 * @apiUse ParamValidationErrors
 * @apiUse DeliveryNotFound
 * @apiUse OtherErrors
 */
interface IGetDeliveryRequest extends IUserSessionRequest {
  params: {
    trackingNumber: string
  }
}
function getDelivery(req: IGetDeliveryRequest, res: express.Response) {
  delivery.getDelivery(
    req.user.token,
    req.user.user.id,
    req.user.user.permissions.includes("admin"),
    parseInt(req.params.trackingNumber)
  )
    .then(delivery => {
      res.json(delivery);
    })
    .catch(err => {
      error.handle(res, err);
    });
}


/**
 * @api {put} /v1/delivery/:trackingNumber Actualizar ubicación del envío
 * @apiName Actualizar Envío
 * @apiGroup Envíos
 *
 * @apiDescription Actualiza la ubicación de un envío
 * 
 * @apiParam {Number} trackingNumber trackingNumber a actualizar.
 *
 * @apiBody {json} Body 
 * {
 *  "lastKnownLocation": "Ubicacion"
 *  "delivered": false | true
 * }
 * 
 * @apiSuccessExample {json} Body
 *  {
 *	  "message": "Ubicación actualizada exitósamente."
 *  }
 * 
 * @apiUse AuthHeader
 * @apiUse AdminAccess
 * @apiUse ParamValidationErrors
 * @apiUse DeliveryNotFound
 * @apiUse OtherErrors
 */
interface IUpdateDeliveryRequest extends IUserSessionRequest {
  params: {
    trackingNumber: string
  },
  body: {
    lastKnownLocation: string,
    delivered: boolean,
  }
}
function updateDelivery(req: IUpdateDeliveryRequest, res: express.Response) {
  delivery.updateDelivery(req.user.token, parseInt(req.params.trackingNumber), req.body)
    .then(() => {
      res.json({
        message: "Ubicación actualizada exitósamente."
      });
    })
    .catch(err => {
      error.handle(res, err);
    });
}


/**
 * @api {delete} /v1/delivery/:trackingNumber Cancelar un envío
 * @apiName Cancelar Envío
 * @apiGroup Envíos
 *
 * @apiDescription Solicita la cancelación de un envío.
 * 
 * @apiParam {Number} trackingNumber trackingNumber a cancelar.
 * 
 * @apiSuccessExample {json} Body
 *  {
 *	  "message": "Envío cancelado exitósamente."
 *  }
 * @apiUse AuthHeader
 * @apiUse AdminAccess
 * @apiUse ParamValidationErrors
 * @apiUse DeliveryNotFound
 * @apiUse OtherErrors
 */

interface ICancelDeliveryRequest extends IUserSessionRequest {
  params: {
    trackingNumber: string
  }
}
function cancelDelivery(req: ICancelDeliveryRequest, res: express.Response) {
  delivery.cancelDelivery(req.user.token, parseInt(req.params.trackingNumber))
    .then(() => {
      res.json({
        message: `Envío cancelado exitósamente`,
      });
    })
    .catch(err => {
      error.handle(res, err);
    });
}

/**
 * @api {post} /v1/delivery/:trackingNumber/return Solicitar devolver un Envío
 * @apiName Devolver Envío
 * @apiGroup Envíos
 *
 * @apiDescription Solicita la devolución de un envío.
 * 
 * @apiParam {Number} trackingNumber trackingNumber a devolver.
 * 
 * @apiSuccessExample {json} Body
 *  {
 *	  "message": "Se inició el proceso de devolución existósamente."
 *  }
 * 
 * @apiErrorExample 403 Forbidden
 *     HTTP/1.1 403 Forbidden
 *     { 
 *        "code": "403",
 *        "message" : "El envío ${trackingNumber} no le pertenece."
 *     }
 * 
 * @apiUse AuthHeader
 * @apiUse ParamValidationErrors
 * @apiUse DeliveryNotFound
 * @apiUse OtherErrors
 */
interface IReturnDeliveryRequest extends IUserSessionRequest {
  params: {
    trackingNumber: string
  }
}
function returnDelivery(req: IReturnDeliveryRequest, res: express.Response) {
  delivery.returnDelivery(req.user.token, req.user.user.id, parseInt(req.params.trackingNumber))
    .then(() => {
      res.json({
        message: `Se solicitó la devolución de manera exitosa.`,
      });
    })
    .catch(err => {
      error.handle(res, err);
    });
}


/**
 * @api {post} /v1/delivery/:trackingNumber/project Solicitar devolver un Envío
 * @apiName Devolver Envío
 * @apiGroup Envíos
 *
 * @apiDescription Solicita la devolución de un envío.
 * 
 * @apiParam {Number} trackingNumber trackingNumber a devolver.
 * 
 * @apiSuccessExample {json} Body
 *  {
 *  	"orderId":"1234", 
 *  	"trackingNumber": 1234,
 *  	"status": "TRANSIT", 
 *  	"lastKnowLocation": "Agencia 1", 
 *  	"deliveryEvents": [{ 
 *  		"updateDate": "2024-11-10", 
 *  		"lastKnownLocation": "Agencia 1", 
 *  		"eventType": "TRANSIT"
 *  	}, { 
 *  		"updateDate": "2024-11-09", 
 *  		"lastKnownLocation": "Depósito", 
 *  		"eventType": "PENDING"
 *  	}] 
 *  }
 * 
 * 
 * @apiUse AuthHeader
 * @apiUse AdminAccess
 * @apiUse ParamValidationErrors
 * @apiUse DeliveryNotFound
 * @apiUse OtherErrors
 */
interface IProjectDeliveryRequest extends IUserSessionRequest {
  params: {
    trackingNumber: string
  }
}
function projectDelivery(req: IProjectDeliveryRequest, res: express.Response) {
  delivery.projectDelivery(req.user.token, parseInt(req.params.trackingNumber))
    .then(projection => {
      res.json(projection);
    })
    .catch(err => {
      error.handle(res, err);
    });
}