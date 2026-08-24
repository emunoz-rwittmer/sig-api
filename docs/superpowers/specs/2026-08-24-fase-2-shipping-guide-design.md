# Fase 2 — Dominio ShippingGuide — diseño

**Fecha:** 2026-08-24
**Estado:** Aprobado, pendiente de implementación

## Contexto y alcance

El dominio expone hoy cuatro rutas protegidas bajo `/api/shipping_guides`
(`authJwt.verifyToken`, sin `isAdmin`), implementadas en
`shippingGuide.controller.js` / `shippingGuide.services.js` /
`shippingGuide.routes.js`: `getShippingGuides`, `getShippingGuideById`,
`createShippingGuide`, `updateShippingGuide`. Es el siguiente dominio de
Fase 2 tras cerrar `operations/inventory` (products, registers,
transactions, warehouse).

A diferencia de retrofits anteriores, este dominio no solo necesita el
retrofit estándar a `AppError`/`next(error)` — tiene tres bugs reales
(uno de ellos rompe el endpoint en todo momento) y requiere implementar
una feature nueva: borrar una guía de remisión completa, cuya ruta ya
existe comentada en el código (`//router.delete('/:guide_id', ...)`) pero
nunca se terminó de implementar.

**Dependencia cruzada importante:** `ShippingGuideService` no es privado
de este dominio. `src/controllers/downloads/downloads.controller.js`
(`downloadGuiaRemision`) llama directamente a
`ShippingGuideService.getShippingGuideById` y ya maneja el caso
`null` con su propio `AppError('Guía de remisión no encontrada', 404)`.
Este retrofit **no cambia la firma ni el contrato de retorno** de
`getShippingGuideById` (sigue devolviendo `null` cuando no existe) — la
clasificación a `AppError`/404 sobre ese `null` se agrega únicamente
dentro de `shippingGuide.controller.js`, así que `downloads.controller.js`
no se ve afectado.

## Bugs reales encontrados (se corrigen en este retrofit)

1. **`ShippingGuideService.updateShippingGuide`** usa
   `Utils.decode(item.id)` pero el archivo nunca importa `Utils` —
   `ReferenceError: Utils is not defined` en cada llamada al endpoint
   `PUT /api/shipping_guides/:guide_id` que tenga al menos un item con
   `id` no vacío. Se agrega
   `const Utils = require('../../../utils/Utils');`.
2. **`ShippingGuideController.updateShippingGuide`** lee
   `Utils.decode(params.order_id)` para obtener el `guideId` al crear
   items nuevos, pero la ruta declara `:guide_id`
   (`router.put('/:guide_id', ...)`) — `params.order_id` es siempre
   `undefined`. `Utils.decode(undefined)` no lanza (hashids devuelve
   `[]`, `id[0]` es `undefined`), así que hoy esto se traduce en
   `ShippingGuideItems.bulkCreate([{ ..., orderId: undefined }])`, que
   viola la columna `guide_id` (`allowNull: false`) y cae al catch
   genérico como un 400 con mensaje crudo de Sequelize. Es decir: crear
   items nuevos durante un update de guía **nunca funciona hoy**. Se
   corrige a `params.guide_id`, y de paso se renombra la variable local
   de `orderId` a `guideId` (el nombre `orderId` es un resabio de copiar
   el patrón de `orders`, esta guía no tiene `Order` asociado).
3. **`ShippingGuideController.getShippingGuideById`**: si
   `ShippingGuideService.getShippingGuideById` devuelve `null` (guía no
   encontrada), la línea siguiente
   `result.id = Utils.encode(result.id)` revienta con
   `TypeError: Cannot read properties of null` no manejado. Se agrega
   `AppError('Guía no encontrada', 404)` antes de acceder a `result.id`.

De paso se quita el `console.log(error)` de debug en el `catch` de
`createShippingGuide` — mismo tipo de limpieza que en `warehouse`.

## Diseño

Retrofit completo a `AppError` + `next(error)` en los cuatro handlers
existentes, más un quinto handler nuevo (`deleteShippingGuide`). Las
firmas cambian de `async (req, res)` a `async (req, res, next)` — hoy
ninguno de los cuatro handlers recibe `next` en absoluto, así que este
es un cambio más grande que en retrofits anteriores (que ya tenían
`next` en la firma y solo usaban `res.status(400)` en el catch). Se
agrega un helper local `decodeId` (mismo patrón que
`products`/`transactions`/`warehouse`, no hay helper compartido en el
repo) para los `Utils.decode(...)` de `guide_id`.

### Mapeo de status codes

- **404** — `getShippingGuideById`, `updateShippingGuide`,
  `deleteShippingGuide` sobre un `guide_id` inexistente.
- **400** — hashid inválido en `guide_id` (vía `decodeId`); campos
  requeridos ausentes en `createShippingGuide`
  (`dateStartTraslate`/`dateEndTraslate`/`details`); `body.id` no es un
  array en `updateShippingGuide`.
- **500** (vía `next(error)` sin `AppError`) — fallos inesperados de DB
  o del `pdfService`/`mailer` no clasificados.

### Cambios puntuales por endpoint

- **`getShippingGuides`**: solo cambia
  `catch (error) { res.status(400).json(error.message); }` →
  `catch (error) { next(error); }`. Sin cambios de comportamiento.
- **`getShippingGuideById`**: agrega `decodeId(req.params.guide_id,
  'guide_id')`, agrega `AppError('Guía no encontrada', 404)` cuando el
  service devuelve `null` (bug #3 arriba), y `next(error)` en el catch.
- **`createShippingGuide`**: agrega guardas explícitas de
  `dateStartTraslate`, `dateEndTraslate` (columnas `allowNull: false`
  en el modelo `ShippingGuide`) y `details` (array no vacío, ya que
  `ShippingGuideService.createShippingGuide` hace
  `data.details.map(...)` sin validar) → `AppError(msg, 400)` antes de
  generar el PDF. Sin la guarda explícita, al migrar a `next(error)`
  puro este caso se degradaría de 400 (accidental, error crudo de
  Sequelize o `TypeError` de `.map` sobre `undefined`) a 500 — misma
  clase de regresión ya documentada y corregida en `products`/
  `warehouse`. Se quita el `console.log(error)` de debug. `next(error)`
  en el catch.
- **`updateShippingGuide`**: agrega `decodeId(req.params.guide_id,
  'guide_id')`, guarda `Array.isArray(body.id)` → `AppError(msg, 400)`,
  corrige `params.order_id` → `params.guide_id` (bug #2), y
  `next(error)` en el catch. El service (`ShippingGuideService.
  updateShippingGuide`) agrega el import de `Utils` (bug #1).
- **`deleteShippingGuide`** (nuevo): `decodeId(req.params.guide_id,
  'guide_id')` → `ShippingGuideService.deleteShippingGuide(guideId)` →
  `AppError('Guía no encontrada', 404)` si no existe →
  `res.status(200).json({ data: 'resource deleted successfully' })`.
  `next(error)` en el catch.

### Feature nueva: borrar guía completa

`ShippingGuideService.deleteShippingGuide(id)`:

1. `findByPk(id)` — si no existe, `AppError('Guía no encontrada', 404)`.
2. Transacción: `ShippingGuideItems.destroy({ where: { guideId: id },
   transaction })` seguido de `ShippingGuide.destroy({ where: { id },
   transaction })`. Se borran los items primero porque
   `shippingGuideItems.belongsTo(ShippingGuide, ...)` no declara
   `onDelete: CASCADE` en `init.models.js` — borrar la guía primero
   fallaría por constraint FK si tiene items.
3. Tras el `commit`, si `guide.file` está definido, intenta
   `fs.unlinkSync(...)` sobre la ruta absoluta del PDF (mismo cálculo
   de ruta que usa `sendFileDownload` en `downloads.controller.js`:
   resolver relativo a la raíz del proyecto). Esto es **best-effort**:
   si el archivo no existe (`ENOENT`) o falla el borrado, se loguea con
   `console.error` pero no se lanza — la guía ya se borró de la DB, que
   es el resultado que le importa a quien llama. El método devuelve
   `'resource deleted successfully'` en cualquier caso una vez que el
   `commit` de la transacción tuvo éxito.

`ShippingGuideController.deleteShippingGuide` no necesita repetir la
lógica de "no encontrado" — el service ya lanza el 404 en el paso 1;
el controller solo hace `decodeId` + llamar al service + responder 200.

Se descomenta `router.delete('/:guide_id',
ShippingGuideController.deleteShippingGuide);` en
`shippingGuide.routes.js` y `deleteShippingGuide` en el objeto exportado
de `ShippingGuideController` (ambos ya estaban como comentarios,
placeholders de una implementación que nunca se completó).

## Contrato HTTP

La respuesta exitosa no cambia de forma en los endpoints existentes.
Los errores usan el estándar central:

```json
{ "error": { "message": "mensaje descriptivo", "code": "AppError|INTERNAL_ERROR" } }
```

| Caso | Antes | Después |
|---|---|---:|
| Token ausente o inválido | 403 | 403 (sin cambio) |
| `guide_id` inexistente en `getShippingGuideById` | 500 crudo (`TypeError` no manejado) | 404 |
| `guide_id` inexistente en `updateShippingGuide` | 200 silencioso (el `update` de items simplemente no afecta filas) | 404 |
| `guide_id` inexistente en `deleteShippingGuide` | *(endpoint no existía)* | 404 |
| hashid inválido en `guide_id` | 400/500 crudo según el punto de fallo | 400 explícito, vía `decodeId` |
| `dateStartTraslate`/`dateEndTraslate`/`details` ausente en `createShippingGuide` | 400 accidental (error crudo de Sequelize o `TypeError`) | 400 explícito, `AppError` |
| Crear items nuevos en `updateShippingGuide` | 400 crudo, siempre falla (bug `order_id`/`guide_id`) | 200, funciona |
| `PUT` con items existentes (`id` no vacío) | 500 crudo (`ReferenceError: Utils is not defined`) | 200, funciona |
| `DELETE /api/shipping_guides/:guide_id` | *(no existía)* | 200, borra guía + items + PDF |
| Error inesperado (DB, PDF, mailer) | 400 | 500 |

## Cambios conscientes de contrato

- `getShippingGuideById`, `updateShippingGuide` pasan de
  200-silencioso-o-crash a 404 sobre un `guide_id` inexistente —
  consistente con el patrón ya usado en `products`/`warehouse`.
- `createShippingGuide` exige explícitamente `dateStartTraslate`,
  `dateEndTraslate` y `details`, aunque las dos primeras ya eran
  `allowNull: false` en el modelo — el cambio solo formaliza con un
  `AppError` explícito lo que ya era un requisito de facto.
- Crear items nuevos durante un `updateShippingGuide` y actualizar
  items existentes pasan de "siempre falla" a "funciona" — no es un
  cambio de contrato, es la corrección de dos bugs que dejaban el
  endpoint inutilizable en esos dos casos.
- El resto de la forma de respuesta exitosa no cambia.

## Seguridad preservada

`/api/shipping_guides` sigue protegido únicamente por
`authJwt.verifyToken`, sin agregar ni retirar roles — incluida la ruta
nueva de `DELETE`. `decodeId` es endurecimiento de validación de
entrada, no un cambio de política de autorización.

## Verificación

Nueva suite `tests/domain/operations-shippingGuide/shippingGuide.test.js`
(Sequelize real, siguiendo el patrón de `products`/`warehouse`).
Cobertura planeada:

- Happy path de los cinco endpoints (incluye el nuevo `DELETE`).
- `getShippingGuideById` sobre `guide_id` inexistente → 404 (antes: 500
  crudo por `TypeError`).
- `getShippingGuideById`/`updateShippingGuide`/`deleteShippingGuide` con
  hashid inválido → 400.
- `createShippingGuide` sin `dateStartTraslate`/`dateEndTraslate`/
  `details` → 400 explícito.
- `updateShippingGuide` sobre `guide_id` inexistente → 404.
- `updateShippingGuide` actualizando un item existente (`id` no vacío)
  → 200, regresión del bug `Utils` no importado.
- `updateShippingGuide` creando un item nuevo (`id` vacío) → 200,
  regresión del bug `order_id`/`guide_id`, y el item queda asociado al
  `guide_id` correcto (no `null`/`undefined`).
- `deleteShippingGuide` sobre `guide_id` inexistente → 404.
- `deleteShippingGuide` con items asociados → borra items y guía
  (verificar que ambas tablas quedan sin filas para ese `guide_id`).
- `deleteShippingGuide` cuando el archivo PDF no existe en disco → sigue
  respondiendo 200 (no revienta por `ENOENT`).
- Al menos un caso de 500 delegado al handler global (`jest.spyOn` sobre
  un método del service con `mockRejectedValueOnce`).
- JWT ausente → 403 en los cinco endpoints.

Los tests de `pdfService`/`mailer` no se mockean de forma distinta a como
ya lo requiera `bootTestApp()`/`testApp.js` — si `createShippingGuide`
ya se prueba hoy en algún smoke test indirectamente, se revisa antes de
escribir la suite nueva para no duplicar cobertura.

## Hallazgos fuera de alcance

- `ShippingGuideService.deleteItem` no tiene ninguna ruta ni caller en
  el repo (verificado). El usuario pidió explícitamente construir el
  flujo de borrar la guía completa en vez de eliminar este método — se
  deja intacto, sin uso, como posible base para un futuro "borrar item
  individual de una guía" que no es parte de este alcance.
- `ShippingGuideCount` usa el mismo patrón de contador
  `findOrCreate`/`update` sin lock que `Consecutivo` en
  `transactions.controller.js` (condición de carrera bajo escritura
  concurrente) — hallazgo preexistente, no específico de este dominio,
  fuera de alcance de este retrofit.
- `getShippingGuides` no pagina ni filtra por compañía/yate — devuelve
  todas las guías del sistema a cualquier usuario autenticado.
  Comportamiento preexistente, fuera del alcance de este retrofit de
  manejo de errores.
- El parámetro `filePath` de `sendEmailGuiaRemisionCreada` en
  `src/mails/mailer.js` en realidad recibe contenido base64, no una
  ruta (hay un comentario inline que lo aclara) — nombre confuso pero
  no es un bug, y `mailer.js` es un archivo compartido fuera de este
  dominio; no se toca.
