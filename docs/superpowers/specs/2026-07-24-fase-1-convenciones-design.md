# Fase 1 — Convenciones compartidas para interno-api

**Fecha:** 2026-07-24
**Rama:** `refactor/fase-1-convenciones` (a crear)
**Estado:** Diseño aprobado, pendiente de plan de implementación

## Contexto

Fase 0 (fusionada en `trunk`, PR #2) dejó una red de seguridad mínima:
Jest/Supertest con 10 smoke tests + 3 unit tests, ESLint/Prettier, validación
de env vars al arrancar, `AppError`/`errorHandler` centralizados (sin adoptar
en ningún controller todavía), Swagger en `/api/docs`, y el salt de hashids
movido a `HASHIDS_SALT`.

El spec de Fase 0 (`docs/superpowers/specs/2026-07-23-fase-0-fundamentos-design.md`)
define el mapa de fases y deja para Fase 1:

> Convenciones compartidas: romper `Utils.js`, unificar sufijos de archivo,
> estandarizar respuestas HTTP/errores, corregir naming coordinando con el
> frontend.

Este spec cubre exactamente eso, con el alcance acotado en la sesión de
brainstorming: cambios mecánicos y de bajo riesgo, sin tocar ningún contrato
público (rutas, forma de respuesta, comportamiento). El retrofit profundo
(aplicar `AppError` a los ~150 endpoints existentes, deduplicar servicios
god-node como `staff.services` reimportado en 8 controllers, naming que sí
toque la API) queda para Fase 2, dominio por dominio — mismo criterio
"justo a tiempo" que ya se usó con Swagger y los tests profundos en Fase 0.

## Hallazgos que informan el alcance

- `Utils.js` mezcla 4 responsabilidades sin relación entre sí: codificación
  de IDs (hashids), generación de passwords/tokens JWT, formateo de fechas,
  y lógica de negocio específica de dos dominios (encuestas, inventario).
- `Utils.encode`/`Utils.decode` se usan en 35-45 archivos (la inmensa mayoría
  de los controllers). El resto de métodos de `Utils.js` se usan en 1-6
  archivos cada uno.
- Sufijo de archivo de servicios: 37 archivos ya usan `.services.js`, solo 4
  usan `.service.js` (todos en `src/services/bar/`).
- El typo `donwloads` existe en nombres de archivo/carpeta/clase
  (`src/controllers/donwloads/`, `src/routes/donwloads/`, `DonwloadController`)
  pero la URL pública ya es la correcta: `/api/downloads`.
- El manejo de errores actual es uniforme y simple de describir:
  `catch (error) { res.status(400).json(error.message) }` en prácticamente
  todos los controllers — status fijo en 400 sin importar el error real, y
  el body es un string plano, no un objeto.
- El bug `algorithm: 'H5512'` (debería ser `'HS512'`) sigue presente en
  `src/middlewares/auth.middleware.js:16,29`. No se corrige en esta fase.

## Alcance de la Fase 1

### 1. Romper `Utils.js`

`Utils.js` queda **solo** con `encode`/`decode` — cero archivos externos
tocados por esos dos métodos. Todo lo demás se extrae a módulos nuevos de
utilidad pura (sin estado, sin acceso a DB), agrupados por responsabilidad:

| Archivo nuevo | Funciones que recibe | Call sites a actualizar |
|---|---|---|
| `src/utils/tokens.js` | `getPasswordRandom`, `generateAccessToken`, `generateRefreshToken`, `getSessionRandom` | `src/controllers/catalogs/auth.controller.js`, `src/controllers/catalogs/staff.controller.js`, `src/controllers/catalogs/users.controller.js`, `src/middlewares/auth.middleware.js` |
| `src/utils/dateFormat.js` | `formatDateToLocal`, `formatMonthYear` | `src/services/bar/cruiseReportPDF.service.js`, `src/services/operations/shippingGuide/pdfService.js`, `src/controllers/reports/generateGeneralReportEvaluations.js`, `src/controllers/reports/generateReportComentCards.js`, `src/controllers/reports/generateTransactionsExcel.js`, `src/controllers/reports/generatReportEvaluationsByEmployed.js` |
| `src/utils/quantity.js` | `normalizeQuantity`, `viewCorrectQuantity` | `src/services/operations/inventory/products.services.js`, `src/services/operations/inventory/transactions.services.js`, `src/controllers/operations/inventory/products.controller.js`, `src/controllers/operations/inventory/warehouse.controller.js`, `src/controllers/operations/yachtRequest/yachtRequest.controller.js` |
| `src/utils/surveyScoring.js` | `asignarPuntaje` | `src/controllers/reports/generateGeneralReportEvaluations.js` |

No se reutiliza el nombre `src/utils/auth.js` para tokens porque ya existe
con otro propósito (`fetchSessionData` de sesiones Mongo) — colisión de
nombre, no de contenido.

`src/middlewares/auth.middleware.js` se edita **solo** para actualizar el
`require` de `generateAccessToken` → `tokens.js`. El bug `H5512` en ese mismo
archivo no se toca en esta fase (es un cambio de comportamiento, fuera de
alcance — ver sección "Fuera de alcance").

Cada función se mueve con su firma y comportamiento idénticos — esto es
movimiento de código, no reescritura. Los call sites cambian de
`Utils.metodo(...)` a `NombreModulo.metodo(...)` con el import
correspondiente.

### 2. Unificar sufijos de archivo de servicios

Se renombran los 4 outliers en `src/services/bar/` de `.service.js` a
`.services.js` para converger al patrón mayoritario (37 archivos):

- `consumerCardReportExcel.service.js` → `consumerCardReportExcel.services.js`
- `cruiseReportExcel.service.js` → `cruiseReportExcel.services.js`
- `cruiseReportPDF.service.js` → `cruiseReportPDF.services.js`
- `passengerInvoicePDF.service.js` → `passengerInvoicePDF.services.js`

Cada rename incluye actualizar el/los `require(...)` que los importan. Cero
cambio de comportamiento.

### 3. Documentar el estándar de errores/respuestas HTTP (sin retrofit)

Se crea `docs/CONVENTIONS.md` documentando el patrón oficial para código
**nuevo o tocado** de aquí en adelante:

- Usar `throw new AppError(mensaje, statusCode)` (capturado por
  `errorHandler`, registrado en Fase 0) en vez de
  `res.status(400).json(error.message)`.
- Forma de respuesta de error: `{ "error": { "message": string, "code":
  string } }`.
- Los ~150 endpoints existentes **no se tocan** en esta fase — siguen
  respondiendo exactamente como hoy. `AppError`/`errorHandler` ya existen
  desde Fase 0 pero ningún controller los usa todavía; ese retrofit ocurre
  dominio por dominio en Fase 2.
- El documento también registra la convención de sufijos (`.services.js`) y
  dónde viven los módulos de utilidad pura (`src/utils/`), para que Fase 2
  tenga una referencia citable.

No hay cambio de código de producción en esta sección, solo el archivo de
documentación nuevo.

### 4. Naming interno: `donwloads` → `downloads`

Sin impacto en la API pública — la URL ya es `/api/downloads`, correcta.
Solo naming interno:

- `src/controllers/donwloads/` → `src/controllers/downloads/`
- `src/controllers/donwloads/donwloads.controller.js` → `downloads.controller.js`
- `src/routes/donwloads/` → `src/routes/downloads/`
- `src/routes/donwloads/donwloads.routes.js` → `downloads.routes.js`
- Clase/variable `DonwloadController` → `DownloadController`
- Actualizar el único `require(...)` en `src/routes/index.js`

## Fuera de alcance en la Fase 1

- Retrofit de `AppError`/`errorHandler` en los controllers existentes (Fase 2).
- Mover `Utils.encode`/`Utils.decode` (se quedan en `Utils.js`).
- Cualquier naming, ruta o forma de respuesta que toque la API pública o
  requiera coordinación con el frontend.
- Corregir el typo `H5512` → `HS512` en `auth.middleware.js` (cambio de
  comportamiento de verificación JWT, fuera de alcance; solo se actualiza el
  import de `generateAccessToken` en ese archivo).
- Deduplicar `staff.services` reimportado casi idéntico en 8 controllers —
  es refactor de dominio (god-node), no convención de nombres. Fase 2.
- Reformatear código existente con Prettier/ESLint más allá de los archivos
  tocados por esta fase.

## Testing

La red de seguridad de Fase 0 se usa como regresión, no se construye una
nueva:

- `npm test` (10 smoke tests + 3 unit tests existentes) debe seguir en verde
  después de cada movimiento de código — es la señal de "no rompí nada" para
  los renames/moves mecánicos de las secciones 1, 2 y 4.
- Los 4 módulos nuevos de utilidad (`tokens.js`, `dateFormat.js`,
  `quantity.js`, `surveyScoring.js`) no tenían test unitario dedicado —
  estaban enterrados en `Utils.js`, que solo tenía test para `encode`/
  `decode`. Se agrega un test unitario básico por módulo nuevo, mismo patrón
  que `tests/unit/utils/Utils.test.js` de Fase 0.
- `npm run lint` sigue corriendo sin romperse (config, no contenido).

## Riesgos y mitigaciones

- **Import roto tras un rename.** Mitigación: cada move/rename es un paso
  independiente en el plan, verificado con `npm test` antes de pasar al
  siguiente — un import roto se detecta de inmediato porque el `require` al
  boot de la app falla.
- **Cambiar sin querer el comportamiento de una función al moverla.**
  Mitigación: las funciones se mueven con copy-paste literal de su cuerpo,
  no se reescriben; los tests unitarios nuevos capturan el comportamiento
  actual antes del move (mismo patrón TDD-lite que Fase 0 usó para el salt
  de hashids).
- **Tocar sin querer el bug `H5512` al editar `auth.middleware.js`.**
  Mitigación: el plan aísla ese archivo a un único cambio de línea (el
  `require` de `generateAccessToken`), con un diff mínimo fácil de revisar
  línea por línea.

## Criterios de éxito

- `Utils.js` contiene únicamente `encode`/`decode`.
- Los 4 módulos nuevos de utilidad existen, cada uno con al menos un test
  unitario, y todos los call sites originales fueron actualizados (cero
  referencias a `Utils.getPasswordRandom`, `Utils.generateAccessToken`,
  `Utils.generateRefreshToken`, `Utils.getSessionRandom`,
  `Utils.formatDateToLocal`, `Utils.formatMonthYear`,
  `Utils.asignarPuntaje`, `Utils.normalizeQuantity`,
  `Utils.viewCorrectQuantity` en el código fuente).
- `grep -rl ".service.js" src/services` no devuelve archivos (todos son
  `.services.js`).
- No queda ninguna referencia a `donwloads` (case-insensitive) en rutas de
  archivo, nombres de clase o variables — excepto la palabra "download" en
  inglés correcto donde corresponda.
- `docs/CONVENTIONS.md` existe y documenta el estándar de errores, sufijos
  de archivo y ubicación de utils.
- `npm test` pasa en verde (10 smoke + tests unitarios existentes + los
  nuevos de los 4 módulos extraídos).
- `npm run lint` corre sin romperse.
- `git diff trunk --stat` no muestra cambios en ninguna ruta (`src/routes/`
  fuera del rename de `donwloads`), ni en la forma de ninguna respuesta HTTP
  existente.
