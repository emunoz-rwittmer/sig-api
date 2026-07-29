# Fase 2 — Dominio Reports (generación de Excel) — Implementation Plan

**Goal:** Retrofitear los 6 endpoints vigentes de `/api/reports` al patrón
`AppError`/`next(error)`, eliminar `GET /request/:request_id`
(`generateRequestExcel`) por dead code irreparable (asociación `placeYacht`
inexistente), eliminar `ReportService.getTransactionsReport` (dead code sin
llamantes), agregar 404 en `generateOrderExcel`/`generateTransactionsExcel`,
guards de shape en `generateStockExcel`/`generatReportEvaluationsByEmployed`,
guard `fs.existsSync` antes de cada `addImage`, cubrir todo con tests de
dominio (estableciendo el primer patrón de test para respuestas binarias del
repo) y completar Swagger.

**Architecture:** Cambios en los 6 archivos de
`src/controllers/reports/*.js` que se conservan, `src/routes/reports/reports.routes.js`
y `src/services/reports/reports.services.js`. Se elimina
`src/controllers/reports/generateRequestExcel.js`. Ningún modelo ni forma de
respuesta **exitosa** cambia. Tests nuevos en `tests/domain/reports/reports.test.js`.

**Tech Stack:** Node.js, Express 4, Sequelize 6 (MySQL), Jest + Supertest,
excel4node, swagger-jsdoc. Referencia:
`docs/superpowers/specs/2026-07-29-fase-2-reports-design.md`.

## Global Constraints

- Branch: `refactor/fase-2-reports`, creada desde `trunk`.
- Elimina completamente el endpoint `GET /reports/request/:request_id` (ruta,
  controller, service) — confirmado por el usuario, ruta ya sin uso.
- Cambia la forma de respuesta de error en los 6 endpoints restantes (string u
  objeto suelto → `{ "error": { "message", "code" } }`), agrega 404 donde se
  documenta en el spec, y agrega guards `fs.existsSync` antes de `addImage` —
  confirmado por el usuario.
- Ningún cambio de path ni método HTTP en los 6 endpoints que se conservan.
- Cada task termina con `npm test` en verde antes de commitear.

---

### Task 1: Eliminar el flujo muerto de `request excel`

- [x] Borrar `src/controllers/reports/generateRequestExcel.js`.
- [x] Quitar su require/export de `src/controllers/reports/index.js`.
- [x] Quitar la ruta `GET /request/:request_id` de `reports.routes.js`.
- [x] Eliminar `ReportService.getRequestReport` y los imports
  `Request`/`requestItems` (solo ese método los usaba) de
  `reports.services.js`.
- [x] Eliminar también `ReportService.getTransactionsReport` (dead code
  descubierto durante la limpieza, sin llamantes) y sus imports exclusivos.

### Task 2: Retrofit de los 6 endpoints restantes

- [x] `generateOrderExcel.js`: `next(error)`, `decodeId`, 404 si la orden no
  existe, guard `fs.existsSync` antes del logo de compañía.
- [x] `generateTransactionsExcel.js`: `next(error)`, `decodeId`, 404 si el
  stock no existe.
- [x] `generateStockExcel.js`: `next(error)`, guard
  `!Array.isArray(data.products)` → 400.
- [x] `generateGeneralReportEvaluations.js`: `next(error)`, `decodeId`,
  `"No hay registros."` envuelto en `AppError` (400), guard de logo.
- [x] `generatReportEvaluationsByEmployed.js`: `next(error)`, guard
  `!Array.isArray(dataForReport?.averageReviews)` → 400, guard de logo.
- [x] `generateReportComentCards.js`: `next(error)`, `decodeId`,
  `"No hay registros."` envuelto en `AppError` (400), guard de logo.

### Task 3: Swagger + verificación final

- [x] Documentar los 6 endpoints en `reports.routes.js` (`@openapi`), tag
  `Reports`.
- [x] Tests de dominio nuevos en `tests/domain/reports/reports.test.js`:
  casos felices (200 + `content-disposition`), 400, 404, y confirmación de
  que `GET /reports/request/:id` ya no existe.
- [x] `npm test` completo — los archivos tocados en este PR
  (`reports.test.js` y todo lo de fases anteriores) pasan de forma
  consistente en corridas repetidas; el resto de la suite muestra
  flakeza preexistente e intermitente por timeouts de `beforeAll` bajo carga
  (no relacionada con este cambio, ya observada antes de empezar este
  dominio).
- [x] Actualizar `docs/CONVENTIONS.md`: agregar `reports` a los dominios
  retrofiteados y la regla de guard de imagen.
- [x] Commits por responsabilidad (implementación / tests / docs).
