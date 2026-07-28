# Convenciones de interno-api

Este documento registra las convenciones establecidas en Fase 1 del refactor
(`docs/superpowers/specs/2026-07-24-fase-1-convenciones-design.md`). Aplican
a código **nuevo o tocado** de aquí en adelante — no implican un retrofit
automático del código existente.

## Flujo Git por dominio

Cada dominio o subproyecto del refactor se desarrolla en una rama propia,
creada antes de empezar a registrar cambios. El nombre sigue el patrón
`refactor/fase-<n>-<dominio>` (por ejemplo,
`refactor/fase-2-operations-coment-card`).

Los cambios se guardan en commits pequeños y coherentes por responsabilidad
(implementación, pruebas/documentación y correcciones posteriores cuando
aplique). Al terminar y verificar el dominio:

1. Publicar la rama en `origin`.
2. Abrir un pull request contra `trunk`.
3. Incluir en el PR un resumen de cambios, bugs corregidos y verificaciones
   ejecutadas.

No mezclar archivos locales o cambios ajenos al dominio en sus commits.

## Manejo de errores y respuestas HTTP

El estándar oficial usa `AppError` (`src/errors/AppError.js`) y el
middleware `errorHandler` (`src/middlewares/errorHandler.middleware.js`),
ambos construidos en Fase 0 y ya registrados en `src/app.js`.

**Antes (patrón legado, todavía presente en controllers sin refactorizar):**

```js
try {
    const result = await Service.getAll();
    res.status(200).json(result);
} catch (error) {
    res.status(400).json(error.message);
}
```

**Convención (adoptada por primera vez en Fase 2, dominio auth/staff/users):**

```js
const AppError = require('../errors/AppError');

const getAll = async (req, res, next) => {
    try {
        const result = await Service.getAll();
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const getOne = async (req, res, next) => {
    try {
        const result = await Service.getById(req.params.id);
        if (!result) throw new AppError('Recurso no encontrado', 404);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};
```

Regla: un caso de error de negocio identificable (no encontrado,
credenciales inválidas, validación de campos, etc.) lanza `new
AppError(mensaje, statusCode)` con el status HTTP correcto (400, 401, 403,
404, ...). Cualquier otro error (fallo de DB, excepción inesperada) se pasa
tal cual con `next(error)` — `errorHandler` ya default-ea a 500 para
cualquier error que no sea instancia de `AppError`, así que **no** hace
falta envolver todo en un `AppError` genérico de 400.

La respuesta de error resultante tiene esta forma:

```json
{ "error": { "message": "mensaje descriptivo", "code": "AppError" } }
```

(`code` es `'INTERNAL_ERROR'` en vez de `'AppError'` cuando el status es
500 por un error no clasificado.)

El retrofit de los controllers existentes al patrón nuevo se hace dominio
por dominio en Fase 2. Dominios ya retrofiteados: `auth`, `staff`, `users`,
`yachts`, `company`, `departaments`, `documentation`, `positions`, `roles`.
Dominios de operaciones ya retrofiteados: `comentCard`. Dominios de RRHH ya
retrofiteados: `formats` (`regulations` y `trading` quedan pendientes).

## Validación de identificadores codificados

Los parámetros de ruta que contienen IDs codificados con hashids se validan
inmediatamente después de `Utils.decode`. `decode` puede devolver `undefined`
o lanzar ante una entrada malformada; ambos casos son errores de entrada y
deben producir un `AppError` con status 400, no llegar como `undefined` a
Sequelize ni convertirse en un 500 accidental.

```js
const decodeId = (value, fieldName) => {
    let id;
    try {
        id = Utils.decode(value);
    } catch {
        throw new AppError(`${fieldName} inválido`, 400);
    }
    if (!Number.isInteger(id) || id <= 0) {
        throw new AppError(`${fieldName} inválido`, 400);
    }
    return id;
};
```

Mientras no exista un middleware compartido de parámetros, este helper puede
vivir local al controller. No agregar validación HTTP a `Utils.js`: ese módulo
se mantiene limitado a `encode`/`decode`.

## Transacciones Sequelize

Para código nuevo o tocado se prefieren las transacciones administradas:

```js
return db.transaction(async (transaction) => {
    const parent = await Parent.create(data, { transaction });
    await Child.bulkCreate(children, { transaction });
    return parent;
});
```

Sequelize hace `commit` cuando el callback termina y `rollback` cuando lanza.
Esto evita duplicar `commit`/`rollback` y, especialmente, evita el antipatrón
`throw new Error(error.message)`, que elimina el tipo, stack y metadata del
error original. Para inserts homogéneos usar `bulkCreate` en vez de un
`Promise.all(Model.create(...))`.

## Atributos de modelo y nombres de columnas

Cuando un modelo declara, por ejemplo, `options` con
`field: 'opciones'`, los payloads de `create`/`update` deben usar el nombre del
**atributo Sequelize** (`options`). El nombre físico (`opciones`) se reserva
para SQL, asociaciones antiguas o selecciones que deliberadamente preservan
un contrato de respuesta legado.

Antes de cambiar un nombre usado en `attributes`, comprobar también la forma
JSON pública: reemplazar `nombre_completo` por `fullName`, aunque ambos apunten
a la misma columna, cambia el contrato exitoso del endpoint.

## Validación de relaciones en payloads

Una foreign key válida no demuestra que el recurso pertenezca al agregado que
se está modificando. Al actualizar hijos o registrar respuestas, comprobar que
sus IDs pertenezcan al padre indicado (por ejemplo, que una pregunta enviada
pertenezca a la comment card del QR). La restricción FK solo garantiza que la
pregunta existe; sin esta validación se pueden mezclar datos entre formularios.

## Sufijo de archivos de servicios

Todo archivo en `src/services/` usa el sufijo `.services.js` (plural),
incluso cuando el servicio expone una sola función (ej.
`cruiseReportPDF.services.js`). No usar `.service.js` (singular).

## Ubicación de utilidades puras

`src/utils/Utils.js` contiene únicamente `encode`/`decode` (hashids). Toda
otra utilidad pura (sin acceso a DB, sin estado) vive en un módulo dedicado
bajo `src/utils/`, agrupado por responsabilidad:

- `src/utils/tokens.js` — generación de passwords y tokens JWT.
- `src/utils/dateFormat.js` — formateo de fechas.
- `src/utils/quantity.js` — normalización de cantidades de inventario.
- `src/utils/surveyScoring.js` — scoring de respuestas de encuestas.
- `src/utils/auth.js` — lookup de sesión en Mongo (`fetchSessionData`).

Cada módulo se exporta como objeto plano de funciones (no como clase
estática): `module.exports = { funcionA, funcionB }`.

Antes de agregar una función nueva a un módulo existente, confirmar que
pertenece a esa misma responsabilidad — si no, crear un módulo nuevo en vez
de convertir otro módulo en un nuevo god-file.
