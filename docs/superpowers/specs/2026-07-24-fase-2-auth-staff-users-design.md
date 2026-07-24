# Fase 2 — Dominio Auth/Staff/Users: diseño

**Fecha:** 2026-07-24
**Rama:** `refactor/fase-2-auth-staff-users` (a crear)
**Estado:** Diseño aprobado, pendiente de plan de implementación

## Contexto

Fase 0 (fusionada, PR #2) dejó una red de seguridad mínima y `AppError`/
`errorHandler` construidos pero sin adoptar en ningún controller. Fase 1
(fusionada, PR #3) rompió el god-file `Utils.js`, unificó sufijos de
archivo, corrigió naming interno, y documentó — sin retrofitear — el
estándar de errores en `docs/CONVENTIONS.md`.

El spec de Fase 0 define el mapa de fases y deja para Fase 2:

> Refactor por dominio (bar, catálogos, indicadores, inventario, órdenes,
> guías de envío, encuestas, solicitudes de yate, reportes, RRHH). Cada
> dominio recibe tests profundos y su documentación Swagger completa justo
> antes de refactorizarlo.

Fase 2 abarca 9 dominios independientes — demasiado grande para un solo
spec. Este documento cubre el **primer sub-proyecto: Auth + Staff + Users**
(`src/controllers/catalogs/{auth,staff,users}.controller.js`), elegido por
ser el núcleo de autenticación y gestión de personal, de alto tráfico.
Cada dominio de Fase 2 tendrá su propio ciclo diseño → plan →
implementación independiente.

## Hallazgos

- **23 endpoints** en este dominio: 6 en `auth.routes.js`, 12 en
  `staff.routes.js`, 5 en `users.routes.js`. Solo `/auth/login` tiene
  documentación Swagger (agregada en Fase 0 como ruta de referencia).
- **Manejo de errores uniforme y desactualizado:** prácticamente todos los
  endpoints usan `catch (error) { res.status(400).json(error.message) }` —
  status fijo en 400 sin importar la causa real (credenciales inválidas,
  usuario deshabilitado, recurso no encontrado, fallo de DB — todo 400), y
  el body es un string plano, no un objeto.
- **Bug conocido, documentado desde Fase 0, no corregido:** `algorithm:
  'H5512'` (typo, debería ser `'HS512'`) en
  `src/middlewares/auth.middleware.js:16,29`. Con el algoritmo incorrecto,
  `jwt.verify` probablemente falla en cada intento de verificación directa
  y el middleware cae siempre al flujo de refresh token — un fix real de
  comportamiento, no cosmético.
- **Bug nuevo encontrado en esta revisión:** `forgotPassword`
  (`auth.controller.js:76-97`) y `forgotPasswordStaff`
  (`auth.controller.js:146-167`) no envían ninguna respuesta HTTP cuando el
  email/usuario buscado no existe — el bloque `if (result) { ... }` no
  tiene `else`, así que la request queda colgada hasta timeout del cliente.
- **Segundo bug nuevo encontrado en esta revisión:** `UserService.getUserById`
  (`src/services/catalogs/users.services.js:35-51`, usado por `GET
  /users/:user_id`) selecciona `attributes: ['first_name', 'last_name',
  'email', 'active', 'role_id']` — nombres de columna snake_case, no los
  nombres de atributo camelCase que usa Sequelize en el resto del código —
  y no incluye `id` en absoluto. El controller hace `result.id =
  Utils.encode(result.id)` sobre un `id` inexistente y nunca lee
  `first_name`/`last_name`/`role_id` (que sí vienen, pero con esos nombres
  crudos). El endpoint responde datos incompletos hoy.
- **`staff.services` (`src/services/catalogs/staff.services.js`, 502
  líneas) se reimporta en 8 controllers**, 5 de ellos fuera de este dominio
  (`orders`, `evaluations`, `forms`, `yachtRequest`, `regulations`). Es un
  hallazgo de "god-node" ya documentado en el spec de Fase 0, pero
  deduplicarlo ahora tocaría dominios que todavía no tienen su propio ciclo
  de tests profundos de Fase 2 — se difiere.

## Alcance de este sub-proyecto

### 1. Retrofit de manejo de errores (los 23 endpoints)

Se adopta el patrón `AppError`/`errorHandler` (ya construidos en Fase 0) en
todo el dominio:

```js
const AppError = require('../../errors/AppError');

const login = async (req, res, next) => {
    try {
        // ...
        if (!isValid) throw new AppError('Usuario o contraseña incorrectas', 401);
        if (!result.user.active) throw new AppError('Usuario deshabilitado', 403);
        // ...
        res.status(200).json(userData);
    } catch (error) {
        next(error);
    }
};
```

Regla general: un caso de error de negocio identificable lanza
`AppError(mensaje, statusCode)` con el código HTTP correcto; cualquier otro
error (fallo de DB, excepción inesperada) simplemente hace `next(error)` —
`errorHandler` ya default-ea a 500 para cualquier error que no sea
`AppError`, así que no hace falta envolver todo en un `AppError` genérico.

Mapeo de status codes por caso de negocio identificado en el código actual:

| Caso | Status |
|---|---|
| Falta `email`/`password` en `login`/`login_staffs` | 400 |
| Credenciales inválidas | 401 |
| Usuario deshabilitado | 403 |
| Email no encontrado en `forgotPassword`/`forgotPasswordStaff` (nuevo, ver bug fix abajo) | 404 |
| Archivo faltante en `uploadImage`/`uploadStaffDocumentation` | 400 (ya existente, se convierte a `AppError`) |
| Campo `type` faltante en `uploadImage` | 400 (ya existente, se convierte a `AppError`) |
| Cualquier otro error no clasificado (CRUD de staff/users, fallos de `decode`, fallos de DB) | 500 (vía `next(error)` sin clasificar) |

Esto **cambia la forma de la respuesta de error** en los 23 endpoints: de
un string plano a `{ "error": { "message": string, "code": string } }`, y
en varios casos cambia el status code de 400 a 401/403/404/500 según
corresponda. **Confirmado con el usuario: es un cambio de contrato
coordinado directamente por él con el frontend — no requiere aprobación
adicional en este spec.**

`docs/CONVENTIONS.md` se actualiza para reflejar que el patrón real es
`next(error)` sin envolver (no el `error instanceof AppError ? error : new
AppError(...)` que documentaba como ejemplo ilustrativo) — el
`errorHandler` de Fase 0 ya maneja ambos casos correctamente.

### 2. Fix del bug `H5512` → `HS512`

En `src/middlewares/auth.middleware.js`, las 2 ocurrencias de `{
algorithm: 'H5512' }` se corrigen a `{ algorithm: 'HS512' }`. Cambio de
comportamiento real y esperado — el auth smoke test de Fase 0 (que hace
login real) debe seguir pasando, y se agregan tests específicos para el
flujo de verificación de token en este sub-proyecto.

### 3. Fix del bug de `forgotPassword`/`forgotPasswordStaff` sin respuesta

Cuando `UserService.getUserByEmail`/`Staffervice.getStaffByEmail` no
encuentra el registro, en vez de no responder nada se lanza `throw new
AppError('Usuario no encontrado', 404)`.

### 3b. Fix del bug de `UserService.getUserById`

`src/services/catalogs/users.services.js:35-51` cambia su `attributes` de
`['first_name', 'last_name', 'email', 'active', 'role_id']` a `['id',
'firstName', 'lastName', 'email', 'active', 'roleId']` (nombres de
atributo de Sequelize, no de columna). El controller `getUser` no cambia —
ya esperaba `result.id`/`result.role_id`... salvo que `role_id` (snake)
también se corrige a `roleId` en el controller para que coincida con el
attribute name correcto.

### 4. Tests profundos (23 endpoints)

Cada endpoint recibe: caso feliz con aserciones sobre los datos reales de
la respuesta (no solo `status === 200` y forma básica, como los smoke
tests de Fase 0), más los casos de error de negocio de la tabla de la
sección 1. No es cobertura exhaustiva de cada combinación de filtros —
cubre el comportamiento de negocio documentado, mismo criterio que Fase 0
aplicó a "smoke tests" pero un nivel más profundo, apropiado para el
dominio que se está refactorizando activamente.

### 5. Documentación Swagger completa

Los 22 endpoints sin documentar (todo menos `/auth/login`) reciben bloques
`@openapi` completos: request body/params, y todos los `responses`
incluyendo los nuevos status codes de error de la sección 1.

## Fuera de alcance en este sub-proyecto

- Deduplicar `staff.services` reimportado en `orders`, `evaluations`,
  `forms`, `yachtRequest`, `regulations` — son controllers de otros
  dominios sin su propio ciclo de Fase 2 todavía. Se difiere a cuando les
  toque su turno.
- Reestructurar `staff.services.js` (502 líneas) internamente más allá de
  lo que el retrofit de errores de sus llamantes requiera.
- Cualquier cambio de ruta o de la forma de respuesta **exitosa** (solo
  cambia la forma de respuesta de **error**).
- Retrofit de error handling en cualquier controller fuera de
  auth/staff/users.

## Riesgos y mitigaciones

- **El cambio de forma de respuesta de error rompe al frontend si no está
  realmente coordinado.** Mitigación: confirmado explícitamente con el
  usuario que él coordina el lado del frontend; no es responsabilidad de
  este spec/plan.
- **El fix de `H5512` rompe sesiones activas al momento del deploy** (un
  token firmado/verificado bajo el comportamiento roto podría comportarse
  distinto). Mitigación: el fix solo cambia el algoritmo usado en
  `jwt.verify`, no en `jwt.sign` (que ya firma con `'HS512'` correctamente
  en `src/utils/tokens.js`) — los tokens ya emitidos siguen siendo válidos
  bajo el algoritmo correcto; el bug actual es que la verificación
  fallaba, no que la firma fuera distinta.
- **Tests profundos nuevos podrían exponer más bugs latentes** en
  `staff.services.js`/`users.services.js` no documentados aquí. Mitigación:
  cualquier bug nuevo encontrado durante la implementación se reporta y se
  decide caso por caso (arreglar en este sub-proyecto si es trivial y
  aislado, o documentar y diferir si es más grande) — mismo patrón que el
  bug de `forgotPassword` encontrado durante este mismo diseño.

## Testing

- Todos los tests existentes de Fase 0/1 (10 smoke + unit tests) deben
  seguir pasando — son la regresión base.
- Tests nuevos por endpoint según la sección 4, usando
  `bootTestApp`/`shutdownTestApp`/`createAuthenticatedUser` de
  `tests/helpers/` (Fase 0).
- El smoke test existente `tests/smoke/auth.smoke.test.js` ("rejects an
  invalid password") verifica `expect(response.status).toBe(400)` — con el
  mapeo de la sección 1, credenciales inválidas pasan a ser 401. Este test
  se actualiza como parte de este sub-proyecto (`toBe(400)` → `toBe(401)`).
  El otro test del archivo (login exitoso) no verifica ningún caso de
  error, no necesita cambios.

## Criterios de éxito

- Los 23 endpoints usan `AppError`/`next(error)`, ninguno responde
  `res.status(400).json(error.message)` (string plano) en un caso de
  error.
- `auth.middleware.js` usa `'HS512'` en ambas verificaciones — cero
  ocurrencias de `'H5512'` en el código fuente.
- `forgotPassword`/`forgotPasswordStaff` responden 404 (no cuelgan) cuando
  el email no existe.
- Swagger (`/api/docs`) documenta los 23 endpoints del dominio con sus
  responses de error correctos.
- `npm test` pasa en verde, incluyendo los tests nuevos de este dominio y
  todos los existentes de Fase 0/1.
- `docs/CONVENTIONS.md` actualizado para reflejar el patrón real
  (`next(error)` sin envolver).
- `git diff trunk --stat` no muestra cambios en controllers/rutas fuera de
  `auth`, `staff`, `users` (y sus archivos de test/Swagger asociados).
