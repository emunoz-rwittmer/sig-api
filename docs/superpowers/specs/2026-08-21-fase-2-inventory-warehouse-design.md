# Fase 2 — Dominio Inventory/Warehouse — diseño

**Fecha:** 2026-08-21
**Estado:** Implementado

## Contexto y alcance

El dominio expone cinco rutas protegidas bajo `/api/warehouse`
(`authJwt.verifyToken`, sin `isAdmin`), implementadas en
`warehouse.controller.js` / `warehouse.services.js` / `warehouse.routes.js`:
`getAllWarehouses`, `createWarehouse`, `updateWarehouse`, `deleteWarehouse`,
`getStockProduct`. Es el último dominio del subárbol
`operations/inventory` — `products`, `registers` y `transactions` ya están
retrofiteados y cerrados.

El objetivo es adoptar `AppError`/`next(error)`, clasificar correctamente
400/404/500 (tres endpoints hoy "tienen éxito" silenciosamente sobre un id
inexistente), corregir un `TypeError` no manejado en `getStockProduct`, y
cubrir el dominio con tests reales de DB. También se limpia código muerto
encontrado durante la exploración: dos imports sin uso en
`warehouse.controller.js` (`escpos`, `RequestService`), tres imports sin uso
en `warehouse.services.js` (`requestItems`, `LaundryYacht`, `Request` — de
`models/operations/yachtRequest/`, nunca referenciados en el archivo), y un
método del service (`updateStatusWarehouse`) sin ninguna ruta ni caller en
el repo.

**Dependencia cruzada importante:** `WarehouseService` no es privado de
este dominio. `WarehouseService.getStockProduct` también lo llama
`src/controllers/reports/generateTransactionsExcel.js` directamente (fuera
de este controller), y `WarehouseService.getWarehouseById` lo llama
`src/controllers/operations/yachtRequest/yachtRequest.controller.js`. Este
retrofit **no cambia la firma ni el contrato de retorno de ningún método
del service** (siguen devolviendo `null` cuando no existe, tal cual hoy) —
la clasificación a `AppError`/404 se agrega únicamente en
`warehouse.controller.js`, el mismo patrón que
`generateTransactionsExcel.js` ya usa por su cuenta (`if (!result) throw
new AppError('Stock no encontrado', 404);`), así que ningún otro caller se
ve afectado. `getWarehouseById` no se toca en absoluto — no es código
muerto, solo no tiene ruta dentro de *este* controller.

## Diseño

Retrofit completo a `AppError` + `next(error)` en los cinco handlers del
controller. Se agrega un helper local `decodeId` (mismo patrón que
`products`/`transactions`) para los `Utils.decode(...)` de `warehouse_id` y
`stock_id`.

### Mapeo de status codes

- **404** — en los tres endpoints que reciben un id por la URL:
  `updateWarehouse`, `deleteWarehouse`, `getStockProduct`. Los tres "tienen
  éxito" hoy sobre un id inexistente: `updateWarehouse`/`deleteWarehouse`
  ignoran el resultado de `update`/`destroy`, y `getStockProduct` devuelve
  `200` con `result` `null` — y la línea siguiente
  (`result.quantity = await Quantity.viewCorrectQuantity(result.product,
  result.quantity)`) revienta con un `TypeError: Cannot read properties of
  null` no manejado.
- **400** — hashid inválido en cualquier parámetro (vía `decodeId`), y
  campos requeridos ausentes en `createWarehouse`.
- **500** (vía `next(error)` sin `AppError`) — fallos inesperados de DB no
  clasificados.

### Cambios puntuales por endpoint

- **`getAllWarehouses`**: solo cambia `catch (error) { res.status(400)... }`
  → `catch (error) { next(error); }`. Sin cambios de comportamiento.
- **`createWarehouse`**: se agregan guardas explícitas de `name`,
  `location`, `type` (columnas `allowNull: false` en el modelo
  `Warehouse`) → `AppError(msg, 400)` antes de tocar la base de datos. Hoy,
  si falta alguno, `Warehouse.create` lanza `SequelizeValidationError`, que
  el catch-all actual clasifica como 400 por accidente; sin la guarda
  explícita, al migrar a `next(error)` este caso se degradaría a 500 — la
  misma clase de regresión ya documentada y corregida en el retrofit de
  `products` (`sku` requerido en `createProduct`).
- **`updateWarehouse`**: pasa al patrón "buscar primero" (`findByPk` antes
  de `update`) → `AppError('Bodega no encontrada', 404)` si no existe, en
  vez de ignorar el `affectedRowsCount` que hoy devuelve `Warehouse.update`.
  Se agrega `decodeId` para `warehouse_id`. De paso se quita el
  `console.log(error)` de debug que hoy tiene el `catch` del service —
  ruido preexistente en el mismo bloque que se está tocando, mismo tipo de
  hallazgo que quedó pendiente en el review final de `transactions`.
- **`deleteWarehouse`**: el service ya calcula `if (result)` con el
  resultado de `Warehouse.destroy` (que es la cantidad de filas
  eliminadas), pero hoy solo lo usa para elegir el mensaje de éxito y nunca
  responde error cuando `result` es `0`. Se ajusta para lanzar
  `AppError('Bodega no encontrada', 404)` en ese caso. A diferencia de
  `update` (donde `affectedRows === 0` no distingue "no existe" de "update
  idempotente", como se documentó en `products`), `destroy` no tiene ese
  problema: `0` filas eliminadas significa inequívocamente que la fila no
  existía. Se agrega `decodeId` para `warehouse_id`.
- **`getStockProduct`**: `AppError('Stock no encontrado', 404)` cuando
  `WarehouseService.getStockProduct` devuelve `null`, antes de acceder a
  `result.product`/`result.quantity`. Se agrega `decodeId` para
  `stock_id`.

## Limpieza de código muerto

Confirmado con el usuario durante el brainstorming:

1. `const { Console } = require('escpos');` en `warehouse.controller.js` —
   nunca se usa en el archivo. Se borra.
2. `const RequestService = require('../../../services/operations/yachtRequest/yachtRequest.services');`
   en `warehouse.controller.js` — nunca se usa en el archivo. Se borra.
3. `requestItems`, `LaundryYacht`, `Request` (los tres de
   `models/operations/yachtRequest/`) en `warehouse.services.js` — ninguno
   se referencia en ningún método del archivo (verificado). Se borran los
   tres imports.
4. `WarehouseService.updateStatusWarehouse(id, status)` en
   `warehouse.services.js` — no tiene ninguna ruta en `warehouse.routes.js`
   ni ningún caller en el resto del repo (verificado con búsqueda global).
   Se borra el método completo.

`WarehouseService.getWarehouseById` y `WarehouseService.getStockProduct`
**no** se tocan en su firma/contrato — ver la nota de "Dependencia cruzada
importante" arriba.

## Contrato HTTP

La respuesta exitosa no cambia de forma en ningún endpoint. Los errores
usan el estándar central:

```json
{ "error": { "message": "mensaje descriptivo", "code": "AppError|INTERNAL_ERROR" } }
```

| Caso | Antes | Después |
|---|---|---:|
| Token ausente o inválido | 403 | 403 (sin cambio) |
| `name`/`location`/`type` ausente en `createWarehouse` | 400 (accidental, error crudo de Sequelize) | 400 (explícito, `AppError`) |
| `warehouse_id` inexistente en `updateWarehouse` | 200 (silencioso, `affectedRows` ignorado) | 404 |
| `warehouse_id` inexistente en `deleteWarehouse` | 200 (mensaje de éxito falso — `result` es `0`/falsy pero no se valida) | 404 |
| `stock_id` inexistente en `getStockProduct` | 500 crudo (`TypeError` no manejado) | 404 |
| hashid inválido en cualquier parámetro | 400/500 crudo según el punto de fallo | 400 (explícito, vía `decodeId`) |
| Error inesperado (DB, etc.) | 400 | 500 |

## Cambios conscientes de contrato

- `updateWarehouse`, `deleteWarehouse` y `getStockProduct` pasan de
  200-silencioso (o crash) a 404 sobre un id inexistente — consistente con
  el patrón ya usado en `products`/`transactions`.
- `createWarehouse` exige explícitamente `name`, `location`, `type`,
  aunque el modelo ya los declaraba `allowNull: false` — el cambio solo
  formaliza con un `AppError` explícito lo que ya era un requisito de facto
  (una petición sin esos campos ya fallaba antes, solo que con un mensaje
  crudo de Sequelize).
- El resto de la forma de respuesta exitosa no cambia.

## Seguridad preservada

`/api/warehouse` sigue protegido únicamente por `authJwt.verifyToken`,
sin agregar ni retirar roles. `decodeId` es endurecimiento de validación de
entrada, no un cambio de política de autorización.

## Verificación

Nueva suite `tests/domain/operations-inventory-warehouse/warehouse.test.js`
(Sequelize real, siguiendo el patrón de `products`/`transactions`).
Cobertura planeada:

- Happy path de los cinco endpoints.
- `createWarehouse` sin `name`/`location`/`type` → 400 explícito.
- `updateWarehouse` sobre `warehouse_id` inexistente → 404 (antes: 200
  silencioso).
- `updateWarehouse` con hashid inválido → 400.
- `deleteWarehouse` sobre `warehouse_id` inexistente → 404 (antes: 200
  falso-positivo).
- `deleteWarehouse` con hashid inválido → 400.
- `getStockProduct` sobre `stock_id` inexistente → 404 (antes: 500 crudo
  por `TypeError`).
- `getStockProduct` con hashid inválido → 400.
- Al menos un caso de 500 delegado al handler global (`jest.spyOn` sobre un
  método del service con `mockRejectedValueOnce`).
- JWT ausente → 403 en los cinco endpoints.

## Hallazgos fuera de alcance

- `getAllWarehouses` no pagina ni filtra por compañía/yate — devuelve todas
  las bodegas del sistema a cualquier usuario autenticado. Comportamiento
  preexistente, fuera del alcance de este retrofit de manejo de errores.
- `updateWarehouse` permite modificar cualquier campo del modelo
  (`Warehouse.update(data, ...)` con el body completo salvo `id`), incluido
  potencialmente `yachtId` — mass assignment, mismo patrón de riesgo ya
  documentado en `products` (`switchConfirguration`/`updateStock`). No se
  aborda aquí para no ampliar el alcance del dominio.
- `WarehouseService.deleteWarehouse` llama a `Warehouse.destroy` sin
  revisar si existen `Stock`/`Request` dependientes; si los hay, según las
  asociaciones configuradas esto podría fallar con un error de constraint
  de FK (clasificado como 500 con mensaje crudo) en vez de un 4xx claro
  como "no se puede eliminar una bodega con stock asociado". Mismo gap ya
  identificado y diferido en `products.services.js`'s `delete` durante el
  retrofit de `products`; se deja como seguimiento nombrado, no se corrige
  en este pase.
