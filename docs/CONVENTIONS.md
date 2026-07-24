# Convenciones de interno-api

Este documento registra las convenciones establecidas en Fase 1 del refactor
(`docs/superpowers/specs/2026-07-24-fase-1-convenciones-design.md`). Aplican
a código **nuevo o tocado** de aquí en adelante — no implican un retrofit
automático del código existente.

## Manejo de errores y respuestas HTTP

El estándar oficial usa `AppError` (`src/errors/AppError.js`) y el
middleware `errorHandler` (`src/middlewares/errorHandler.middleware.js`),
ambos construidos en Fase 0 y ya registrados en `src/app.js`.

**Antes (patrón legado, todavía presente en la mayoría de controllers):**

```js
try {
    const result = await Service.getAll();
    res.status(200).json(result);
} catch (error) {
    res.status(400).json(error.message);
}
```

**Convención nueva (para código nuevo o tocado):**

```js
const AppError = require('../errors/AppError');

const getAll = async (req, res, next) => {
    try {
        const result = await Service.getAll();
        res.status(200).json(result);
    } catch (error) {
        next(error instanceof AppError ? error : new AppError(error.message, 400));
    }
};
```

La respuesta de error resultante tiene esta forma:

```json
{ "error": { "message": "mensaje descriptivo", "code": "AppError" } }
```

El retrofit de los controllers existentes al patrón nuevo se hace dominio
por dominio en Fase 2, no de una vez.

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
