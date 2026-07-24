# Fase 0 — Fundamentos seguros para el refactor de interno-api

**Fecha:** 2026-07-23
**Rama:** `refactor/fase-0-fundamentos`
**Estado:** Diseño aprobado, pendiente de plan de implementación

## Contexto

`interno-api` es el backend (Node/Express/Sequelize) que soporta las operaciones
de Rolf Wittmer (bar, catálogos, indicadores, inventario, órdenes, guías de
envío, encuestas, solicitudes de yate, reportes, RRHH). Es un sistema en
producción activa (commits frecuentes en `trunk`) consumido por un frontend
con el que se puede coordinar cambios de contrato si hace falta.

Un análisis del grafo de conocimiento del código (`graphify-out/GRAPH_REPORT.md`)
y una revisión manual encontraron:

- **Cero tests automatizados.** `npm test` es un stub que siempre falla.
- **Sin ESLint ni Prettier** configurados en el proyecto.
- **`src/utils/Utils.js` es un god-file**: mezcla codificación de IDs (hashids),
  generación de contraseñas/tokens JWT, formateo de fechas en español y lógica
  de negocio específica (`asignarPuntaje` de encuestas, normalización de
  cantidades de inventario).
- **Salt hardcodeado** en `Utils.js` (`"tiptop-hlfe/r0lf"`) en vez de variable
  de entorno.
- **Servicios "god-node"** reimportados de forma casi idéntica en 7+
  controladores distintos (ej. `Staffervice`), sufijos de archivo inconsistentes
  (`.models.js` vs `.service.js` vs `.services.js`), y errores de naming
  (`donwloads`, mezcla de inglés/español).
- **`readme.md` desactualizado**: documenta Postgres (`pg`, `pg-hstore`) pero
  `src/utils/database.js` usa `dialect: 'mysql'`; esas dos dependencias no se
  usan en ningún lugar del código.
- **Sin documentación de API** (no hay Swagger/OpenAPI ni colección de Postman
  versionada en el repo).
- **Bug funcional detectado de paso** (fuera de alcance de esta fase, solo
  documentado): en `src/middlewares/auth.middleware.js` líneas 16 y 29,
  `jwt.verify(..., { algorithm: 'H5512' })` tiene un typo — debería ser
  `'HS512'` (así lo firma `Utils.js`). Se abordará cuando se refactorice el
  módulo de auth.

## Mapa de fases (contexto — no es el alcance de este spec)

1. **Fase 0 (este spec)** — Tooling y red de seguridad mínima.
2. **Fase 1** — Convenciones compartidas: romper `Utils.js`, unificar sufijos
   de archivo, estandarizar respuestas HTTP/errores, corregir naming
   coordinando con el frontend.
3. **Fase 2** — Refactor por dominio (bar, catálogos, indicadores, inventario,
   órdenes, guías de envío, encuestas, solicitudes de yate, reportes, RRHH).
   Cada dominio recibe tests profundos y su documentación Swagger completa
   justo antes de refactorizarlo.
4. **Fase 3** — Ajustes en el frontend (fuera de este repositorio).

Cada fase es su propio ciclo diseño → plan → implementación.

## Alcance de la Fase 0

### 1. Testing — Jest + Supertest

- `tests/` en la raíz, estructura espejo de `src/` donde aplique
  (`tests/smoke/`, `tests/setup.js`).
- `.env.test` con credenciales de una base de datos de pruebas (MySQL y Mongo
  separadas de producción, ya disponibles).
- `tests/setup.js`: conecta a la DB de pruebas, sincroniza modelos
  (`db.sync({ force: true })` **solo** cuando `NODE_ENV=test`), limpia datos
  entre suites.
- **10 smoke tests**, uno por dominio funcional (auth, catálogos, bar,
  indicadores, inventario, órdenes, guía de envío, encuestas, solicitud de
  yate, reportes/RRHH). Cada uno:
  1. Hace login real contra `/api/auth` para obtener un token.
  2. Llama 1-2 endpoints representativos del dominio (ej. `GET /api/staffs`,
     `GET /api/products`).
  3. Verifica status 200/201 y forma básica de la respuesta (no valida reglas
     de negocio profundas — eso es trabajo de la Fase 2).
- Scripts nuevos en `package.json`: `test`, `test:watch`.
- Jest corre con `--runInBand` inicialmente (una DB compartida entre tests,
  sin paralelismo, para evitar condiciones de carrera hasta que se diseñe
  aislamiton por test en fases posteriores).

### 2. Linting y formato

- ESLint (`eslint:recommended` + reglas para Node/CommonJS) y Prettier.
- Archivos: `.eslintrc.json`, `.prettierrc`, `.eslintignore` /
  `.prettierignore` (excluyendo `node_modules`, `graphify-out`, `uploads`).
- Scripts nuevos: `lint`, `lint:fix`, `format`.
- **No se reformatea el código existente en esta fase** — un diff de 219
  archivos sin cambio funcional no aporta valor y complica la revisión. El
  linter queda activo desde ahora; el código existente se limpia módulo por
  módulo en la Fase 2 a medida que se toca.

### 3. Manejo de errores centralizado

- `src/errors/AppError.js`: clase de error con `statusCode` y `message`.
- `src/middlewares/errorHandler.middleware.js`: middleware final de Express
  que captura errores no manejados y responde con formato consistente:
  `{ "error": { "message": string, "code": string } }`.
- Se registra al final de `app.js`. Es **aditivo**: no modifica los
  controladores existentes (que siguen con su propio try/catch), pero actúa
  como red de seguridad para lo que se escape, y establece el estándar de
  respuesta de error que se adoptará controlador por controlador en la Fase 2.

### 4. Validación de entorno y seguridad

- `src/config/env.js`: valida al arrancar la app que existan las variables de
  entorno requeridas (`DB_NAME`, `DB_USER`, `DB_HOST`, `DB_PORT`,
  `DB_PASSWORD`, `DB_HOST_MONGO`, `DB_USER_MONGO`, `DB_PASSWORD_MONGO`,
  `DB_NAME_MONGO`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `HASHIDS_SALT`). Si
  falta alguna, el proceso termina con un mensaje claro en vez de fallar a
  medias más adelante.
- Mover el salt hardcodeado de `Utils.js` a `process.env.HASHIDS_SALT`.
- Crear `.env.example` documentando todas las variables requeridas (sin
  valores reales) — no existe actualmente en el repo.

### 5. Limpieza de dependencias y documentación básica

- Remover `pg` y `pg-hstore` de `package.json` (confirmado sin uso en `src/`).
- Corregir `readme.md`: reemplazar las referencias a Postgres por MySQL y
  actualizar los pasos de instalación con los scripts nuevos (`test`, `lint`,
  `format`, y el nuevo endpoint de documentación Swagger).

### 6. Documentación de API — Swagger / OpenAPI

- `swagger-jsdoc` + `swagger-ui-express` como dependencias nuevas.
- `src/config/swagger.js`: configuración base (título, versión, descripción,
  `servers`, esquema de seguridad Bearer JWT para `authJwt.verifyToken`).
- Se sirve en `/api/docs`. Habilitado siempre en desarrollo/test; en
  producción solo se monta si `SWAGGER_ENABLED=true` está presente en el
  entorno (por defecto, apagado en producción).
- **No se documentan los ~150 endpoints existentes en esta fase.** Se
  documentan como referencia/patrón 2 rutas completas: `/api/auth` (login,
  representativo de un flujo sin JSDoc previo) y un dominio CRUD simple
  (`/api/companies`, como ejemplo de recurso estándar). El resto de endpoints
  se documenta módulo por módulo en la Fase 2, mismo criterio "justo a
  tiempo" que los tests profundos.

## Fuera de alcance en la Fase 0

- Romper `Utils.js` (Fase 1).
- Renombrar rutas o cambiar forma de respuestas existentes (Fase 1/2,
  coordinado con frontend).
- Reformatear código existente con Prettier/ESLint más allá de los archivos
  nuevos de esta fase.
- Documentar Swagger de todos los endpoints.
- Arreglar el bug del algoritmo JWT (`H5512`) — solo queda documentado.
- Tests de reglas de negocio profundas (cálculo de inventario, puntajes de
  encuestas, etc.) — eso llega dominio por dominio en la Fase 2.

## Riesgos y mitigaciones

- **Romper producción sin querer al tocar `app.js`/`Utils.js`.** Mitigación:
  cambios aditivos (middleware nuevo, no se quita el manejo de errores
  existente); el salt se lee de env var con el mismo valor por defecto
  documentado en `.env.example` para no invalidar IDs ya codificados en la
  base de datos existente.
- **DB de pruebas usada por error contra datos reales.** Mitigación:
  `tests/setup.js` valida `NODE_ENV=test` antes de hacer `sync({ force: true
  })`; `.env.test` nunca debe apuntar a las credenciales de producción.
- **Smoke tests frágiles por depender de datos semilla.** Mitigación: cada
  smoke test crea/limpia sus propios datos mínimos en lugar de asumir
  fixtures preexistentes.

## Criterios de éxito

- `npm test` corre 10 smoke tests contra la DB de pruebas y pasan en verde.
- `npm run lint` corre sin configuración rota (puede reportar warnings sobre
  código existente, eso es esperado y aceptado en esta fase).
- La app arranca y falla rápido con mensaje claro si falta una env var
  requerida.
- El salt de hashids ya no está hardcodeado en el código fuente.
- `pg` y `pg-hstore` ya no están en `package.json`.
- `/api/docs` sirve una página Swagger UI funcional con al menos 2 rutas de
  ejemplo documentadas.
- `readme.md` refleja correctamente MySQL y los nuevos scripts de npm.
