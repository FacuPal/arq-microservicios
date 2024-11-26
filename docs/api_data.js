define({ "api": [
  {
    "type": "put",
    "url": "/v1/delivery/{trackingNumber}",
    "title": "Actualizar ubicación del envío",
    "name": "Actualizar_Envío",
    "group": "Envíos",
    "description": "<p>Actualiza la ubicación de un envío</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": "trackingNumber",
            "description": "<p>trackingNumber a actualizar.</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Body",
          "content": " {\n\t  \"message\": \"Ubicación actualizada exitósamente.\"\n }",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/server/routes.ts",
    "groupTitle": "Envíos",
    "examples": [
      {
        "title": "Header Autorización",
        "content": "Authorization=bearer {token}",
        "type": "String"
      },
      {
        "title": "Header Autorización",
        "content": "Authorization=bearer {token}",
        "type": "String"
      }
    ],
    "error": {
      "examples": [
        {
          "title": "401 Unauthorized",
          "content": "HTTP/1.1 401 Unauthorized",
          "type": "json"
        },
        {
          "title": "403 Forbidden",
          "content": "HTTP/1.1 403 Forbidden\n{\n   \"code\": 403\n   \"message\" : { motivo }\n}",
          "type": "json"
        },
        {
          "title": "400 Bad Request",
          "content": "HTTP/1.1 400 Bad Request\n{\n   \"messages\" : [\n     {\n       \"path\" : \"{Nombre de la propiedad}\",\n       \"message\" : \"{Motivo del error}\"\n     },\n     ...\n  ]\n}",
          "type": "json"
        },
        {
          "title": "404 Not Found",
          "content": "HTTP/1.1 404 Not Found\n{\n   \"code\": \"404\",\n   \"message\" : \"El envío solicitado no existe.\"\n}",
          "type": "json"
        },
        {
          "title": "500 Server Error",
          "content": "HTTP/1.1 500 Internal Server Error\n{\n   \"error\" : \"Not Found\"\n}",
          "type": "json"
        }
      ]
    }
  },
  {
    "type": "delete",
    "url": "/v1/delivery/{trackingNumber}",
    "title": "Cancelar un envío",
    "name": "Cancelar_Envío",
    "group": "Envíos",
    "description": "<p>Solicita la cancelación de un envío.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": "trackingNumber",
            "description": "<p>trackingNumber a cancelar.</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Body",
          "content": " {\n\t  \"message\": \"Envío cancelado exitósamente.\"\n }",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/server/routes.ts",
    "groupTitle": "Envíos",
    "examples": [
      {
        "title": "Header Autorización",
        "content": "Authorization=bearer {token}",
        "type": "String"
      },
      {
        "title": "Header Autorización",
        "content": "Authorization=bearer {token}",
        "type": "String"
      }
    ],
    "error": {
      "examples": [
        {
          "title": "401 Unauthorized",
          "content": "HTTP/1.1 401 Unauthorized",
          "type": "json"
        },
        {
          "title": "403 Forbidden",
          "content": "HTTP/1.1 403 Forbidden\n{\n   \"code\": 403\n   \"message\" : { motivo }\n}",
          "type": "json"
        },
        {
          "title": "400 Bad Request",
          "content": "HTTP/1.1 400 Bad Request\n{\n   \"messages\" : [\n     {\n       \"path\" : \"{Nombre de la propiedad}\",\n       \"message\" : \"{Motivo del error}\"\n     },\n     ...\n  ]\n}",
          "type": "json"
        },
        {
          "title": "404 Not Found",
          "content": "HTTP/1.1 404 Not Found\n{\n   \"code\": \"404\",\n   \"message\" : \"El envío solicitado no existe.\"\n}",
          "type": "json"
        },
        {
          "title": "500 Server Error",
          "content": "HTTP/1.1 500 Internal Server Error\n{\n   \"error\" : \"Not Found\"\n}",
          "type": "json"
        }
      ]
    }
  },
  {
    "type": "get",
    "url": "/v1/delivery/{trackingNumber}",
    "title": "Obtener ubicación del envío",
    "name": "Consultar_Envío",
    "group": "Envíos",
    "description": "<p>Obtiene la ubicación de un envío</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": "trackingNumber",
            "description": "<p>trackingNumber a consultar.</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Body",
          "content": "{\n\t\"orderId\":\"1234\", \n\t\"trackingNumber\": 1234,\n\t\"status\": \"TRANSIT\", \n\t\"lastKnowLocation\": \"Agencia 1\", \n\t\"deliveryEvents\": [{ \n\t\t\"updateDate\": \"2024-11-10\", \n\t\t\"lastKnownLocation\": \"Agencia 1\", \n\t\t\"eventType\": \"TRANSIT\"\n\t}, { \n\t\t\"updateDate\": \"2024-11-09\", \n\t\t\"lastKnownLocation\": \"Depósito\", \n\t\t\"eventType\": \"PENDING\"\n\t}] \n}",
          "type": "json"
        }
      ]
    },
    "error": {
      "examples": [
        {
          "title": "403 Forbidden",
          "content": "HTTP/1.1 403 Forbidden\n{ \n   \"code\": \"403\",\n   \"message\" : \"El envío ${trackingNumber} no le pertenece.\"\n}",
          "type": "json"
        },
        {
          "title": "401 Unauthorized",
          "content": "HTTP/1.1 401 Unauthorized",
          "type": "json"
        },
        {
          "title": "400 Bad Request",
          "content": "HTTP/1.1 400 Bad Request\n{\n   \"messages\" : [\n     {\n       \"path\" : \"{Nombre de la propiedad}\",\n       \"message\" : \"{Motivo del error}\"\n     },\n     ...\n  ]\n}",
          "type": "json"
        },
        {
          "title": "404 Not Found",
          "content": "HTTP/1.1 404 Not Found\n{\n   \"code\": \"404\",\n   \"message\" : \"El envío solicitado no existe.\"\n}",
          "type": "json"
        },
        {
          "title": "500 Server Error",
          "content": "HTTP/1.1 500 Internal Server Error\n{\n   \"error\" : \"Not Found\"\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/server/routes.ts",
    "groupTitle": "Envíos",
    "examples": [
      {
        "title": "Header Autorización",
        "content": "Authorization=bearer {token}",
        "type": "String"
      }
    ]
  },
  {
    "type": "post",
    "url": "/v1/delivery/{trackingNumber}/return",
    "title": "Solicitar devolver un Envío",
    "name": "Devolver_Envío",
    "group": "Envíos",
    "description": "<p>Solicita la devolución de un envío.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": "trackingNumber",
            "description": "<p>trackingNumber a devolver.</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Body",
          "content": " {\n\t  \"message\": \"Se inició el proceso de devolución existósamente.\"\n }",
          "type": "json"
        }
      ]
    },
    "error": {
      "examples": [
        {
          "title": "403 Forbidden",
          "content": "HTTP/1.1 403 Forbidden\n{ \n   \"code\": \"403\",\n   \"message\" : \"El envío ${trackingNumber} no le pertenece.\"\n}",
          "type": "json"
        },
        {
          "title": "401 Unauthorized",
          "content": "HTTP/1.1 401 Unauthorized",
          "type": "json"
        },
        {
          "title": "400 Bad Request",
          "content": "HTTP/1.1 400 Bad Request\n{\n   \"messages\" : [\n     {\n       \"path\" : \"{Nombre de la propiedad}\",\n       \"message\" : \"{Motivo del error}\"\n     },\n     ...\n  ]\n}",
          "type": "json"
        },
        {
          "title": "404 Not Found",
          "content": "HTTP/1.1 404 Not Found\n{\n   \"code\": \"404\",\n   \"message\" : \"El envío solicitado no existe.\"\n}",
          "type": "json"
        },
        {
          "title": "500 Server Error",
          "content": "HTTP/1.1 500 Internal Server Error\n{\n   \"error\" : \"Not Found\"\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/server/routes.ts",
    "groupTitle": "Envíos",
    "examples": [
      {
        "title": "Header Autorización",
        "content": "Authorization=bearer {token}",
        "type": "String"
      }
    ]
  },
  {
    "type": "post",
    "url": "/v1/delivery/{trackingNumber}/project",
    "title": "Solicitar devolver un Envío",
    "name": "Devolver_Envío",
    "group": "Envíos",
    "description": "<p>Solicita la devolución de un envío.</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Number",
            "optional": false,
            "field": "trackingNumber",
            "description": "<p>trackingNumber a devolver.</p>"
          }
        ]
      }
    },
    "success": {
      "examples": [
        {
          "title": "Body",
          "content": "{\n\t\"orderId\":\"1234\", \n\t\"trackingNumber\": 1234,\n\t\"status\": \"TRANSIT\", \n\t\"lastKnowLocation\": \"Agencia 1\", \n\t\"deliveryEvents\": [{ \n\t\t\"updateDate\": \"2024-11-10\", \n\t\t\"lastKnownLocation\": \"Agencia 1\", \n\t\t\"eventType\": \"TRANSIT\"\n\t}, { \n\t\t\"updateDate\": \"2024-11-09\", \n\t\t\"lastKnownLocation\": \"Depósito\", \n\t\t\"eventType\": \"PENDING\"\n\t}] \n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/server/routes.ts",
    "groupTitle": "Envíos",
    "examples": [
      {
        "title": "Header Autorización",
        "content": "Authorization=bearer {token}",
        "type": "String"
      },
      {
        "title": "Header Autorización",
        "content": "Authorization=bearer {token}",
        "type": "String"
      }
    ],
    "error": {
      "examples": [
        {
          "title": "401 Unauthorized",
          "content": "HTTP/1.1 401 Unauthorized",
          "type": "json"
        },
        {
          "title": "403 Forbidden",
          "content": "HTTP/1.1 403 Forbidden\n{\n   \"code\": 403\n   \"message\" : { motivo }\n}",
          "type": "json"
        },
        {
          "title": "400 Bad Request",
          "content": "HTTP/1.1 400 Bad Request\n{\n   \"messages\" : [\n     {\n       \"path\" : \"{Nombre de la propiedad}\",\n       \"message\" : \"{Motivo del error}\"\n     },\n     ...\n  ]\n}",
          "type": "json"
        },
        {
          "title": "404 Not Found",
          "content": "HTTP/1.1 404 Not Found\n{\n   \"code\": \"404\",\n   \"message\" : \"El envío solicitado no existe.\"\n}",
          "type": "json"
        },
        {
          "title": "500 Server Error",
          "content": "HTTP/1.1 500 Internal Server Error\n{\n   \"error\" : \"Not Found\"\n}",
          "type": "json"
        }
      ]
    }
  },
  {
    "type": "get",
    "url": "/v1/delivery",
    "title": "Listar los Envíos",
    "name": "Listar_Envíos",
    "group": "Envíos",
    "description": "<p>Lista los envíos del sistema</p>",
    "success": {
      "examples": [
        {
          "title": "Body",
          "content": "{\n   \"data\": [\n       {\n           \"trackingNumber\": 5,\n           \"status\": \"PENDING\",\n           \"lastKnownLocation\": null,\n           \"created\": \"2024-11-26T12:30:15.091Z\"\n       },\n       {\n           \"trackingNumber\": 1,\n           \"status\": \"TRANSIT_RETURN\",\n           \"lastKnownLocation\": \"Agencia BSAS\",\n           \"created\": \"2024-11-20T01:04:12.419Z\"\n       }\n   ],\n   \"page\": \"1\"\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/server/routes.ts",
    "groupTitle": "Envíos",
    "examples": [
      {
        "title": "Header Autorización",
        "content": "Authorization=bearer {token}",
        "type": "String"
      },
      {
        "title": "Header Autorización",
        "content": "Authorization=bearer {token}",
        "type": "String"
      }
    ],
    "error": {
      "examples": [
        {
          "title": "401 Unauthorized",
          "content": "HTTP/1.1 401 Unauthorized",
          "type": "json"
        },
        {
          "title": "403 Forbidden",
          "content": "HTTP/1.1 403 Forbidden\n{\n   \"code\": 403\n   \"message\" : { motivo }\n}",
          "type": "json"
        },
        {
          "title": "400 Bad Request",
          "content": "HTTP/1.1 400 Bad Request\n{\n   \"messages\" : [\n     {\n       \"path\" : \"{Nombre de la propiedad}\",\n       \"message\" : \"{Motivo del error}\"\n     },\n     ...\n  ]\n}",
          "type": "json"
        },
        {
          "title": "500 Server Error",
          "content": "HTTP/1.1 500 Internal Server Error\n{\n   \"error\" : \"Not Found\"\n}",
          "type": "json"
        }
      ]
    }
  },
  {
    "type": "direct",
    "url": "create_delivery/delivery_create_delivery",
    "title": "Creación de un nuevo envío",
    "group": "RabbitMQ_GET",
    "description": "<p>Escucha de mensajes delivery_create_delivery desde delivery. Crea un nuevo envío.</p>",
    "success": {
      "examples": [
        {
          "title": "Mensaje",
          "content": "    {\n\t    \"type\": \"create-delivery\",\n\t    \"message\": {\n\t    \t\"orderId\": \"23423\",\n\t    \t\"userId\": \"23423\",\n\t    \t\"status\": \"payment_defined\"\n\t    }\n   }",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/rabbit/deliveryService.ts",
    "groupTitle": "RabbitMQ_GET",
    "name": "DirectCreate_deliveryDelivery_create_delivery"
  },
  {
    "type": "fanout",
    "url": "auth/logout",
    "title": "Logout de Usuarios",
    "group": "RabbitMQ_GET",
    "description": "<p>Escucha de mensajes logout desde auth.</p>",
    "success": {
      "examples": [
        {
          "title": "Mensaje",
          "content": "{\n   \"type\": \"logout\",\n   \"message\": \"{tokenId}\"\n}",
          "type": "json"
        }
      ]
    },
    "version": "0.0.0",
    "filename": "src/rabbit/logoutService.ts",
    "groupTitle": "RabbitMQ_GET",
    "name": "FanoutAuthLogout"
  },
  {
    "type": "direct",
    "url": "send_notification/send_notification",
    "title": "Envía una nueva notificación",
    "group": "RabbitMQ_POST",
    "description": "<p>Delivery enviá un mensaje a Notification para enviar una nueva notificación.</p>",
    "examples": [
      {
        "title": "Mensaje",
        "content": "{\n   \"type\": \"send-notification\",\n   \"queue\": \"send_notification\",\n   \"exchange\": \"send_notification\",\n    \"message\": {\n        \"notificationType\": \"{notificationType}\",\n        \"userId\": \"{userId}\",\n        \"trackingNumber\": {trackingNumber}\n   }\n}",
        "type": "json"
      }
    ],
    "version": "0.0.0",
    "filename": "src/rabbit/deliveryService.ts",
    "groupTitle": "RabbitMQ_POST",
    "name": "DirectSend_notificationSend_notification"
  }
] });
