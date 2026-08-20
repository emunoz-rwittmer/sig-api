# Fase 2 — Dominio Inventory/Products — diseño

**Fecha:** 2026-08-20
**Estado:** Diseño aprobado, pendiente de implementación

## Contexto y alcance

El dominio expone diez rutas protegidas bajo `/api/products`
(`authJwt.verifyToken`, sin `isAdmin`), implementadas en
`products.controller.js` / `products.services.js` / `products.routes.js`.
Cubre CRUD de productos, sus configuraciones por pax, consulta de stock por
warehouse y actualización de stock con generación de transacciones. No se
tocan `registers`, `transactions` ni `warehouse` — quedan como dominios
separados del subárbol `operations/inventory`, igual que se hizo con
`catalogs` y `rrhh`.

El objetivo es adoptar `AppError`/`next(error)`, clasificar correctamente
400, 404 y 500, corregir un bug de PK-encoding recurrente, corregir una
corrupción de datos en `updateStock`, y cubrir el dominio con tests reales de
DB.

## Diseño

Retrofit completo a `AppError` + `next(error)` en los diez handlers del
controller. Se agrega un helper local `decodeId` (mismo patrón que
`downloads`/`yachtRequest`) que valida los hashids de `product_id`,
`warehouse_id`, `stock_id` y `data.userId` antes de que lleguen a Sequelize o
a SQL crudo — `decode` puede devolver `undefined` ante una entrada
malformada, y hoy ese `undefined` se propaga sin control.

Cambios puntuales por endpoint:

- `findProduct`: sin resultado → `AppError(msg, 404)` en vez de 400.
- `createProduct`: `sku` ausente → `AppError('sku requerido', 400)` explícito
  en vez de un `TypeError` accidental por `.replace()` sobre `undefined`.
  SKU duplicado → `AppError(msg, 400)` en vez de `Error` genérico (que hoy
  cae en 400 por el catch-all, pero dejaría de hacerlo al migrar a
  `next(error)`).
- `updateProduct`: mismo guard de `sku` requerido que `createProduct`.
- `getProduct`, `updateProduct`, `deleteProduct`, `getProductsByWarehouse`,
  `updateStock`: hashid inválido en cualquier parámetro → `AppError(msg,
  400)` vía `decodeId`, en vez de propagar `undefined`.
- `updateStock`: `Stock` no encontrado → `AppError('Stock no encontrado',
  404)` en vez de `Error` genérico.
- Resto de errores no identificables (fallo de DB, etc.) se delegan tal cual
  con `next(error)`; `errorHandler` los clasifica como 500.

## Bugs a corregir

1. **PK-encoding no-op en `getProduct`:** `result.id = Utils.encode(result.id)`
   sin `.dataValues` — la asignación no se refleja en el JSON serializado por
   `res.json`, así que el endpoint devuelve el id numérico crudo en vez del
   hashid. Mismo bug ya documentado independientemente en `catalogs` y
   `rrhh/trading` (ver `docs/CONVENTIONS.md`). Fix:
   `result.dataValues.id = Utils.encode(result.dataValues.id)`.

2. **Corrupción de datos en `updateStock`:** `normalizeQuantity(product,
   data.quantity)` se invoca incondicionalmente aunque `data.quantity` no
   venga en el payload (por ejemplo, al actualizar solo `min`/`max`). Para
   productos `DISCRETE`, `normalizeQuantity` hace `Number(undefined)` →
   `NaN`. La comparación posterior `normalizedQty !== undefined &&
   normalizedQty !== currentPlain.quantity` es `true` para `NaN` (nunca es
   igual a nada, ni siquiera a sí mismo), así que el flujo trata esto como un
   cambio real: escribe `Stock.quantity = NaN` y crea una `Transaction`
   fantasma con `quantity: NaN` y `type: 'OUT'`. Fix: solo normalizar y
   calcular el diff cuando `data.quantity !== undefined`.

3. **SQL crudo sin validar `warehouseId`** en `getProductsByWarehouse`: el id
   decodificado se interpola directo en tres `Sequelize.literal(...)` para
   las subconsultas de `totalIncome`/`totalOutcome`/`totalBarConsumption`.
   Hoy, un `warehouse_id` con hashid malformado produce `undefined`
   interpolado como literal SQL (`= undefined`), rompiendo la consulta con un
   error de sintaxis en vez de un 400 claro. Con `decodeId` validando antes
   de llegar al service, este caso nunca alcanza el `Sequelize.literal`.

## Contrato HTTP

La respuesta exitosa no cambia de forma. Los errores usan el estándar
central:

```json
{ "error": { "message": "mensaje descriptivo", "code": "AppError|INTERNAL_ERROR" } }
```

| Caso | Antes | Después |
|---|---|---:|
| Token ausente o inválido | 403 | 403 (sin cambio) |
| `findProduct` sin resultado | 400 | 404 |
| Hashid inválido en cualquier param | 500 / comportamiento indefinido | 400 |
| SKU duplicado en `createProduct` | 400 (accidental, vía excepción) | 400 (explícito, `AppError`) |
| `sku` ausente en create/update | 400 (accidental, `TypeError`) | 400 (explícito, `AppError`) |
| `Stock` no encontrado en `updateStock` | 400 (accidental) | 404 |
| Error inesperado (DB, etc.) | 400 | 500 |

## Cambios conscientes de contrato

- `findProduct` pasa de 400 a 404 para "no encontrado" — consistente con el
  resto de dominios retrofiteados.
- `sku` pasa a ser requerido en el contrato de creación/actualización, aunque
  el modelo Sequelize permite `sku: null`. En la práctica el frontend siempre
  lo envía; el cambio solo formaliza esa expectativa con un `AppError`
  explícito en vez de un `TypeError` accidental.
- El resto de la forma de respuesta exitosa (incluyendo paths, query params y
  nombres de campos) no cambia.

## Seguridad preservada

`/api/products` sigue protegido únicamente por `authJwt.verifyToken`, sin
agregar ni retirar roles. `decodeId` es endurecimiento de validación de
entrada, no un cambio de política de autorización.

## Verificación

Nueva suite `tests/domain/operations-inventory-products/products.test.js`
(Sequelize real, siguiendo el patrón de `orders`/`yachtRequest`). Cobertura
planeada:

- Happy path de los diez endpoints (`getProducts`, `getProduct`,
  `findProduct`, `getProductsWithConfigurations`, `getProductsByWarehouse`,
  `createProduct`, `updateProduct`, `deleteProduct`,
  `switchConfirguration`, `updateStock`).
- Hashid inválido en cada parámetro que lo usa → 400.
- `findProduct` sin resultado → 404.
- SKU duplicado en `createProduct` → 400.
- `sku` ausente en create/update → 400.
- `updateStock` sobre `stock_id` inexistente → 404.
- Regresión específica del bug `NaN`: `updateStock` actualizando solo
  `min`/`max` sobre un producto `DISCRETE`, verificando que `quantity` no
  cambie y no se cree una `Transaction`.
- PK-encoding: `getProduct` devuelve `id` como hashid, no como entero crudo.
- JWT ausente → 403.

## Hallazgos fuera de alcance

- `switchConfirguration` no valida que `configuration_id` pertenezca a un
  producto existente ni decodifica el id (los ids de `ProductConfiguration`
  no se hashid-encodean en las respuestas, a diferencia de `Product`) — se
  mantiene el comportamiento actual, fuera del alcance de este retrofit.
- `updateProduct` reemplaza/borra configuraciones dentro de la misma
  transacción sin validar que las `id` entrantes en `configurations`
  pertenezcan al producto que se está actualizando — mismo patrón de riesgo
  documentado en `CONVENTIONS.md` ("Validación de relaciones en payloads"),
  pero no se aborda aquí para no ampliar el alcance del dominio.
- `productsBar.controller.js` / `productsBar.services.js` (dominio `bar`) es
  un dominio distinto que también maneja productos; no se toca.
