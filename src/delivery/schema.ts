"use strict";

import { Document, model, Schema } from "mongoose";
import * as env from "../server/environment";
// import { sendArticleValidation } from "../rabbit/deliveryService";

const conf = env.getConfig(process.env);

export interface ICartArticle {
  articleId: string;
  quantity: number;
  validated?: Boolean;
}

export interface ICart extends Document {
  userId: string;
  orderId: string;
  articles: ICartArticle[];
  updated: Date;
  created: Date;
  enabled: Boolean;
  addArticle: Function;
  removeArticle: Function;
  incrementArticle: Function;
  decrementArticle: Function;
}

export interface ITrackingEvent {
  eventType: string; //[PENDING, TRANSIT, CANCELED, DELIVERED, PENDING_RETURN, TRANSIT_RETURN, RETURNED]
  locationName: string;
  updateDate: Date;
}



export interface IDeliveryEvent extends Document {
  id: string;
  orderId: string;
  trackingNumber: string;
  eventType: string;
  lastKnownLocation: string;
  updateDate: Date;
  creationDate: Date;
}

export interface IDeliveryProjection extends Document {
  id: string;
  orderId: string;
  userId: string;
  trackingNumber: string;
  status: string;
  lastKnownLocation: string;
  trackingEvents: ITrackingEvent[];
  updateDate: Date;
  creationDate: Date;
  updateLocation: Function;
  // removeArticle: Function;
}

export interface IFailedDeliveryProjection extends Document {
  id: string;
  orderId: string;
  userId: string;
  trackingNumber: string;
  failedMessage: string,
  trackingEvents: ITrackingEvent[];
  updateDate: Date;
  creationDate: Date;
}

/**
 * Esquema del evento de envío
 */
const DeliveryEventSchema = new Schema({
  orderId: {
    type: String,
    trim: true,
    required: [true, "El orderId asociado al deliveryEvent"]
  },
  trackingNumber: {
    type: String,
    trim: true,
    required: [true, "El trackingNumber asociado al deliveryEvent"]
  },
  eventType: {
    type: String,
    trim: true,
    required: [true, "El eventType asociado al deliveryEvent"]
  },
  lastKnownLocation: {
    type: String,
    trim: true,
  },
  updated: {
    type: Date,
    default: Date.now()
  },
  created: {
    type: Date,
    default: Date.now()
  },
}, {
  collection: "delivery_event",
  versionKey: false,
});



/**
 * Esquema de la proyección del envío
 */
const DeliveryProjectionSchema = new Schema({
  orderId: {
    type: String,
    trim: true,
    required: [true, "El orderId asociado a la proyección"]
  },
  userId: {
    type: String,
    trim: true,
    required: [true, "El userId asociado a la proyección"]
  },
  trackingNumber: {
    type: String,
    trim: true,
    required: [true, "El trackingNumber asociado a la proyección"]
  },
  status: {
    type: String,
    trim: true,
    required: [true, "El estado asociado a la proyección"]
  },
  lastKnownLocation: {
    type: String,
    trim: true,
  },
  trackingEvents: {
    type: Array,
    trim: true,
  },
  updated: {
    type: Date,
    default: Date.now()
  },
  created: {
    type: Date,
    default: Date.now()
  },
}, {
  collection: "delivery_projection",
  versionKey: false,
});

/**
 * Agrega un evento a la proyección
 */
DeliveryProjectionSchema.methods.updateLocation = function (event: IDeliveryEvent) {

  // Si no existe un evento con una fecha más actual, actualizamos el estado.  
  if (!this.trackingEvents.find((e: IDeliveryEvent) => e.creationDate > event.creationDate)) {
    this.status = event.eventType;
    this.lastKnownLocation = event.lastKnownLocation;
  };
  //Agregamos el evento
  this.trackingEvents.push(event)
  this.save()
  return;
};

/**
 * Esquema de la proyección del envío
 */
const FailedDeliveryProjectionSchema = new Schema({
  orderId: {
    type: String,
    trim: true,
  },
  userId: {
    type: String,
    trim: true,
  },
  trackingNumber: {
    type: String,
    trim: true,
  },
  failedMessage: {
    type: String,
    trim: true,
    required: [true, "Mensaje de error de la proyección fallida"]
  },
  lastKnownLocation: {
    type: String,
    trim: true,
  },
  trackingEvents: {
    type: Array,
    trim: true,
  },
  updated: {
    type: Date,
    default: Date.now()
  },
  created: {
    type: Date,
    default: Date.now()
  },
}, {
  collection: "failed_delivery_projection",
  versionKey: false,
});



// /**
//  * Elimina un articulo del carrito
//  */
// CartSchema.methods.removeArticle = function (articleId: string) {
//   for (let _i = 0; _i < this.articles.length; _i++) {
//     const element: ICartArticle = this.articles[_i];

//     if (element.articleId === articleId) {
//       this.articles.splice(_i, 1);
//       return;
//     }
//   }
// };

// /**
//  * Decremento o Elimina un articulo del carrito
//  */
// CartSchema.methods.decrementArticle = function (article: ICartArticle) {
//   for (let _i = 0; _i < this.articles.length; _i++) {
//     const element: ICartArticle = this.articles[_i];
//     if (element.articleId == article.articleId) {
//       element.quantity--;
//       if (element.quantity <= 0) {
//         this.articles.splice(_i, 1);
//       }
//       return;
//     }
//   }
// };

/**
 * Trigger antes de guardar
 */
DeliveryEventSchema.pre("save", function (this: IDeliveryEvent, next) {
  this.updateDate = new Date();
  next();
});
DeliveryProjectionSchema.pre("save", function (this: IDeliveryEvent, next) {
  this.updateDate = new Date();
  next();
});
FailedDeliveryProjectionSchema.pre("save", function (this: IDeliveryEvent, next) {
  this.updateDate = new Date();
  next();
});

//TODO: Borrar
export let Cart = model<IDeliveryEvent>("DeliveryEvent", DeliveryEventSchema);

export let DeliveryEvent = model<IDeliveryEvent>("DeliveryEvent", DeliveryEventSchema);
export let DeliveryProjection = model<IDeliveryProjection>("DeliveryProjection", DeliveryProjectionSchema);
export let FailedDeliveryProjection = model<IFailedDeliveryProjection>("FailedDeliveryProjection", FailedDeliveryProjectionSchema);
