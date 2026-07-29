# Fase 2 — RRHH: Regulations + Trading — Implementation Plan

**Goal:** Retrofitear los 13 endpoints de `/api/regulations` (8) y
`/api/tradings` (5) al patrón `AppError`/`next(error)`, corregir el bug de
`getTrading` (param equivocado, siempre 400), agregar 404 en los "get by id"
donde hoy hay 200+null o 500, corregir el `await` faltante en
`readAceptRegulation`, eliminar dead code (`getRegulation` en el controller,
import sin uso de `mathjs`), cubrir todo con tests de dominio y completar
Swagger. Cierra RRHH como dominio completamente retrofiteado.

**Architecture:** Cambios en `src/controllers/rrhh/trading.controller.js`,
`src/controllers/rrhh/regulations.controller.js`,
`src/services/rrhh/regulations.services.js`,
`src/routes/rrhh/trading.routes.js` y `src/routes/rrhh/regulations.routes.js`.
Ningún modelo ni forma de respuesta **exitosa** cambia. Tests nuevos en
`tests/domain/rrhh-regulations-trading/`.

**Tech Stack:** Node.js, Express 4, Sequelize 6 (MySQL), Jest + Supertest,
swagger-jsdoc. Referencia:
`docs/superpowers/specs/2026-07-29-fase-2-rrhh-regulations-trading-design.md`.

## Global Constraints

- Branch: `refactor/fase-2-rrhh-regulations-trading`, creada desde `trunk`.
- Cambia la forma de respuesta de error en los 13 endpoints (string plano →
  `{ "error": { "message", "code" } }`), agrega 404 donde se documenta en el
  spec y corrige el bug de `getTrading` — confirmado por el usuario.
- Ningún cambio de path ni método HTTP. El único rename de parámetro es
  `:company_id` → `:regulation_id` en `DELETE /regulations/:id` (era un
  placeholder mal nombrado; la URL posicional que consume el cliente no
  cambia).
- Cada task termina con `npm test` en verde antes de commitear.

---

### Task 1: Retrofit `trading` (5 endpoints)

- [x] Reescribir los 5 handlers de `trading.controller.js` con `next(error)` y
  `decodeId` local.
- [x] Corregir `getTrading`: leer `req.params.trading_id` (no `company_id`) y
  agregar 404 vía `AppError` si no existe, usando
  `result.dataValues.id = Utils.encode(...)` (no `.id` directo).
- [x] Agregar guard en `createTrading`: si no hay `req.file` ni `data.url`,
  `AppError('No se ha subido ningún archivo', 400)`.
- [x] Tests: listar, get (200 y 404), 400 hashid inválido, crear (con y sin
  archivo), actualizar, eliminar.

### Task 2: Retrofit `regulations` (8 endpoints ruteados)

- [x] Reescribir los 8 handlers ruteados con `next(error)` y `decodeId`.
- [x] Eliminar el handler `getRegulation` (dead code, no montado en rutas);
  conservar `RegulationService.getRegulationById` (lo usa
  `downloads.controller.js`).
- [x] 404 en `getRegulationStaffById` y en `readAceptRegulation` cuando el
  registro de lectura no existe.
- [x] Guard de archivo faltante en `createRegulation`.
- [x] `updateRegulation`: decodificar `companyId` solo si viene en el payload.
- [x] Renombrar `:company_id` → `:regulation_id` en la ruta y el controller de
  `deleteRegulation`.
- [x] Tests: listar por compañía/staff, staffs de compañía, crear (con y sin
  archivo, verificando el bulk-create de `StaffReadRegulation`), actualizar,
  eliminar, get/aceptar registro de lectura (200 y 404), envío de correo
  mockeado.

### Task 3: Fixes en `regulations.services.js`

- [x] Quitar el import sin uso `const { mode } = require('mathjs')`.
- [x] `readAceptRegulation`: `await result.update({ read: true })`.
- [x] Quitar el `console.error` de debugging en `createRegulation`.

### Task 4: Swagger + verificación final

- [x] Documentar los 13 endpoints en `regulations.routes.js` y
  `trading.routes.js` (`@openapi`), tags `Regulations`/`Tradings`.
- [x] Actualizar `docs/CONVENTIONS.md`: marcar RRHH completo (`formats`,
  `regulations`, `trading`) y agregar la regla reutilizable de PK-encoding.
- [x] `npm test` completo en verde.
- [x] Commits por responsabilidad (implementación / tests / docs).
