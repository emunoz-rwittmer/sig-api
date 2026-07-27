# Fase 2 — Dominio Catálogos: Yachts/Company/Departaments — diseño

**Fecha:** 2026-07-27
**Rama:** `refactor/fase-2-catalogs-yachts-company-departaments` (a crear)
**Estado:** Diseño aprobado, pendiente de plan de implementación

## Contexto

Fase 2, sub-proyecto Auth/Staff/Users (fusionado, PR #4), retrofiteó los
primeros 3 dominios de `src/controllers/catalogs/` al patrón
`AppError`/`next(error)` documentado en `docs/CONVENTIONS.md`, con tests
profundos y Swagger completo.

`src/controllers/catalogs/` tiene 8 dominios más sin retrofitear: `company`,
`departaments`, `documentation`, `houseRules`, `maintenance`, `positions`,
`roles`, `yachts`. Es demasiado grande para un solo ciclo. Este documento
cubre el **segundo sub-proyecto: Yachts + Company + Departaments**, elegido
por ser catálogos base pequeños y muy relacionados entre sí (`Yacht`
pertenece a `Company`; `Departament` es un catálogo independiente pero del
mismo tamaño). El resto de dominios de catálogos (`documentation`,
`houseRules`, `maintenance`, `positions`, `roles`) queda para ciclos
posteriores.

## Hallazgos

- **16 endpoints** en este dominio: 5 en `yachts.routes.js`, 5 en
  `company.routes.js` (+ 1, `getCompanyByName`, no está montado en ninguna
  ruta — ver "Fuera de alcance"), 6 en `departaments.routes.js`. Solo
  `company.routes.js` tiene Swagger parcial (2 de 5 rutas, solo los `GET`).
- **Mismo patrón de error legado que Fase 2 anterior:** los 3 controllers
  usan `catch (error) { res.status(400).json(error.message) }` en cada
  handler, sin excepción.
- **Bug encontrado: dead code roto en `departaments.services.js`.**
  `getDepartamentsById` (líneas 41-53) usa `Op.in` pero el archivo nunca
  importa `Op` de Sequelize. La función no se llama desde ningún controller
  (único uso en todo el repo es su propia definición) — es código muerto
  que además rompería con `ReferenceError: Op is not defined` si alguna vez
  se invocara.
- **Bug encontrado: `createCompany` no valida archivo subido.**
  `company.controller.js:31-42` hace `req.files[0].filename` sin comprobar
  que `req.files` exista y tenga al menos un elemento. Con
  `uploadSingleImage` (multer, campo `logo`, tipo `array`), si el request no
  trae logo, `req.files` es `[]` y `req.files[0]` es `undefined` — el acceso
  a `.filename` lanza un `TypeError` crudo que hoy cae al `catch` genérico y
  responde `400` con el mensaje de error de Node, no uno controlado.
- **`getYacht`/`getCompany`/`getDepartament`/`getProcessById` no distinguen
  "no encontrado" de "encontrado":** si el `id` decodificado no existe, el
  servicio devuelve `null` y el controller responde `200` con body `null`.
  `docs/CONVENTIONS.md` ya documenta el patrón correcto (`if (!result) throw
  new AppError(...)`) pero el sub-proyecto anterior (auth/staff/users) no lo
  aplicó de forma consistente. Se adopta aquí.
- Auth (`authJwt.verifyToken`) ya está aplicado correctamente a nivel de
  montaje en `app.js` para las 3 rutas (`/api/yachts`, `/api/companies`,
  `/api/departaments`) — no es un hallazgo, se confirma que no hace falta
  tocarlo.

## Alcance de este sub-proyecto

### 1. Retrofit de manejo de errores (16 endpoints)

Mismo patrón que el sub-proyecto anterior:

```js
const AppError = require('../../errors/AppError');

const getYacht = async (req, res, next) => {
    try {
        const yachtId = Utils.decode(req.params.yacht_id);
        const result = await YachtService.getYachtById(yachtId);
        if (!result) throw new AppError('Yate no encontrado', 404);
        result.id = Utils.encode(result.id);
        result.companyId = Utils.encode(result.companyId);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};
```

Mapeo de status codes:

| Caso | Status |
|---|---|
| `getYacht`/`getCompany`/`getDepartament`/`getProcessById`: id decodificado no existe | 404 (nuevo — antes `200` + `null`) |
| `createCompany`: falta archivo de logo | 400 (nuevo, ver bug fix abajo) |
| Cualquier otro error no clasificado (fallos de `decode`, fallos de DB, CRUD genérico) | 500 (vía `next(error)` sin clasificar) |

Esto cambia la forma de la respuesta de error en los 16 endpoints (string
plano → `{ "error": { "message": string, "code": string } }`) y el status
code de los 4 "get by id" cuando el recurso no existe. Mismo acuerdo que en
el sub-proyecto anterior: es un cambio de contrato que el usuario coordina
directamente con el frontend.

### 2. Fix de `getDepartamentsById` (dead code roto)

Se elimina la función completa de `departaments.services.js` — no tiene
llamantes y no se necesita `Op` en ningún otro lugar del archivo.

### 3. Fix de `createCompany` sin validación de archivo

Se agrega, antes de acceder a `req.files[0]`:

```js
if (!req.files || req.files.length === 0) {
    throw new AppError('No se ha subido ningún archivo', 400);
}
```

Mismo mensaje que usa `staff.controller.js` para el mismo caso, por
consistencia entre dominios.

### 4. Tests profundos (16 endpoints)

Carpeta nueva `tests/domain/catalogs-yachts-company-departaments/`, un
archivo por dominio (`yachts.test.js`, `company.test.js`,
`departaments.test.js`), siguiendo el formato de
`tests/domain/auth-staff-users/`. Cada endpoint recibe caso feliz con
aserciones sobre los datos reales de la respuesta, más los casos de error
de negocio de la tabla de la sección 1 (404 en los 4 get-by-id con id
inexistente, 400 en `createCompany` sin logo). Se reutilizan
`tests/helpers/testApp.js` y `tests/helpers/auth.js`.

### 5. Documentación Swagger completa

Las 14 rutas sin documentar (todo excepto los 2 `GET` ya existentes en
`company.routes.js`) reciben bloques `@openapi` completos: request
body/params y todos los `responses`, incluyendo los nuevos status codes de
error de la sección 1.

## Fuera de alcance en este sub-proyecto

- `documentation`, `houseRules`, `maintenance`, `positions`, `roles` — quedan
  para ciclos posteriores de Fase 2.
- `CompanyService.getCompanyByName` (`company.services.js:37-52`): no tiene
  ninguna ruta que la exponga en `company.routes.js` — se deja tal cual, no
  es parte del contrato HTTP de este dominio. Si en el futuro se determina
  que es dead code real (sin llamantes en todo el repo, a diferencia de
  `getDepartamentsById` que sí se confirmó sin llamantes), se documenta en
  el próximo ciclo que toque `company.services.js`.
- Reestructurar `yacht.models.js`/`company.models.js`/`departament.models.js`
  o sus asociaciones.
- Cualquier cambio de ruta o de la forma de respuesta **exitosa** (solo
  cambia la forma de respuesta de **error**, más el status code de los 4
  get-by-id de la sección 1).
- Retrofit de error handling en cualquier controller fuera de
  yachts/company/departaments.

## Riesgos y mitigaciones

- **El cambio de contrato de error (incluyendo el nuevo 404) rompe al
  frontend si no está coordinado.** Mitigación: mismo acuerdo que en el
  sub-proyecto anterior — el usuario coordina el lado del frontend.
- **Tests profundos nuevos podrían exponer más bugs latentes** no
  documentados aquí. Mitigación: se reportan y se deciden caso por caso
  durante la implementación (arreglar si es trivial y aislado, documentar y
  diferir si es más grande) — mismo patrón que los sub-proyectos previos.

## Testing

- Todos los tests existentes deben seguir pasando, incluyendo
  `tests/smoke/companies.smoke.test.js` (`GET /api/companies` autenticado →
  `200` + array — no cambia con este retrofit, sigue devolviendo `200` para
  la lista).
- Tests nuevos por endpoint según la sección 4.

## Criterios de éxito

- Los 16 endpoints usan `AppError`/`next(error)`, ninguno responde
  `res.status(400).json(error.message)` (string plano) en un caso de error.
- `getYacht`, `getCompany`, `getDepartament`, `getProcessById` responden
  `404` (no `200` + `null`) cuando el id decodificado no existe.
- `createCompany` responde `400` con `AppError` cuando no se sube logo, no
  un `TypeError` crudo.
- `getDepartamentsById` ya no existe en `departaments.services.js`.
- Swagger (`/api/docs`) documenta los 16 endpoints del dominio con sus
  responses de error correctos.
- `npm test` pasa en verde, incluyendo los tests nuevos de este dominio y
  todos los existentes.
- `git diff trunk --stat` no muestra cambios en controllers/rutas fuera de
  `yachts`, `company`, `departaments` (y sus archivos de test/Swagger
  asociados).
