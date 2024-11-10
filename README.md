# Microservicio de envíos :mailbox:
---
## Diagrama de Estados.
::: mermaid
graph TD;
    PENDING-->TRANSIT;
	TRANSIT-->TRANSIT
	TRANSIT-->CANCELED
	TRANSIT-->DELIVERED;
    DELIVERED-->PENDING_RETURN;
    PENDING_RETURN-->RETURNED;
:::
---
> :warning: **Warning:** Do not push the big red button.
---
## Casos de uso

> ### CU-001: Creación de nuevo envío
> - Precondicion: Se concreta la venta. La orden existe y fue pagada.
> - Camino normal:
> 	- Al confirmar una orden, el servicio de stock recibe un mensaje > por cada articulo vendido. En la validación del stock, nota que > luego de la orden actual, el stock quedará en el mínimo o menor.
> 	- Generar una nueva reposición de stock (MovStock) para el > articleId en cuestión, con tipo INCR y quantity según la > configuración de repositionQty en Stock.
> - Caminos alternativos:
> 	- Si Stock no tiene minStock, considerar 0.
> 	- Si Stock no tiene repositionQty, no reponer stock.

#### CU-002: Validación de stock de un artículo
- Precondición: al confirmar una orden, el microservicio envía un mensaje asincrónico por cada artículo de esa orden
- Camino normal:
	- Buscar el Stock para el articleId del mensaje
	- Comparar currentStock con el quantity del mensaje (lo que se está intentando comprar)
	- Si hay suficiente stock, enviar un mensaje de respuesta a order indicando valid true
	- Hacer la disminución del stock (MovStock) de tipo DECR con quantity según el mensaje.
- Caminos alternativos:
	- Si no hay suficiente stock, enviar valid false
	- Si el stock es válido, revisar si el stock quedará por debajo del mínimo y generar una reposición (CU: Reposición de stock)

#### CU: Consulta de stock de un artículo
#### CU: Configurar stock de un artículo
#### CU: Cálculo de stock actual según movimientos

---
## Modelo de datos

**Stock**
id
articleId
currentStock
minStock
repositionQty
creationDate
updateDate

**MovStock**
stockId
movType [INCR|DECR]
quantity
description
creationDate
creationUser

### Interfaz REST

**Consulta de stock de un artículo**
`GET /v1/stock/{articleId}`

*Headers*
Authorization: Bearer token

*Response*
`200 OK` si existe el Stock
```json
{
	"id": "2433",
	"articleId": "23423",
	"currentStock": 2345,
	"minStock": 10,
	"repositionQty": 100,
	"creationDate": 165947859374
}
```

`404 NOT FOUND` si no existe el Stock con el articleId indicado


### Interfaz asincronica (rabbit)

**Validación de stock de un artículo**

Recibe para hacer la validación en direct `stock`
body
```json
{
	"articleId": "23423",
	"quantity": 3,
	"referenceId": "43759834"
}
```

Responde con el resultado de la validación en fanout `stock-check`
body
```json
{
	"articleId": "23423",
	"valid": true,
	"referenceId": "43759834"
}
```


| Syntax      | Description |
| ----------- | ----------- |
| Header      | Title       |
| Paragraph   | Text        |


