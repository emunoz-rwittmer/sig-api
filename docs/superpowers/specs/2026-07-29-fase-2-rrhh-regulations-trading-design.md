# Fase 2 — RRHH: Regulations + Trading — diseño

**Fecha:** 2026-07-29
**Estado:** Implementado

## Contexto y alcance

Último sub-proyecto del dominio `rrhh` (después de `formats`). Cubre los 13
endpoints montados en `/api/regulations` (8) y `/api/tradings` (5). Se
conservan los paths, métodos HTTP y la forma de las respuestas exitosas.

## Hallazgos y decisiones

- Los 13 handlers atrapaban todo error y respondían 400 con un string. Ahora
  delegan a `errorHandler` mediante `next(error)`, con el helper local
  `decodeId` para hashids inválidos (400), igual que en dominios previos.
- **Bug:** `GET /api/tradings/:trading_id` decodificaba `req.params.company_id`
  — un parámetro que no existe en esa ruta (el param real es `trading_id`) —
  así que el endpoint siempre respondía 400 (`Utils.decode(undefined)` lanza).
  Nunca funcionó. Se corrige leyendo `trading_id` — **confirmado por el
  usuario**.
- `getTrading` respondía 200 con body `null` cuando el trading no existía
  (`result instanceof Object` es `false` para `null`). Se cambia a 404 con
  `AppError`, mismo criterio que `formats`/`catalogs`/`comentCard` —
  **confirmado por el usuario**. Se aplica el mismo criterio a
  `getRegulationStaffById` (`GET /regulations/regulation_staff/:regulation_id`,
  antes un `TypeError` 500 si la fila no existía) y a
  `readAceptRegulation` (`PUT /regulations/aceptar_reglamento/:regulation_id`,
  mismo problema).
- **Bug (no-op de PK-encoding):** `getTrading` hacía `result.id =
  Utils.encode(result.id)` sobre una instancia Sequelize. La asignación directa
  a `.id` (en vez de `.dataValues.id`) no se refleja en el JSON serializado —
  el body sigue mostrando el id numérico crudo. Este mismo bug ya se había
  corregido en la fase de `catalogs-documentation-positions-roles`, pero nunca
  se documentó como regla general (ver más abajo); reaparece aquí de forma
  independiente porque `getTrading` jamás se pudo probar en producción (el bug
  de arriba lo dejaba siempre en 400).
- `createTrading` solo asignaba `data.url` si venía `req.file`, pero `url` es
  `allowNull: false`. Sin archivo, hoy cae como 400 (mensaje de Sequelize sin
  clasificar); con `next(error)` sería un 500 no clasificado — regresión. Se
  agrega guard explícito `if (!data.url) throw AppError(..., 400)`, mismo
  patrón que `createDoctorFormat` en la fase anterior.
- `createRegulation` accedía a `req.file.filename` sin validar que se haya
  subido un archivo (el modelo `Regulation.file` es `allowNull: false`). Se
  agrega el mismo guard.
- `updateRegulation` pisaba `data.companyId` incondicionalmente con
  `Utils.decode(data.companyId)`, incluso cuando el payload no traía
  `companyId` (quedaba `undefined`). Se decodifica solo si el campo viene en el
  payload.
- `RegulationController.getRegulation` (el wrapper de
  `RegulationService.getRegulationById`) es dead code: no está montado en
  `regulations.routes.js`. Se elimina el handler del controller — el método de
  servicio **se conserva**, porque lo consume
  `downloads.controller.js:downloadReglamento`.
- `RegulationService.readAceptRegulation` hacía `result.update({ read: true
  })` **sin `await`**: el handler podía responder 200 y disparar el correo de
  confirmación antes de que la escritura terminara. Se agrega el `await`.
- Import sin uso `const { mode } = require('mathjs')` en
  `regulations.services.js` (dead code, `mathjs` sigue en uso en
  `indicators.controller.js`) y un `console.error` de debugging en
  `createRegulation` — ambos eliminados.
- La ruta `DELETE /regulations/:company_id` usaba un placeholder mal nombrado:
  el handler y el servicio borran por id de reglamento, no de compañía. Se
  renombra a `:regulation_id` en la ruta y el controller — la URL que consume
  el cliente no cambia (mismo segmento posicional).
- `TradingService.getAll`'s `ORDER BY CASE WHEN id = 16 THEN 0 ELSE 1 END` fija
  un id de negocio hardcodeado. No se toca — es una decisión de producto
  preexistente, fuera del alcance de este retrofit de errores.

## Contrato de errores

| Caso | Status |
|---|---:|
| Hashid inválido en cualquier param | 400 |
| Sin archivo en `createRegulation`/`createTrading` | 400 |
| Trading inexistente (`GET /:trading_id`) | 404 |
| Registro de lectura inexistente (`GET /regulation_staff/:regulation_id`, `PUT /aceptar_reglamento/:regulation_id`) | 404 |
| Sequelize u otro error inesperado | 500 |

```json
{ "error": { "message": "mensaje", "code": "AppError|INTERNAL_ERROR" } }
```

## Seguridad preservada

`/api/regulations` y `/api/tradings` requieren JWT (`authJwt.verifyToken`, sin
`isAdmin`), montados así en `src/routes/index.js:56-57`. No se modifica.

## Verificación

Tests de dominio en `tests/domain/rrhh-regulations-trading/` cubren casos
felices de los 13 endpoints, 400 (hashid inválido y archivo faltante), 404
(trading y registros de lectura inexistentes), que `createRegulation`
bulk-cree las filas de `StaffReadRegulation` para el personal ya asignado a la
compañía, y que `aceptar_reglamento` deje `read: true` releído desde la DB
(ancla el fix del `await` faltante) además de disparar
`sendEmailConfirmacion` (mockeado, nunca llama a SendGrid real).

## Reglas reutilizables para siguientes fases

- **PK-encoding:** al reasignar el id codificado de una instancia Sequelize
  antes de serializar la respuesta, usar siempre `result.dataValues.id =
  Utils.encode(result.dataValues.id)`. `result.id = Utils.encode(result.id)` es
  un no-op sobre el campo PK (no se refleja en el JSON de respuesta) y no debe
  usarse. Esta regla ya se había aplicado en la fase de
  `catalogs-documentation-positions-roles` pero nunca se registró en
  `docs/CONVENTIONS.md`; se agrega ahora para que no vuelva a reaparecer.
