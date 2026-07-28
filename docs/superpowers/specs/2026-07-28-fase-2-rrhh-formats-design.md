# Fase 2 — RRHH: Formats — diseño

**Fecha:** 2026-07-28
**Estado:** Implementado

## Contexto y alcance

Primer sub-proyecto del dominio `rrhh` (que además incluye `regulations` y
`trading`, fuera de alcance aquí). Cubre los 12 endpoints montados en
`/api/formats`, repartidos en 3 modelos:

- `Format` (`request`): plantillas de solicitud con contenido HTML y lista de
  `companies`.
- `DoctorFormat` (`forms`): formularios médicos con archivo PDF adjunto.
- `RequestStaffs`: solicitudes generadas por un `staff` a partir de un
  `Format`, con generación de PDF (`pdfService.generateAndSavePDF`, Puppeteer)
  y envío de correo (`mailer.sendEmailNuevaSolicitud`, SendGrid).

Se conservan los paths, métodos HTTP y la forma de las respuestas exitosas.

## Hallazgos y decisiones

- Los 12 handlers atrapaban todo error y respondían 400 con un string. Ahora
  delegan a `errorHandler` mediante `next(error)`, con el helper local
  `decodeId` para hashids inválidos (400), igual que en dominios previos.
- `getFormat` y `getDoctorFormat` respondían 200 con body `null` cuando el
  recurso no existía. Se cambia a 404 con `AppError` — **confirmado por el
  usuario**, mismo acuerdo que en `catalogs` y `comentCard` de coordinar el
  frontend por su cuenta.
- `createRequesForStaff` decodifica `format_id`/`staff_id` y busca la
  `compania` por nombre, pero nunca valida que existan antes de generar el
  PDF y escribir en el sistema de archivos: un id válido pero inexistente
  producía un 500 (`TypeError` leyendo `staff.signature` o `compania.logo`).
  Se agregan validaciones explícitas de staff, format y compañía → 404 —
  **confirmado por el usuario**.
- `updateFormat` recalculaba `companies: data.companies.map(reg => reg)`, un
  no-op (copia superficial sin transformación) que además explota con
  `TypeError` si `companies` no viene en el payload. Se elimina el `.map`
  muerto; el campo se pasa tal cual llega, igual que en `createFormat`.
- `createDoctorFormat`/`updateDoctorFormat` hacen `JSON.parse(data.companies)`
  sin manejar un JSON malformado (multipart/form-data obliga a mandar
  `companies` como string). Un payload malformado producía un 500
  (`SyntaxError` sin clasificar). Se envuelve en un helper que lanza
  `AppError` 400 ante JSON inválido, siguiendo la misma regla que la
  validación de hashids: un error de entrada identificable no debe llegar
  como 500 accidental.
- `createDoctorFormat` accedía a `req.file.filename` sin validar que se haya
  subido un archivo, explotando con `TypeError` (500) si el request no traía
  `file`. Se agrega `if (!req.file) throw new AppError('No se ha subido
  ningún archivo', 400)`, replicando el mismo mensaje y patrón ya usado en
  `company.controller.js`/`staff.controller.js` para el mismo tipo de bug —
  no es una convención nueva, es aplicar la ya existente.
- `FormatService.getRequestById` es dead code: no tiene ningún llamante en el
  controller ni en otro servicio. Se elimina.
- No se toca el comportamiento de `deleteFormat`/`deleteDoctorFormat`
  (responden éxito sin verificar si algo se borró) ni el de `updateFormat`
  con id inexistente (Sequelize `update` con `where` que no matchea filas no
  es un error) — consistente con cómo se dejó `positions`/`documentation` en
  la fase anterior; no se amplía el alcance de 404 más allá de los "get by
  id" ya acordados.
- Las rutas de creación/actualización de `DoctorFormat` usan
  `uploadPdfFile` (multer) y las de `RequestStaffs` usan `multer().single('file')`
  directo en la ruta; ambos flujos de archivo se conservan sin cambios.

## Contrato de errores

| Caso | Status |
|---|---:|
| Hashid inválido en cualquier param | 400 |
| `companies` con JSON malformado en `forms` (create/update) | 400 |
| Format/DoctorFormat individual inexistente (`GET /:format_id`) | 404 |
| Staff, Format o Company inexistente en `createRequesForStaff` | 404 |
| Sequelize, Puppeteer, SendGrid o error inesperado | 500 |

Todos los errores que llegan al handler global usan:

```json
{ "error": { "message": "mensaje", "code": "AppError|INTERNAL_ERROR" } }
```

## Seguridad preservada

`/api/formats` completo requiere JWT (`authJwt.verifyToken`, sin `isAdmin`),
montado así en `src/routes/index.js:57`. No se modifica.

## Verificación

Las pruebas de dominio cubren casos felices, 400 (hashid y JSON de
`companies` malformado), 404 (format/doctorFormat/staff/company inexistente)
y la creación de `RequestStaffs` con generación de PDF y envío de correo
mockeados (Puppeteer real es demasiado lento/no determinístico para tests de
integración; SendGrid no debe llamarse en tests). El mock de
`pdfService.generateAndSavePDF` escribe un archivo dummy en el `filePath`
recibido para que el flujo posterior (`fs.readFileSync` para adjuntar el PDF
al correo) funcione igual que en producción.

## Reglas reutilizables para siguientes fases

Ninguna nueva regla general — se reutilizan íntegramente las de
`docs/CONVENTIONS.md` (hashids, `AppError`/`next(error)`, atributos
Sequelize). El patrón de "helper que envuelve una operación de parseo
insegura (`JSON.parse`) y la clasifica como 400" es una extensión directa del
patrón `decodeId` ya documentado, no amerita una entrada nueva.
