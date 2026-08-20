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

2. **Regresión de clasificación de errores en `updateStock`** (corregido tras
   verificación empírica contra la DB real; ver nota abajo): `updateStock` no
   valida explícitamente que `quantity` sea un número finito ni que
   `responsable` esté presente antes de tocar la base de datos. Hoy, un
   payload inválido (falta `quantity`, falta `responsable`, o `quantity` no
   numérico) revienta con un error crudo de Sequelize/MySQL —
   `SequelizeValidationError` (`notNull Violation: stock_history.quantity
   cannot be null`) o `SequelizeDatabaseError` (`Incorrect integer value:
   'abc' for column 'quantity'`) — que el catch-all actual reporta como 400
   por accidente, exponiendo además el mensaje técnico crudo de MySQL. La
   transacción protege la integridad: verificado empíricamente que ante
   ambos payloads inválidos `Stock.quantity` permanece sin cambios y no se
   crea ninguna `Transaction` (rollback completo). Pero **al migrar a
   `next(error)` sin agregar validación explícita, estos errores no
   clasificados caerían a 500** en vez de 400 — una regresión respecto al
   comportamiento actual. Fix: validar explícitamente `quantity` (número
   finito) y `responsable` (string no vacío) al inicio de `updateStock` y
   lanzar `AppError(msg, 400)` antes de tocar la base de datos.

   > **Nota de verificación:** la versión original de este documento describía
   > este punto como una corrupción silenciosa (`Stock.quantity = NaN`
   > persistido). Se verificó empíricamente con un script contra la DB real
   > que la transacción de Sequelize revierte por completo en ambos casos
   > (`quantity` ausente y `quantity` no numérico) gracias a las columnas
   > `NOT NULL`/tipadas de `stock_history`, así que no hay corrupción
   > persistente. El hallazgo se corrigió a lo que sí se comprobó: una
   > regresión de clasificación de errores (400 accidental hoy → 500 tras el
   > retrofit si no se agrega validación explícita).

3. **SQL crudo sin validar `warehouseId`** en `getProductsByWarehouse`: el id
   decodificado se interpola directo en tres `Sequelize.literal(...)` para
   las subconsultas de `totalIncome`/`totalOutcome`/`totalBarConsumption`.
   Hoy, un `warehouse_id` con hashid malformado produce `undefined`
   interpolado como literal SQL (`= undefined`), rompiendo la consulta con un
   error de sintaxis en vez de un 400 claro. Con `decodeId` validando antes
   de llegar al service, este caso nunca alcanza el `Sequelize.literal`.

4. **`affectedRows` no verificado en `updateProduct` y `switchConfirguration`:**
   `Product.update(...)` y `ProductConfiguration.update(...)` devuelven
   `[affectedRowsCount]` — un array, siempre truthy en JavaScript incluso
   cuando `affectedRowsCount` es `0`. Ninguno de los dos controllers revisa
   este valor, así que actualizar un `product_id`/`configuration_id`
   inexistente responde 200 "actualizado" sin haber tocado ninguna fila. El
   propio dominio `yachtRequest` (mismo repo) ya estandarizó el fix: `if
   (affectedRows === 0) throw new AppError('... no encontrado', 404)`. Se
   aplica el mismo patrón aquí para ambos endpoints.

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
| `quantity`/`responsable` inválidos en `updateStock` | 400 (accidental, error crudo de MySQL/Sequelize) | 400 (explícito, `AppError`) |
| `product_id` inexistente en `updateProduct` | 200 (silencioso, 0 filas afectadas) | 404 |
| `configuration_id` inexistente en `switchConfirguration` | 200 (silencioso, 0 filas afectadas) | 404 |
| Error inesperado (DB, etc.) | 400 | 500 |

## Cambios conscientes de contrato

- `findProduct` pasa de 400 a 404 para "no encontrado" — consistente con el
  resto de dominios retrofiteados.
- `sku` pasa a ser requerido en el contrato de creación/actualización, aunque
  el modelo Sequelize permite `sku: null`. En la práctica el frontend siempre
  lo envía; el cambio solo formaliza esa expectativa con un `AppError`
  explícito en vez de un `TypeError` accidental.
- `updateProduct` y `switchConfirguration` pasan de 200 silencioso a 404 sobre
  un id inexistente, consistente con el patrón ya usado en `yachtRequest`.
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
- `updateStock` con `quantity` ausente o no numérico → 400 explícito (en vez
  de 500), y verificación de que `Stock.quantity` no cambia y no se crea
  ninguna `Transaction`.
- `updateStock` con `responsable` ausente → 400 explícito.
- `updateProduct` sobre `product_id` inexistente → 404 (antes: 200 silencioso).
- `switchConfirguration` sobre `configuration_id` inexistente → 404 (antes:
  200 silencioso).
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
