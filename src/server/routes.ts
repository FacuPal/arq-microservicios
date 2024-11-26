"use strict";

import { Express } from "express";
import * as token from "../token";
import * as delivery from "../delivery";
import * as error from "./error";
import * as express from "express";
import { NextFunction } from "connect";
import { DeliveryEventStatusEnum } from "../enums/status.enum";

/**
 * Modulo de seguridad, login/logout, cambio de contraseñas, etc
 */
export function init(app: Express) {
  //Autenticamos todos los endpoints
  app.use(validateToken);
  // Listar los envíos del sistema (Admin)
  app.route("/v1/delivery").get(listDeliveries);
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
 *    HTTP/1.1 403 Forbidden
 */
function validateAdminAccess(req: IUserSessionRequest, res: express.Response, next: NextFunction) {
  //Validamos que sea admin
  if (!req.user.user.permissions.includes("admin"))
    return error.handle(res, error.newError(error.ERROR_FORBIDDEN, "No cuenta con los permisos para acceder a este recurso."));
  next()
}

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
  //Llamamos al actualizar envío
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



/**
 * @api {post} /v1/delivery/article Agregar Artículo
 * @apiName Agregar Artículo
 * @apiGroup Carrito
 *
 * @apiDescription Agregar artículos al carrito.
 *
 * @apiExample {json} Body
 *    {
 *      "articleId": "{Article Id}",
 *      "quantity": {Quantity to add}
 *    }
 *
 * @apiSuccessExample {json} Body
 *    {
 *      "userId": "{User Id}",
 *      "enabled": true|false,
 *      "id": "{Id de carrito}",
 *      "articles": [{Artículos}],
 *      "updated": "{Fecha ultima actualización}",
 *      "created": "{Fecha creado}"
 *    }
 *
 * @apiUse ParamValidationErrors
 * @apiUse OtherErrors
 */
// function addArticle(req: IUserSessionRequest, res: express.Response) {
//   delivery.addArticle(req.user.user.id, req.body)
//     .then(delivery => {
//       res.json(delivery);
//     })
//     .catch(err => {
//       error.handle(res, err);
//     });
// }

/**
 * @api {post} /v1/delivery/article/:articleId/decrement Decrementar
 * @apiName Decrementar delivery
 * @apiGroup Carrito
 *
 * @apiDescription Decrementa la cantidad de artículos en el delivery.
 *
 * @apiSuccessExample {json} Body
 *    {
 *      "articleId": "{Article Id}",
 *      "quantity": {articles to decrement}
 *    }
 *
 * @apiSuccessExample {json} Body
 *    {
 *      "userId": "{User Id}",
 *      "enabled": true|false,
 *      "_id": "{Id de carrito}",
 *      "articles": [{Artículos}],
 *      "updated": "{Fecha ultima actualización}",
 *      "created": "{Fecha creado}"
 *    }
 *
 * @apiUse ParamValidationErrors
 * @apiUse OtherErrors
 */
// function decrementArticle(req: IUserSessionRequest, res: express.Response) {
//   delivery.decrementArticle(req.user.user.id, req.body)
//     .then(delivery => {
//       res.json(delivery);
//     })
//     .catch(err => {
//       error.handle(res, err);
//     });
// }

/**
 * @api {post} /v1/delivery/article/:articleId/increment Incrementar
 * @apiName Incrementar delivery
 * @apiGroup Carrito
 *
 * @apiDescription Incrementa la cantidad de artículos en el delivery.
 *
 * @apiSuccessExample {json} Body
 *    {
 *      "articleId": "{Article Id}",
 *      "quantity": {articles to increment},
 *      "validated": True|False Determina si el articulo se valido en catalog
 *    }
 *
 * @apiSuccessExample {json} Body
 *    {
 *      "userId": "{User Id}",
 *      "enabled": true|false,
 *      "_id": "{Id de carrito}",
 *      "articles": [{Artículos}],
 *      "updated": "{Fecha ultima actualización}",
 *      "created": "{Fecha creado}"
 *    }
 *
 * @apiUse ParamValidationErrors
 * @apiUse OtherErrors
 */
// function incrementArticle(req: IUserSessionRequest, res: express.Response) {
//   delivery.addArticle(req.user.user.id, req.body)
//     .then(delivery => {
//       res.json(delivery);
//     })
//     .catch(err => {
//       error.handle(res, err);
//     });
// }

/**
 * @api {get} /v1/delivery Obtener Carrito
 * @apiName Obtener Carrito
 * @apiGroup Carrito
 *
 * @apiDescription Devuelve el carrito activo.
 *
 * @apiSuccessExample {json} Body
 *    {
 *      "userId": "{User Id}",
 *      "enabled": true|false,
 *      "_id": "{Id de carrito}",
 *      "articles": [{Artículos}],
 *      "updated": "{Fecha ultima actualización}",
 *      "created": "{Fecha creado}"
 *    }
 *
 * @apiUse ParamValidationErrors
 * @apiUse OtherErrors
 */
// function getdelivery(req: IUserSessionRequest, res: express.Response) {
//   delivery.currentdelivery(req.user.user.id)
//     .then(delivery => {
//       res.json(delivery);
//     })
//     .catch(err => {
//       error.handle(res, err);
//     });
// }

/**
 * @api {delete} /delivery/article/:articleId Quitar Artículo
 * @apiName Quitar Artículo
 * @apiGroup Carrito
 *
 * @apiDescription Eliminar un articulo del carrito.
 *
 * @apiSuccessExample {string} Body
 *    HTTP/1.1 200 Ok
 *
 * @apiUse ParamValidationErrors
 * @apiUse OtherErrors
 */
// function deleteArticle(req: IUserSessionRequest, res: express.Response) {
//   const articleId = escape(req.params.articleId);

//   delivery.deleteArticle(req.user.user.id, articleId)
//     .then(_ => {
//       res.send();
//     })
//     .catch(err => {
//       error.handle(res, err);
//     });
// }

/**
 * @api {post} /v1/delivery/validate Validar Carrito
 * @apiName Validar Carrito
 * @apiGroup Carrito
 *
 * @apiDescription Realiza una validación completa del delivery, para realizar el checkout.
 *
 * @apiSuccessExample {json} Body
 *   {
 *      "errors": [
 *          {  "articleId": "{Article}",
 *             "message" : "{Error message}"
 *          }, ...],
 *      "warnings": [
 *          {  "articleId": "{Article}",
 *             "message" : "{Error message}"
 *          }, ...]
 *    }
 *
 * @apiUse ParamValidationErrors
 * @apiUse OtherErrors
 */
// function validateCheckout(req: IUserSessionRequest, res: express.Response) {
//   delivery.validateCheckout(req.user.user.id, req.user.token)
//     .then(validation => {
//       res.json(validation);
//     })
//     .catch(err => {
//       error.handle(res, err);
//     });
// }


/**
 * @api {post} /v1/delivery/checkout Checkout
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
// function postOrder(req: IUserSessionRequest, res: express.Response) {
//   delivery.placeOrder(req.user.user.id)
//     .then(_ => {
//       res.send();
//     })
//     .catch(err => {
//       error.handle(res, err);
//     });
// }
