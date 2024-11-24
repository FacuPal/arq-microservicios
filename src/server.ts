"use strict";

import { MongoError } from "mongodb";
import * as mongoose from "mongoose";
import * as rabbitDelivery from "./rabbit/deliveryService";
import * as logoutObserver from "./rabbit/logoutService";
import * as env from "./server/environment";
import { Config } from "./server/environment";
import * as express from "./server/express";
import { logger } from "./server/logger";

// Variables de entorno
const conf: Config = env.getConfig(process.env);

// Mejoramos el log de las promesas
process.on("unhandledRejection", (reason, p) => {
  console.error("Unhandled Rejection at: Promise", p, "reason:", reason);
});

// Establecemos conexión con MongoDD
mongoose.connect(conf.mongoDb, {}, function (err: MongoError) {
  if (err) {
    logger.error("No se pudo conectar a MongoDB!");
    logger.error(err.message);
    process.exit();
  } else {
    logger.debug("MongoDB conectado.");
  }
});

// Se configura e inicia express
const app = express.init(conf);

rabbitDelivery.init();
logoutObserver.init();

app.listen(conf.port, () => {
  logger.debug(`Delivery Server escuchando en puerto ${conf.port}`)
});

module.exports = app;
