# Fase 2 — Dominio Catálogos: Documentation/Positions/Roles — diseño

**Fecha:** 2026-07-27
**Rama:** `refactor/fase-2-catalogs-documentation-positions-roles` (a crear)
**Estado:** Diseño aprobado, pendiente de plan de implementación

## Contexto

Fase 2, sub-proyecto Yachts/Company/Departaments (fusionado, PR #5),
retrofiteó 3 dominios más de `src/controllers/catalogs/` al patrón
`AppError`/`next(error)`. Quedaban 5 dominios sin retrofitear:
`documentation`, `houseRules`, `maintenance`, `positions`, `roles`.

Este documento cubre el **tercer sub-proyecto: Documentation + Positions +
Roles**, elegido explícitamente por el usuario dejando fuera `houseRules` y
`maintenance` para un ciclo posterior. `houseRules` y `maintenance` quedan
fuera de alcance aquí.

## Hallazgos

- **11 endpoints** en este dominio: 5 en `documentation.routes.js`, 5 en
  `positions.routes.js`, 1 en `roles.routes.js` (`roles` solo expone
  `getRoles` — no tiene create/update/delete ni "get by id"). Ninguna de las
  3 rutas tiene Swagger.
- **Mismo patrón de error legado que los 2 sub-proyectos anteriores:** los 3
  controllers usan `catch (error) { res.status(400).json(error.message) }`
  en cada handler, sin excepción.
- **Mismo bug de encoding de PK ya visto y corregido antes:**
  `getDocument`/`getPosition` hacen `result.id = Utils.encode(result.id)`,
  que es un no-op sobre una instancia Sequelize para el campo PK — el
  patrón correcto, ya aplicado en el sub-proyecto anterior, es
  `result.dataValues.id = Utils.encode(result.dataValues.id)`.
- **`getDocument`/`getPosition` no distinguen "no encontrado" de
  "encontrado":** igual que en el sub-proyecto anterior, si el id
  decodificado no existe el servicio devuelve `null` y el controller
  responde `200` con body `null`. Se adopta aquí el patrón de
  `docs/CONVENTIONS.md` (`if (!result) throw new AppError(...)`).
- **Bug encontrado: dead code roto en `positions.services.js`.**
  `getPositionsById` (líneas 28-40) usa `Op.in` pero el archivo nunca
  importa `Op` de Sequelize (mismo patrón exacto que
  `getDepartamentsById`, ya eliminado en el sub-proyecto anterior). Sin
  llamantes en todo el repo (confirmado por búsqueda) — código muerto que
  además rompería con `ReferenceError: Op is not defined` si alguna vez se
  invocara.
- **Dead code (no roto) en `documentation.services.js`.**
  `getDocumentsById` (líneas 32-46) sí importa `Op` correctamente y no
  fallaría si se llamara, pero no tiene llamantes en todo el repo.
  Confirmado con el usuario: se elimina igual, mismo criterio de "0
  llamadores = código muerto" aplicado en el sub-proyecto anterior.
- **Imports sin uso en `roles.controller.js`.** Importa `transporter`
  (`src/mails/mailer`) y `bcrypt`, ninguno usado — `RolesController` solo
  expone `getRoles`, que no envía correo ni hashea nada. Confirmado con el
  usuario: se eliminan como parte de la limpieza de este retrofit, ya que
  el archivo se toca de todas formas para el cambio de `next(error)`.
- **`createDocument`/`updateDocument` tienen lógica de negocio real y no
  trivial**, distinta a los dominios anteriores: usan una transacción
  Sequelize (`db.transaction()`) y, cuando el documento tiene `positions`
  (array de ids de `Positions` codificados, columna `JSON` en
  `Documentation`), crean o eliminan registros `StaffDocumentation`
  (`status: 'pending'`) para cada `Staff` cuyo `positionId` esté en esa
  lista. Este efecto secundario es funcionalidad ya en producción, no algo
  que se esté agregando — el retrofit debe preservarlo intacto.
- Auth (`authJwt.verifyToken`) ya está aplicado correctamente a nivel de
  montaje en `app.js` para las 3 rutas (`/api/documents`, `/api/positions`,
  `/api/roles`) — no es un hallazgo, se confirma que no hace falta tocarlo.

## Alcance de este sub-proyecto

### 1. Retrofit de manejo de errores (11 endpoints)

Mismo patrón que los 2 sub-proyectos anteriores:

```js
const AppError = require('../../errors/AppError');

const getPosition = async (req, res, next) => {
    try {
        const positionId = Utils.decode(req.params.position_id);
        const result = await PositionService.getPositionById(positionId);
        if (!result) throw new AppError('Posición no encontrada', 404);
        result.dataValues.id = Utils.encode(result.dataValues.id);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};
```

Mapeo de status codes:

| Caso | Status |
|---|---|
| `getDocument`/`getPosition`: id decodificado no existe | 404 (nuevo — antes `200` + `null`) |
| Cualquier otro error no clasificado (fallos de `decode`, fallos de DB, CRUD genérico) | 500 (vía `next(error)` sin clasificar) |

`roles` no tiene "get by id", así que su único endpoint (`getRoles`) solo
cambia de forma de error, sin nuevos status codes.

Esto cambia la forma de la respuesta de error en los 11 endpoints (string
plano → `{ "error": { "message": string, "code": string } }`) y el status
code de los 2 "get by id" cuando el recurso no existe. Mismo acuerdo que en
los sub-proyectos anteriores: es un cambio de contrato que el usuario
coordina directamente con el frontend.

### 2. Fix de `getPositionsById` (dead code roto)

Se elimina la función completa de `positions.services.js`. El archivo no
usa `Op` en ningún otro método, así que no hace falta tocar sus imports.

### 3. Eliminación de `getDocumentsById` (dead code, no roto)

Se elimina la función completa de `documentation.services.js`. El import de
`Op` (`const { Op } = require('sequelize');`) se mantiene sin cambios:
`createDocument` y `updateDocument` también usan `Op.in` (para resolver
`positionId` de staff y para localizar `StaffDocumentation` existentes), así
que sigue en uso tras el borrado de `getDocumentsById`.

### 4. Limpieza de imports sin uso en `roles.controller.js`

Se eliminan `const transporter = require('../../mails/mailer');` y `const
bcrypt = require("bcrypt");`.

### 5. Tests profundos (11 endpoints + efecto StaffDocumentation)

Carpeta nueva
`tests/domain/catalogs-documentation-positions-roles/`, un archivo por
dominio (`documentation.test.js`, `positions.test.js`, `roles.test.js`),
siguiendo el formato de `tests/domain/catalogs-yachts-company-departaments/`.
Cada endpoint recibe caso feliz con aserciones sobre los datos reales de la
respuesta, más los casos de error de negocio de la tabla de la sección 1
(404 en los 2 get-by-id con id inexistente).

Para `createDocument`/`updateDocument`, además del contrato HTTP, tests que
verifican el efecto real sobre `StaffDocumentation`:

- Crear un documento con `positions: [Utils.encode(posA.id)]` debe generar
  un `StaffDocumentation` con `status: 'pending'` para cada `Staff` cuyo
  `positionId === posA.id`.
- Actualizar un documento de `positions: [posA]` a `positions: [posB]` debe
  eliminar los `StaffDocumentation` de los staff que solo tenían `posA` y
  crear los de los staff con `posB` que no los tenían ya.

Estos tests crean `Staff` directamente con el modelo (con `positionId`
apuntando a una `Position` de fixture), usando un helper local al archivo
de test (no se agrega a `staffFixtures.js` — mismo patrón que
`createStaffWithPosition` en
`tests/domain/auth-staff-users/staff-evaluators.test.js`). Se reutilizan
`tests/helpers/testApp.js`, `tests/helpers/auth.js` y
`tests/helpers/staffFixtures.js` (`createPosition`) ya existentes.

### 6. Documentación Swagger completa

Las 11 rutas (ninguna documentada hoy) reciben bloques `@openapi`
completos: request body/params y todos los `responses`, incluyendo los
nuevos status codes de error de la sección 1.

## Fuera de alcance en este sub-proyecto

- `houseRules`, `maintenance` — quedan para un ciclo posterior de Fase 2,
  decisión explícita del usuario para este ciclo.
- El bug ya conocido y documentado en memoria (no en este spec) de que
  `result.id = Utils.encode(result.id)` sigue roto en
  `houseRules.controller.js`, `maintenance.controller.js`,
  `users.controller.js` y `auth.controller.js` — no se toca aquí, queda para
  cuando esos dominios tengan su propio ciclo.
- Reestructurar `documentation.models.js`/`positions.models.js`/
  `roles.models.js`/`staffDocumentation.models.js` o sus asociaciones.
- Cualquier cambio de ruta o de la forma de respuesta **exitosa** (solo
  cambia la forma de respuesta de **error**, más el status code de los 2
  get-by-id de la sección 1).
- Retrofit de error handling en cualquier controller fuera de
  documentation/positions/roles.
- El campo `document.positions = document.positions;` en
  `updateDocument` (línea no-op, sin efecto) — se deja tal cual, no es un
  bug funcional, solo ruido cosmético fuera del alcance de este retrofit.

## Riesgos y mitigaciones

- **El cambio de contrato de error (incluyendo los nuevos 404) rompe al
  frontend si no está coordinado.** Mitigación: mismo acuerdo que en los
  sub-proyectos anteriores — el usuario coordina el lado del frontend.
- **El efecto secundario sobre `StaffDocumentation` es el código más
  complejo tocado hasta ahora en esta serie de retrofits** (transacción +
  múltiples queries condicionales). Mitigación: se prueba explícitamente
  (sección 5) en vez de tratarlo como caja negra, para detectar cualquier
  regresión introducida por el cambio de forma de la función (de
  `(req, res)` a `(req, res, next)`) antes de mergear.
- **Tests profundos nuevos podrían exponer más bugs latentes** no
  documentados aquí. Mitigación: se reportan y se deciden caso por caso
  durante la implementación (arreglar si es trivial y aislado, documentar y
  diferir si es más grande) — mismo patrón que los sub-proyectos previos.

## Testing

- Todos los tests existentes deben seguir pasando.
- Tests nuevos por endpoint según la sección 5, incluyendo el efecto sobre
  `StaffDocumentation`.

## Criterios de éxito

- Los 11 endpoints usan `AppError`/`next(error)`, ninguno responde
  `res.status(400).json(error.message)` (string plano) en un caso de error.
- `getDocument`/`getPosition` responden `404` (no `200` + `null`) cuando el
  id decodificado no existe.
- `getPositionsById` ya no existe en `positions.services.js`.
- `getDocumentsById` ya no existe en `documentation.services.js`.
- `roles.controller.js` ya no importa `transporter` ni `bcrypt`.
- El efecto de `createDocument`/`updateDocument` sobre `StaffDocumentation`
  sigue funcionando igual que antes del retrofit, verificado por test.
- Swagger (`/api/docs`) documenta los 11 endpoints del dominio con sus
  responses de error correctos.
- `npm test` pasa en verde, incluyendo los tests nuevos de este dominio y
  todos los existentes.
- `git diff trunk --stat` no muestra cambios en controllers/rutas fuera de
  `documentation`, `positions`, `roles` (y sus archivos de test/Swagger
  asociados).
