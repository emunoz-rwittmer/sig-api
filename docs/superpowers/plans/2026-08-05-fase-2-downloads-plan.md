# Fase 2 — Dominio Downloads — Implementation Plan

**Goal:** Retrofitear los siete endpoints de `/api/downloads` al patrón
`AppError`/`next(error)`, reparar la descarga de solicitudes de staff,
centralizar y endurecer la descarga de archivos y cubrir el dominio con tests y
Swagger sin cambiar métodos ni URLs públicas.

**Architecture:** Un helper local `sendFileDownload` en
`src/controllers/downloads/downloads.controller.js` implementa validación de
ruta, containment bajo `uploads/`, existencia, MIME, filename y streaming para
los seis archivos persistidos. `exportConsumerCardReport` conserva la
generación temporal existente y adopta validación/clasificación central de
errores.

**Tech Stack:** Node.js, Express 4, Sequelize 6/MySQL, Jest + Supertest,
`mime-types`, excel4node y swagger-jsdoc. Diseño:
`docs/superpowers/specs/2026-08-05-fase-2-downloads-design.md`.

## Restricciones globales

- Rama `refactor/fase-2-downloads`, creada desde `trunk`.
- No cambiar ninguna URL ni método HTTP.
- Conservar `/cruise/:cruise_id/download/pfd` con el typo histórico.
- Mantener JWT mediante `authJwt.verifyToken`.
- No incluir IDs numéricos internos en filenames.
- Usar fixtures reales solo bajo el `uploads/` ignorado y eliminarlas al final.
- No corregir defectos encontrados en dominios ajenos.

## Task 1: Restaurar `FormatService.getRequestById`

- [x] Restaurar el método que consulta `RequestStaffs` por PK.
- [x] Verificar en runtime que el método se exporte como función.
- [x] Auditar los métodos de services consumidos por downloads.
- [x] Registrar fuera de scope el método faltante de shipping guide.
- [x] Commit `50486cb`.

## Task 2: Proteger `errorHandler` tras iniciar una respuesta

- [x] Agregar un test unitario inicialmente rojo para `headersSent`.
- [x] Delegar a `next(err)` cuando los headers ya fueron enviados.
- [x] Confirmar los tres tests unitarios en verde.
- [x] Commit `1c9fa6d`.

## Task 3: Consolidar los seis handlers persistidos

- [x] Agregar `decodeId` local con validación de throw/`undefined`.
- [x] Implementar sanitización del filename.
- [x] Normalizar separadores y resolver rutas absolutas.
- [x] Exigir containment estricto bajo `uploads/`.
- [x] Comprobar existencia antes de iniciar la respuesta.
- [x] Usar fallback `application/octet-stream` y `path.extname`.
- [x] Evitar `next(error)` después de iniciar el stream.
- [x] Retrofitear reglamentos, formatos médicos, solicitudes, guías y los dos
  reportes de crucero.
- [x] Conservar las seis claves públicas del controller.
- [x] Commit `c5354ac`.

## Task 4: Retrofitear `exportConsumerCardReport`

- [x] Validar `yachtId` mediante hashid.
- [x] Devolver 404 cuando el yate no existe.
- [x] Delegar errores inesperados con `next(error)`.
- [x] Conservar generación, descarga y borrado del archivo temporal.
- [x] Commit `e06328f`.

## Task 5: Tests de dominio

- [x] Crear fixtures de DB para los seis recursos persistidos.
- [x] Crear archivos reales bajo `uploads/__test_downloads__/`.
- [x] Cubrir 200, 400 por hashid, 404 de recurso, 404 sin archivo y 404 de
  archivo ausente en cada endpoint persistido.
- [x] Cubrir la regresión de `getRequestById`.
- [x] Cubrir MIME desconocido, extensión real, filename sin ID, traversal,
  sanitización, backslashes y JWT ausente.
- [x] Cubrir generación exitosa, descarga y limpieza del Excel de consumer
  cards, además de sus casos 400/404.
- [x] Ejecutar la suite tres veces en aislamiento: 40/40 en verde.
- [x] Confirmar que no quedaron fixtures bajo `uploads/`.
- [x] Commit `a934327`.

## Task 6: Swagger y documentación

- [x] Documentar las siete rutas con tag `Downloads`, bearer auth y respuestas
  binarias/400/403/404.
- [x] Documentar explícitamente que `pfd` se conserva por compatibilidad.
- [x] Confirmar mediante swagger-jsdoc que los siete paths existen.
- [x] Actualizar `docs/CONVENTIONS.md` con el dominio y las reglas reutilizables
  de descarga.
- [x] Registrar la lección de buscar en todo `src/` antes de borrar dead code.
- [x] Guardar este plan y el documento de diseño.
- [x] Ejecutar el smoke test de Swagger: dos intentos alcanzaron el timeout de
  `beforeAll` porque el pool de Sequelize estaba drenando, antes de servir la
  UI. El parseo directo de swagger-jsdoc sí confirmó los 7 paths; el fallo de
  infraestructura queda registrado para la verificación final.
- [ ] Commit de Swagger y documentación.

## Task 7: Cierre

- [ ] Ejecutar `npm test` completo.
- [ ] Ejecutar `npm run lint`.
- [ ] Hacer verificación manual con datos reales si el entorno dispone de ellos.
- [ ] Comprobar `git status` y ausencia de archivos temporales en `uploads/`.
- [ ] Publicar la rama y abrir PR contra `trunk`, previa confirmación por ser
  acciones externas.

## Contrato de errores

```json
{ "error": { "message": "mensaje", "code": "AppError|INTERNAL_ERROR" } }
```

| Caso | Status |
|---|---:|
| Sin autorización | 403 |
| Hashid inválido | 400 |
| Recurso inexistente | 404 |
| Sin archivo asociado | 404 |
| Path fuera de `uploads/` | 404 |
| Archivo ausente | 404 |
| Error inesperado | 500 |

## Hallazgos fuera de alcance

- Rutas de solicitudes guardadas con backslashes por `formats`.
- `RequestStaffs` sin asociaciones/FKs inicializadas.
- `ShippingGuideService.createItemsOfShippingGuide` invocado pero inexistente.
- Import `cos` sin uso en consumer cards.
- Ruta genérica de reglamentos ubicada primero en el router.
