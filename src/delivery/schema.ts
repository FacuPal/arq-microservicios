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
  enabled: Boolean;
  // addEvent: Function;
  // removeArticle: Function;
  // incrementArticle: Function;
  // decrementArticle: Function;
}

/**
 * Esquema del cart
 */
const DeliveryEventSchema = new Schema({
  id: {
    type: String,
    trim: true,
    default: "",
    required: [true, "El id asociado al deliveryEvent"]
  },
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
    required: [true, "El eventType asociado al deliveryEvent"]
  },
  // articles: [{
  //   articleId: {
  //     type: String,
  //     required: [true, "El articlelId agregado al cart"],
  //     trim: true
  //   },
  //   quantity: {
  //     type: Number
  //   },
  //   validated: {
  //     type: Boolean,
  //     default: false
  //   }
  // }],
  updated: {
    type: Date,
    default: Date.now()
  },
  created: {
    type: Date,
    default: Date.now()
  },
}, { collection: "deliveryEvent" });

DeliveryEventSchema.index({ id: 1, enabled: -1 });
DeliveryEventSchema.index({ id: 1, orderId: 1 });

// /**
//  * Agrega un articulo al carrito
//  */
// DeliveryEventSchema.methods.addArticle = function (article: ICartArticle) {
//   for (let _i = 0; _i < this.articles.length; _i++) {
//     const element: ICartArticle = this.articles[_i];
//     if (element.articleId == article.articleId) {
//       element.quantity = Number(element.quantity) + Number(article.quantity);
//       return;
//     }
//   }

//   this.articles.push(article);
//   sendArticleValidation(this.id, article.articleId).then();
//   return;
// };


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

export let Cart = model<IDeliveryEvent>("DeliveryEvent", DeliveryEventSchema);
