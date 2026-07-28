# Fase 2 — RRHH: Formats — Implementation Plan

**Goal:** Retrofitear los 12 endpoints de `/api/formats` (`Format`,
`DoctorFormat`, `RequestStaffs`) al patrón `AppError`/`next(error)`, agregar
404 en `getFormat`/`getDoctorFormat` y en las validaciones de staff/format/
company de `createRequesForStaff`, clasificar el JSON malformado de
`companies` como 400, eliminar el dead code `getRequestById`, cubrir todo con
tests de dominio (mockeando Puppeteer y SendGrid) y completar Swagger.

**Architecture:** Cambios en `src/controllers/rrhh/formats.controller.js`,
`src/services/rrhh/formats.services.js` y `src/routes/rrhh/formats.routes.js`.
Ningún modelo ni forma de respuesta **exitosa** cambia. Tests nuevos en
`tests/domain/rrhh-formats/formats.test.js`.

**Tech Stack:** Node.js, Express 4, Sequelize 6 (MySQL), Jest + Supertest,
swagger-jsdoc. Referencia: `docs/superpowers/specs/2026-07-28-fase-2-rrhh-formats-design.md`.

## Global Constraints

- Branch: `refactor/fase-2-rrhh-formats`, creada desde `trunk`.
- Cambia la forma de respuesta de error en los 12 endpoints (string plano →
  `{ "error": { "message", "code" } }`) y agrega 404 donde se documenta en el
  spec — confirmado por el usuario.
- Ningún cambio de path, método HTTP ni nombre de parámetro.
- `puppeteer` (`generateAndSavePDF`) y `sgMail` (`sendEmailNuevaSolicitud`) se
  mockean en los tests — nunca se ejecutan de verdad.
- Cada task termina con `npm test` en verde antes de commitear.

---

### Task 1: Retrofit `Format` (5 endpoints: request)

- [ ] Reescribir `getAllFormats`/`getFormat`/`createFormat`/`updateFormat`/`deleteFormat`
  en `formats.controller.js` con `next(error)`, `decodeId` local y 404 en
  `getFormat`.
- [ ] Quitar el `.map(reg => reg)` no-op de `updateFormat`.
- [ ] Eliminar `FormatService.getRequestById` (dead code) de `formats.services.js`.
- [ ] Tests: listar, get (200 y 404), crear, actualizar, eliminar.

### Task 2: Retrofit `DoctorFormat` (5 endpoints: forms)

- [ ] Reescribir `getAllDoctorFormats`/`getDoctorFormat`/`createDoctorFormat`/
  `updateDoctorFormat`/`deleteDoctorFormat` con `next(error)`, `decodeId` y
  404 en `getDoctorFormat`.
- [ ] Agregar helper `parseCompanies(value)` que envuelve `JSON.parse` y lanza
  `AppError('companies inválido', 400)` ante entrada malformada; usarlo en
  create/update.
- [ ] Tests: listar, get (200 y 404), crear (con y sin archivo real vía
  `uploadPdfFile`), actualizar, eliminar, 400 por `companies` malformado.

### Task 3: Retrofit `RequestStaffs` (2 endpoints) + validaciones de existencia

- [ ] Reescribir `getAllFormatsByStaff`/`createRequesForStaff` con
  `next(error)` y `decodeId`.
- [ ] En `createRequesForStaff`: validar que `staff`, `format` y `compania`
  (por nombre) existan antes de tocar el filesystem/PDF; lanzar `AppError`
  404 con mensaje específico por cada uno si falta.
- [ ] Tests: listar por staff/format, crear solicitud (feliz, con mocks de
  `pdfService` y `mailer`), 404 por staff/format/compañía inexistente.

### Task 4: Swagger + verificación final

- [ ] Documentar los 12 endpoints en `formats.routes.js` (`@openapi`).
- [ ] Actualizar `docs/CONVENTIONS.md`: agregar `formats` (rrhh) a la lista de
  dominios retrofiteados.
- [ ] `npm test` completo en verde.
- [ ] Commits por responsabilidad (implementación / tests / docs), sin mezclar
  con `regulations`/`trading`.
