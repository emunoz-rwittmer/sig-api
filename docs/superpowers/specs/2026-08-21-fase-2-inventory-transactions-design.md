# Fase 2 — Dominio Inventory/Transactions — diseño

**Fecha:** 2026-08-21
**Estado:** Implementado

## Contexto y alcance

El dominio expone seis rutas protegidas bajo `/api/transactions`
(`authJwt.verifyToken`, sin `isAdmin`), implementadas en
`transactions.controller.js` / `transactions.services.js` /
`transactions.routes.js`: `productEntryInWarehouse`, `transactionWarehouse`,
`incomeProductsInWarehouse`, `updateStatusItem`, `incomeProductsRegister`,
`printRegister`. Es el dominio más complejo del subárbol
`operations/inventory` (ya retrofiteados: `products`, `registers`; queda
`warehouse`): cada handler orquesta movimientos de stock reales dentro de
transacciones Sequelize con locks, y hoy todos los `catch` responden
uniformemente `res.status(400).json(error.message)`, sin distinguir errores
de validación de negocio, "no encontrado" o fallos inesperados de DB.

El objetivo es adoptar `AppError`/`next(error)`, clasificar correctamente
400/404/500, dejar de re-envolver errores dentro de los `catch` de rollback
(lo que hoy destruye cualquier tipo/status que se hubiera lanzado más
adentro), corregir un bug de estado (`consecutivo`), y cubrir el dominio con
tests reales de DB. No se toca `warehouse.controller.js` ni la lógica de
cálculo de stock/normalización de cantidades (`Utils/quantity.js`), ni el
`axios.post` hacia el servicio de impresión (se mockea en tests, no se
modifica su URL ni su payload).

## Diseño

Retrofit completo a `AppError` + `next(error)` en los seis handlers del
controller. Se agrega un helper local `decodeId` (mismo patrón que
`products`) para los `Utils.decode(...)` que hoy no validan si el hashid es
inválido antes de usarlo.

### Mapeo de status codes

- **400** — inputs inválidos (cantidades ≤0, arrays de productos vacíos o
  sin entradas válidas, `warehouseFromId === warehouseToId`), stock
  insuficiente, hashid inválido en cualquier parámetro, y referencias no
  encontradas **dentro de un body** (producto/orderItem/transacción
  referenciados por id en el payload de un POST) — se tratan como
  validación del payload, no como el recurso principal del endpoint.
- **404** — únicamente en `updateStatusItem`, porque `item_id` viaja en la
  URL (`PUT /updateStatusItem/:item_id`); hoy no se valida que el
  `orderItem` exista antes de actualizar.
- **500** (vía `next(error)` sin `AppError`) — fallos inesperados de DB/red
  no clasificados.

Esta asimetría (404 solo cuando el id va en la URL) es una decisión
explícita del usuario durante el brainstorming, para mantener la misma
convención que `products`.

### Cambios puntuales por endpoint

- **`productEntryInWarehouse`**: valida `sku` presente antes de
  `.replace()` (hoy un `sku` ausente revienta con `TypeError` crudo,
  capturado igual por el catch pero con mensaje técnico). "Almacén u
  orderItemId inválido" y "cantidad inválida" pasan de `res.status(400)`
  directo a `AppError(msg, 400)`. "Elemento de orden no encontrado" (lookup
  por `orderItemId` del body) → `AppError(msg, 400)`, no 404. "Transacción
  duplicada" → `AppError(msg, 400)`.
- **`transactionWarehouse`**: se corrige el bug de `consecutivo` (ver
  "Bugs a corregir"). Validaciones de productos/cantidades/almacén
  origen≠destino y "stock insuficiente" pasan a `AppError(msg, 400)`. El
  `catch` del service deja de envolver con `throw new Error(\`Error en la
  transacción: ${error.message}\`)` — hoy esto convertiría cualquier
  `AppError(400)` interno en un `Error` genérico que `errorHandler`
  clasificaría como 500.
- **`incomeProductsInWarehouse`**: "no hay productos para procesar" / "no
  hay productos válidos con cantidad mayor a 0" → `AppError(msg, 400)`. Se
  quita el `throw new Error(error.message)` del catch (mismo problema de
  re-envoltura).
- **`updateStatusItem`**: pasa a patrón "buscar primero" — `findByPk` el
  `orderItem`, `AppError('Elemento no encontrado', 404)` si no existe, y
  recién ahí `update`. Hoy usa `orderItems.update(data, { where: { id }
  })` sin revisar `affectedRows`, así que un `item_id` inexistente responde
  200 silencioso.
- **`incomeProductsRegister`**: "no hay productos para procesar" / "no hay
  productos válidos" → `AppError(msg, 400)`. "Transacción original no
  encontrada" (lookup por `transac.id` del body) → `AppError(msg, 400)`.
  "Debe ingresar observaciones" / "stock no encontrado en bodega origen" /
  "stock insuficiente" → `AppError(msg, 400)`. Se eliminan los cuatro
  `console.log` de debug (`originalTransaction.warehouseFromId`,
  `companyId`, `Stock encontrado en bodega origen`). El `catch` deja de
  envolver con `throw new Error(error.message)`.
- **`printRegister`**: si `axios.post` no responde 200, hoy el controller
  ya responde `400` explícito (no pasa por el `catch`); se mantiene igual,
  solo se agrega `next` por consistencia aunque el único `catch` real cubre
  el fallo del propio `axios.post` (red caída) → pasa a `next(error)` → 500.

Los métodos del service que no lanzan hoy ningún error de negocio
identificable (fallos de DB, red) simplemente re-lanzan tal cual
(`throw error;`, no `throw new Error(...)`) para que `next(error)` los
clasifique como 500 en el controller.

## Bugs a corregir

1. **`consecutivo` nulo revienta `transactionWarehouse` con `TypeError`:**
   ```js
   const consecutivo = await Consecutivo.findOne({ where: {} });
   if (consecutivo === null) {
       await Consecutivo.create({ valor: 1 });
   }
   const formattedCounter = `000-${consecutivo.valor...}`; // consecutivo sigue siendo null
   ```
   Si la tabla `Consecutivo` está vacía (instalación nueva, o tras un
   `TRUNCATE`), `consecutivo` nunca se reasigna tras crearse la fila, y la
   siguiente línea lanza `TypeError: Cannot read properties of null`. Fix:
   `const consecutivo = await Consecutivo.findOne({ where: {} }) ??
   await Consecutivo.create({ valor: 1 });` (reasignar en la creación).
   Confirmado con el usuario como parte del alcance de este retrofit, por
   estar dentro de la misma función que ya se está tocando.

## Contrato HTTP

La respuesta exitosa no cambia de forma en ningún endpoint. Los errores
usan el estándar central:

```json
{ "error": { "message": "mensaje descriptivo", "code": "AppError|INTERNAL_ERROR" } }
```

| Caso | Antes | Después |
|---|---|---:|
| Token ausente o inválido | 403 | 403 (sin cambio) |
| `sku` ausente en `productEntryInWarehouse` | 400 (accidental, `TypeError`) | 400 (explícito, `AppError`) |
| `warehouseId`/`orderItemId` ausente | 400 | 400 (`AppError`) |
| cantidad inválida (cualquier endpoint) | 400 | 400 (`AppError`) |
| `orderItem` no encontrado en `productEntryInWarehouse` | 400 (accidental) | 400 (explícito) |
| `referenceId` duplicado | 400 (accidental) | 400 (explícito) |
| `Consecutivo` vacío en `transactionWarehouse` | 500 crudo (`TypeError` no manejado) | 200 (bug corregido, primer contador se crea correctamente) |
| origen = destino en `transactionWarehouse` | 400 (accidental) | 400 (explícito) |
| stock insuficiente (cualquier endpoint) | 400 (accidental, mensaje re-envuelto con prefijo "Error en la transacción:") | 400 (explícito, mensaje original preservado) |
| `item_id` inexistente en `updateStatusItem` | 200 (silencioso, `affectedRows` ignorado) | 404 |
| hashid inválido en cualquier parámetro | 400/500 crudo según el punto de fallo | 400 (explícito, vía `decodeId`) |
| transacción original no encontrada en `incomeProductsRegister` | 400 (accidental) | 400 (explícito) |
| Error inesperado (DB, red) | 400 | 500 |

## Cambios conscientes de contrato

- El único cambio de contrato visible además de la clasificación de status
  es `updateStatusItem`: pasa de 200 silencioso a 404 sobre un `item_id`
  inexistente, consistente con el patrón ya usado en `products`.
- `transactionWarehouse` deja de crashear (500 no controlado) cuando
  `Consecutivo` está vacío; ahora responde 200 igual que si la tabla ya
  tuviera una fila. No es un cambio de contrato, es la corrección de un bug
  que producía una excepción no manejada.
- El resto de los cambios son de clasificación de status (400 accidental →
  400 explícito con mensaje limpio, sin el prefijo `"Error en la
  transacción: "` que hoy se antepone en `transactionWarehouse`) o de ruta
  de error (400 → 500 solo para fallos verdaderamente inesperados). No se
  agregan validaciones nuevas de negocio más allá de las que ya existían.

## Seguridad preservada

`/api/transactions` sigue protegido únicamente por `authJwt.verifyToken`,
sin agregar ni retirar roles. `decodeId` es endurecimiento de validación de
entrada, no un cambio de política de autorización.

## Verificación

Nueva suite `tests/domain/operations-inventory-transactions/transactions.test.js`
(Sequelize real, siguiendo el patrón de `products`). `axios.post` se mockea
con `jest.spyOn` para los casos que llegan a la impresión (evita red real).
Cobertura planeada:

- **`productEntryInWarehouse`**: 200 creando producto+stock+transacción
  nuevos; 200 sumando a stock existente; 400 sin `warehouseId`/
  `orderItemId`; 400 cantidad inválida; 400 `sku` ausente; 400 `orderItem`
  no encontrado; 400 `referenceId` duplicado; 403 sin JWT.
- **`transactionWarehouse`**: 200 moviendo stock entre bodegas (con
  `Consecutivo` ya existente); 200 cuando `Consecutivo` está vacío (prueba
  directa del fix del bug); 400 origen=destino; 400 stock insuficiente; 400
  sin productos válidos; 403 sin JWT.
- **`incomeProductsInWarehouse`**: 200 creando/sumando stock; 400 sin
  productos válidos; 403 sin JWT.
- **`updateStatusItem`**: 200 actualizando estado; 404 `item_id`
  inexistente (caso nuevo); 400 hashid inválido; 403 sin JWT.
- **`incomeProductsRegister`**: 200 flujo normal; 400 cantidad cambiada sin
  `observations`; 400 transacción original no encontrada; 400 stock
  insuficiente en origen; 403 sin JWT.
- **`printRegister`**: 200 con axios mockeado devolviendo 200; 400 cuando
  el servicio de impresión responde distinto de 200; 403 sin JWT.
- Al menos un caso de 500 delegado al handler global (`jest.spyOn` sobre un
  método del service forzando `mockRejectedValueOnce`), como prueba de que
  `next(error)` está conectado correctamente en el controller.

## Hallazgos fuera de alcance

- `incomeProductsRegister` hardcodea `sourceWarehouseId = 9` y
  `warehouseToId = 2` en dos lugares distintos del dominio
  (`transactions.controller.js` línea del mismo nombre y
  `transactions.services.js`) — son "magic numbers" de bodegas fijas,
  comportamiento preexistente que no se toca en este retrofit.
- `transactionWarehouse` y `incomeProductsRegister` hacen múltiples
  `Product.findOne`/`Stock.findOne` repetidos por producto dentro del mismo
  loop (una vez para validar, otra para procesar) en vez de reutilizar el
  resultado ya cargado — ineficiencia preexistente, no se optimiza aquí
  para no ampliar el alcance de un retrofit de manejo de errores.
- `printRegister` no valida que `req.body.transactiones` sea un array antes
  de `.map()`, ni que `empresa`/`responsable` existan — si el body viene
  incompleto, hoy explota con `TypeError` (que seguirá siendo capturado por
  el catch y ahora irá a 500 en vez de 400). Se deja fuera de alcance por
  ser un endpoint de soporte (reimpresión) sin lógica de negocio propia;
  queda registrado como candidato a un `AppError(400)` explícito en un
  futuro pase si se reporta como problema real.
- La ruta de impresión vía `axios.post` a una IP hardcodeada
  (`190.12.15.164:5859`) no maneja timeout ni reintentos; fuera de alcance,
  es infraestructura de impresión preexistente.
