# Fase 1 — Convenciones Compartidas: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Romper el god-file `src/utils/Utils.js` en módulos de responsabilidad única, unificar el sufijo de archivo de servicios, documentar el estándar de errores/respuestas HTTP ya construido en Fase 0, y corregir el naming interno `donwloads` → `downloads` — sin cambiar ninguna ruta, forma de respuesta, o comportamiento existente.

**Architecture:** Extracción mecánica de código (copy + eliminar + actualizar imports), cero reescritura de lógica. `Utils.js` termina conteniendo únicamente `encode`/`decode`. Cuatro módulos nuevos en `src/utils/` (`tokens.js`, `dateFormat.js`, `quantity.js`, `surveyScoring.js`) asumen el resto. Cada módulo nuevo se exporta como objeto plano de funciones (mismo patrón que el `src/utils/auth.js` ya existente en el repo), no como clase estática.

**Tech Stack:** Node.js, Express 4 (CommonJS), Jest + Supertest (suite existente de Fase 0 como red de regresión).

## Global Constraints

- Branch: `refactor/fase-1-convenciones`, creada desde `trunk` (que ya incluye Fase 0 fusionada).
- Cero cambios de ruta, forma de respuesta HTTP, o comportamiento de negocio en esta fase.
- No se retrofitea `AppError`/`errorHandler` en ningún controller existente — solo se documenta el estándar.
- `Utils.encode`/`Utils.decode` no se mueven de `Utils.js`.
- No se toca el bug `algorithm: 'H5512'` en `src/middlewares/auth.middleware.js` — ese archivo solo recibe el cambio de import de `generateAccessToken`.
- CommonJS (`require`/`module.exports`) en todo el código nuevo — sin ESM.
- Windows + Git Bash / PowerShell — sin sintaxis de shell exclusiva de POSIX.
- Cada task termina con `npm test` en verde antes de commitear — es la señal de "no rompí nada" para los renames/moves mecánicos.

---

### Task 1: Extraer generación de passwords/tokens a `src/utils/tokens.js`

**Files:**
- Create: `src/utils/tokens.js`
- Create: `tests/unit/utils/tokens.test.js`
- Modify: `src/utils/Utils.js` (eliminar `getPasswordRandom`, `generateAccessToken`, `generateRefreshToken`, `getSessionRandom`)
- Modify: `src/controllers/catalogs/auth.controller.js`
- Modify: `src/controllers/catalogs/staff.controller.js`
- Modify: `src/controllers/catalogs/users.controller.js`
- Modify: `src/middlewares/auth.middleware.js`

**Interfaces:**
- Produces: `src/utils/tokens.js` exporta `{ getPasswordRandom, generateAccessToken, generateRefreshToken, getSessionRandom }` — mismas firmas que los métodos eliminados de `Utils`.

- [ ] **Step 1: Escribir el test que falla**

Crear `tests/unit/utils/tokens.test.js`:

```js
require('dotenv').config({ path: '.env.test' });
const jwt = require('jsonwebtoken');
const Tokens = require('../../../src/utils/tokens');

describe('tokens utils', () => {
    it('getPasswordRandom devuelve un string de 6 caracteres', () => {
        const pwd = Tokens.getPasswordRandom();
        expect(typeof pwd).toBe('string');
        expect(pwd).toHaveLength(6);
    });

    it('getSessionRandom devuelve un string de 6 caracteres', () => {
        const session = Tokens.getSessionRandom();
        expect(typeof session).toBe('string');
        expect(session).toHaveLength(6);
    });

    it('generateAccessToken firma un JWT HS512 verificable con JWT_SECRET', () => {
        const token = Tokens.generateAccessToken({ id: 1 });
        const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS512'] });
        expect(decoded.id).toBe(1);
    });

    it('generateRefreshToken firma un JWT HS512 verificable con JWT_REFRESH_SECRET', () => {
        const token = Tokens.generateRefreshToken({ id: 2 });
        const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET, { algorithms: ['HS512'] });
        expect(decoded.id).toBe(2);
    });
});
```

- [ ] **Step 2: Correr el test y confirmar que falla**

Run: `npm test -- tests/unit/utils/tokens.test.js`
Expected: FAIL con "Cannot find module '../../../src/utils/tokens'"

- [ ] **Step 3: Crear `src/utils/tokens.js`**

```js
const jwt = require('jsonwebtoken');

function getPasswordRandom() {
    const characters = "ABCDEFGHJKMNOPQRSTUVWXYZabcdefghjkmnopqrstuvwxyz!%?+{}1234567890";
    const length = 6;
    let randomString = "";

    for (let i = 0; i < length; i++) {
        const randomNum = Math.floor(Math.random() * characters.length);
        randomString += characters[randomNum];
    }
    return randomString;
}

function generateAccessToken(data) {
    const token = jwt.sign(data, process.env.JWT_SECRET, {
        expiresIn: "10h",
        algorithm: "HS512",
    });
    return token;
}

function generateRefreshToken(data) {
    const token = jwt.sign(data, process.env.JWT_REFRESH_SECRET, {
        expiresIn: "10h",
        algorithm: "HS512",
    });
    return token;
}

function getSessionRandom() {
    const characters = "ABCDEFGHJKMNOPQRSTUVWXYZabcdefghjkmnopqrstuvwxyz!%?+{}1234567890";
    const length = 6;
    let randomString = "";

    for (let i = 0; i < length; i++) {
        const randomNum = Math.floor(Math.random() * characters.length);
        randomString += characters[randomNum];
    }
    return randomString;
}

module.exports = { getPasswordRandom, generateAccessToken, generateRefreshToken, getSessionRandom };
```

- [ ] **Step 4: Correr el test y confirmar que pasa**

Run: `npm test -- tests/unit/utils/tokens.test.js`
Expected: PASS (4 tests)

- [ ] **Step 5: Eliminar los 4 métodos de `src/utils/Utils.js`**

`src/utils/Utils.js` actual (líneas 1-166) tiene esta forma:

```js
const Hashids = require('hashids/cjs')
const jwt = require('jsonwebtoken');
const numberKeys = 10;

class Utils {
  static encode(text) { ... }
  static decode(text) { ... }
  static getPasswordRandom() { ... }
  static generateAccessToken(data) { ... }
  static generateRefreshToken(data) { ... }
  static getSessionRandom() { ... }
  static formatDateToLocal(date) { ... }
  static formatMonthYear(dateValue) { ... }
  static asignarPuntaje(respuesta) { ... }
  static normalizeQuantity(product, quantity) { ... }
  static viewCorrectQuantity(product, quantity) { ... }
}
module.exports = Utils;
```

Eliminar los métodos `getPasswordRandom`, `generateAccessToken`, `generateRefreshToken`, `getSessionRandom` completos (con sus cuerpos). El import `const jwt = require('jsonwebtoken');` en la línea 2 se elimina también — ya no se usa en `Utils.js` después de este cambio (solo lo usaban `generateAccessToken`/`generateRefreshToken`). El archivo resultante debe empezar así:

```js
const Hashids = require('hashids/cjs')
const numberKeys = 10;

class Utils {
  static encode(text) {
    const hashids = new Hashids(process.env.HASHIDS_SALT, numberKeys);
    const id = hashids.encode(text);
    return id;
  }

  static decode(text) {
    const hashids = new Hashids(process.env.HASHIDS_SALT, numberKeys);
    const id = hashids.decode(text);
    return id[0];
  }

  static formatDateToLocal(date) {
```

(el resto de `formatDateToLocal` en adelante se queda igual por ahora — se elimina en Tasks 2-4)

- [ ] **Step 6: Actualizar `src/controllers/catalogs/auth.controller.js`**

Este archivo usa `Utils.encode`/`Utils.decode` extensamente — el import `const Utils = require('../../utils/Utils');` (línea 3) **se queda**. Agregar debajo de esa línea:

```js
const Tokens = require('../../utils/tokens');
```

Reemplazar (4 identificadores, 8 ocurrencias en total):
- `Utils.getSessionRandom()` → `Tokens.getSessionRandom()` (2 ocurrencias: líneas ~31 y ~122)
- `Utils.generateAccessToken(` → `Tokens.generateAccessToken(` (2 ocurrencias: líneas ~38 y ~123)
- `Utils.generateRefreshToken(` → `Tokens.generateRefreshToken(` (2 ocurrencias: líneas ~39 y ~124)
- `Utils.getPasswordRandom()` → `Tokens.getPasswordRandom()` (2 ocurrencias: líneas ~78 y ~148)

No tocar ninguna otra línea (los `Utils.encode`/`Utils.decode` se quedan como están).

- [ ] **Step 7: Actualizar `src/controllers/catalogs/staff.controller.js`**

Este archivo usa `Utils.encode`/`Utils.decode` extensamente — el import de `Utils` **se queda**. Agregar:

```js
const Tokens = require('../../utils/tokens');
```

Reemplazar la única ocurrencia:
- `Utils.getPasswordRandom()` → `Tokens.getPasswordRandom()` (línea ~69)

- [ ] **Step 8: Actualizar `src/controllers/catalogs/users.controller.js`**

Mismo patrón — el import de `Utils` se queda (usa `Utils.encode`/`Utils.decode`). Agregar:

```js
const Tokens = require('../../utils/tokens');
```

Reemplazar la única ocurrencia:
- `Utils.getPasswordRandom()` → `Tokens.getPasswordRandom()` (línea ~39)

- [ ] **Step 9: Actualizar `src/middlewares/auth.middleware.js`**

Este archivo **no** usa `Utils.encode`/`Utils.decode` — solo `Utils.generateAccessToken`. Reemplazar la línea de import:

```js
const Utils = require('../utils/Utils');
```

por:

```js
const Tokens = require('../utils/tokens');
```

Y reemplazar la única ocurrencia:
- `Utils.generateAccessToken({` → `Tokens.generateAccessToken({` (línea ~28)

No tocar la línea `{ algorithm: 'H5512' }` (aparece 2 veces en este archivo) — el bug queda documentado, no corregido, en esta fase.

- [ ] **Step 10: Correr la suite completa**

Run: `npm test`
Expected: Todos los tests (10 smoke + unit tests existentes + los 4 nuevos de `tokens.test.js`) PASS. El auth smoke test en particular ejercita `generateAccessToken`/`generateRefreshToken` end-to-end vía login real.

- [ ] **Step 11: Commit**

```bash
git add src/utils/tokens.js tests/unit/utils/tokens.test.js src/utils/Utils.js src/controllers/catalogs/auth.controller.js src/controllers/catalogs/staff.controller.js src/controllers/catalogs/users.controller.js src/middlewares/auth.middleware.js
git commit -m "refactor: extraer generación de passwords/tokens a src/utils/tokens.js"
```

---

### Task 2: Extraer formateo de fechas a `src/utils/dateFormat.js`

**Files:**
- Create: `src/utils/dateFormat.js`
- Create: `tests/unit/utils/dateFormat.test.js`
- Modify: `src/utils/Utils.js` (eliminar `formatDateToLocal`, `formatMonthYear`)
- Modify: `src/services/bar/cruiseReportPDF.service.js`
- Modify: `src/services/operations/shippingGuide/pdfService.js`
- Modify: `src/controllers/reports/generateGeneralReportEvaluations.js`
- Modify: `src/controllers/reports/generateReportComentCards.js`
- Modify: `src/controllers/reports/generateTransactionsExcel.js`
- Modify: `src/controllers/reports/generatReportEvaluationsByEmployed.js`

**Interfaces:**
- Produces: `src/utils/dateFormat.js` exporta `{ formatDateToLocal, formatMonthYear }` — mismas firmas que los métodos eliminados de `Utils`.

- [ ] **Step 1: Escribir el test que falla**

Crear `tests/unit/utils/dateFormat.test.js`:

```js
const DateFormat = require('../../../src/utils/dateFormat');

describe('dateFormat utils', () => {
    it('formatDateToLocal formatea una fecha como D/M/YYYY', () => {
        expect(DateFormat.formatDateToLocal('2026-03-05')).toBe('5/3/2026');
    });

    it('formatMonthYear formatea una fecha como "D de mes del YYYY"', () => {
        expect(DateFormat.formatMonthYear('2026-03-05')).toBe('05 de marzo del 2026');
    });

    it('formatMonthYear devuelve string vacío si no hay fecha', () => {
        expect(DateFormat.formatMonthYear(null)).toBe('');
        expect(DateFormat.formatMonthYear(undefined)).toBe('');
    });
});
```

- [ ] **Step 2: Correr el test y confirmar que falla**

Run: `npm test -- tests/unit/utils/dateFormat.test.js`
Expected: FAIL con "Cannot find module '../../../src/utils/dateFormat'"

- [ ] **Step 3: Crear `src/utils/dateFormat.js`**

```js
function formatDateToLocal(date) {
    const formattedDate = new Date(date);
    const day = formattedDate.getDate();
    const month = formattedDate.getMonth() + 1; // Los meses empiezan desde 0
    const year = formattedDate.getFullYear();
    return `${day}/${month}/${year}`;
}

function formatMonthYear(dateValue) {
    if (!dateValue) return '';

    const value = String(dateValue);
    const datePart = value.split(' ')[0]?.split('T')[0];
    if (!datePart) return '';

    const [year, month, day] = datePart.split('-').map(Number);
    if (!year || !month || !day) return '';

    const d = new Date(year, month - 1, day);
    const dayStr = String(d.getDate()).padStart(2, '0');
    const monthNames = [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];
    const monthStr = monthNames[d.getMonth()];
    const yearStr = d.getFullYear();

    return `${dayStr} de ${monthStr} del ${yearStr}`;
}

module.exports = { formatDateToLocal, formatMonthYear };
```

- [ ] **Step 4: Correr el test y confirmar que pasa**

Run: `npm test -- tests/unit/utils/dateFormat.test.js`
Expected: PASS (3 tests)

- [ ] **Step 5: Eliminar `formatDateToLocal` y `formatMonthYear` de `src/utils/Utils.js`**

Eliminar ambos métodos completos (con sus cuerpos) de la clase `Utils`. El archivo queda con `encode`, `decode`, `asignarPuntaje`, `normalizeQuantity`, `viewCorrectQuantity` (estos 3 últimos se eliminan en Tasks 3-4).

- [ ] **Step 6: Actualizar `src/services/bar/cruiseReportPDF.service.js`**

Este archivo no usa `Utils.encode`/`Utils.decode` — el import de `Utils` se elimina por completo. Reemplazar:

```js
const Utils = require('../../utils/Utils');
```

por:

```js
const DateFormat = require('../../utils/dateFormat');
```

Reemplazar las 4 ocurrencias de `Utils.formatDateToLocal(` por `DateFormat.formatDateToLocal(` (líneas 43, 44, 224, 283).

- [ ] **Step 7: Actualizar `src/services/operations/shippingGuide/pdfService.js`**

Este archivo no usa `Utils.encode`/`Utils.decode` — el import de `Utils` se elimina por completo. Reemplazar:

```js
const Utils = require('../../../utils/Utils');
```

por:

```js
const DateFormat = require('../../../utils/dateFormat');
```

Reemplazar las 2 ocurrencias de `Utils.formatMonthYear(` por `DateFormat.formatMonthYear(`.

- [ ] **Step 8: Actualizar `src/controllers/reports/generateGeneralReportEvaluations.js`**

Este archivo usa `Utils.decode` (línea 17) y `Utils.asignarPuntaje` (línea 157) además del `formatDateToLocal` destructurado — el import completo de `Utils` (línea 6, `const Utils = require('../../utils/Utils');`) **se queda** (se usa para `decode`; `asignarPuntaje` se actualiza en Task 4). Reemplazar solo la línea 4:

```js
const { formatDateToLocal } = require('../../utils/Utils');
```

por:

```js
const { formatDateToLocal } = require('../../utils/dateFormat');
```

No tocar ninguna otra línea — `formatDateToLocal(...)` se sigue llamando igual (import destructurado, mismo nombre).

- [ ] **Step 9: Actualizar `src/controllers/reports/generateReportComentCards.js`**

Este archivo usa `Utils.decode` (línea 17) además del `formatDateToLocal` destructurado — el import completo `const Utils = require("../../utils/Utils");` (línea 6) **se queda**. Reemplazar solo la línea 4:

```js
const { formatDateToLocal } = require('../../utils/Utils');
```

por:

```js
const { formatDateToLocal } = require('../../utils/dateFormat');
```

- [ ] **Step 10: Actualizar `src/controllers/reports/generateTransactionsExcel.js`**

Este archivo usa `Utils.decode` (línea 16) además del `formatDateToLocal` destructurado — el import completo `const Utils = require("../../utils/Utils");` (línea 3) **se queda**. Reemplazar solo la línea 2:

```js
const { formatDateToLocal } = require("../../utils/Utils");
```

por:

```js
const { formatDateToLocal } = require("../../utils/dateFormat");
```

- [ ] **Step 11: Actualizar `src/controllers/reports/generatReportEvaluationsByEmployed.js`**

Este archivo **no** tiene ningún otro uso de `Utils` — solo el `formatDateToLocal` destructurado (línea 3). Reemplazar:

```js
const { formatDateToLocal } = require('../../utils/Utils');
```

por:

```js
const { formatDateToLocal } = require('../../utils/dateFormat');
```

- [ ] **Step 12: Correr la suite completa**

Run: `npm test`
Expected: Todos los tests PASS, incluyendo los 3 nuevos de `dateFormat.test.js`.

- [ ] **Step 13: Commit**

```bash
git add src/utils/dateFormat.js tests/unit/utils/dateFormat.test.js src/utils/Utils.js src/services/bar/cruiseReportPDF.service.js src/services/operations/shippingGuide/pdfService.js src/controllers/reports/generateGeneralReportEvaluations.js src/controllers/reports/generateReportComentCards.js src/controllers/reports/generateTransactionsExcel.js src/controllers/reports/generatReportEvaluationsByEmployed.js
git commit -m "refactor: extraer formateo de fechas a src/utils/dateFormat.js"
```

---

### Task 3: Extraer normalización de cantidades a `src/utils/quantity.js`

**Files:**
- Create: `src/utils/quantity.js`
- Create: `tests/unit/utils/quantity.test.js`
- Modify: `src/utils/Utils.js` (eliminar `normalizeQuantity`, `viewCorrectQuantity`)
- Modify: `src/services/operations/inventory/products.services.js`
- Modify: `src/services/operations/inventory/transactions.services.js`
- Modify: `src/controllers/operations/inventory/products.controller.js`
- Modify: `src/controllers/operations/inventory/warehouse.controller.js`
- Modify: `src/controllers/operations/yachtRequest/yachtRequest.controller.js`

**Interfaces:**
- Produces: `src/utils/quantity.js` exporta `{ normalizeQuantity, viewCorrectQuantity }` — mismas firmas que los métodos eliminados de `Utils`.

- [ ] **Step 1: Escribir el test que falla**

Crear `tests/unit/utils/quantity.test.js`:

```js
const Quantity = require('../../../src/utils/quantity');

describe('quantity utils', () => {
    describe('normalizeQuantity', () => {
        it('multiplica por presentationQuantity para productos CONSUMABLE', () => {
            const product = { type: 'CONSUMABLE', presentationQuantity: 12, name: 'Cerveza' };
            expect(Quantity.normalizeQuantity(product, 2)).toBe(24);
        });

        it('devuelve el número tal cual para productos DISCRETE', () => {
            const product = { type: 'DISCRETE', name: 'Silla' };
            expect(Quantity.normalizeQuantity(product, '5')).toBe(5);
        });

        it('lanza error si el producto CONSUMABLE no tiene presentationQuantity', () => {
            const product = { type: 'CONSUMABLE', name: 'Cerveza' };
            expect(() => Quantity.normalizeQuantity(product, 2)).toThrow('sin presentationQuantity');
        });
    });

    describe('viewCorrectQuantity', () => {
        it('divide por presentationQuantity para productos CONSUMABLE', () => {
            const product = { type: 'CONSUMABLE', presentationQuantity: 12, name: 'Cerveza' };
            expect(Quantity.viewCorrectQuantity(product, 24)).toBe('2.00');
        });

        it('devuelve la cantidad tal cual para productos DISCRETE', () => {
            const product = { type: 'DISCRETE', name: 'Silla' };
            expect(Quantity.viewCorrectQuantity(product, 5)).toBe(5);
        });

        it('lanza error si el producto CONSUMABLE no tiene presentationQuantity', () => {
            const product = { type: 'CONSUMABLE', name: 'Cerveza' };
            expect(() => Quantity.viewCorrectQuantity(product, 24)).toThrow('sin presentationQuantity');
        });
    });
});
```

- [ ] **Step 2: Correr el test y confirmar que falla**

Run: `npm test -- tests/unit/utils/quantity.test.js`
Expected: FAIL con "Cannot find module '../../../src/utils/quantity'"

- [ ] **Step 3: Crear `src/utils/quantity.js`**

```js
function normalizeQuantity(product, quantity) {
    if (product?.type === 'CONSUMABLE') {
        if (!product.presentationQuantity) {
            throw new Error(`Producto ${product.name} sin presentationQuantity`);
        }

        const qty = Number(quantity);
        const presentation = Number(product.presentationQuantity);

        const result = qty * presentation;
        return Math.round(result * 100) / 100;
    }

    // DISCRETE
    return Number(quantity);
}

function viewCorrectQuantity(product, quantity) {
    if (product?.type === 'CONSUMABLE') {
        if (!product?.presentationQuantity) {
            throw new Error(`Producto ${product?.name} sin presentationQuantity`);
        }

        return (quantity / product?.presentationQuantity).toFixed(2);
    }

    return quantity;
}

module.exports = { normalizeQuantity, viewCorrectQuantity };
```

- [ ] **Step 4: Correr el test y confirmar que pasa**

Run: `npm test -- tests/unit/utils/quantity.test.js`
Expected: PASS (6 tests)

- [ ] **Step 5: Eliminar `normalizeQuantity` y `viewCorrectQuantity` de `src/utils/Utils.js`**

Eliminar ambos métodos completos. El archivo queda con `encode`, `decode`, `asignarPuntaje` (este último se elimina en Task 4).

- [ ] **Step 6: Actualizar `src/services/operations/inventory/products.services.js`**

Este archivo no usa `Utils.encode`/`Utils.decode` — el import de `Utils` (línea 10) se elimina por completo. Reemplazar:

```js
const Utils = require('../../../utils/Utils');
```

por:

```js
const Quantity = require('../../../utils/quantity');
```

Reemplazar:
- `Utils.normalizeQuantity(` → `Quantity.normalizeQuantity(` (línea ~304)
- `Utils.viewCorrectQuantity(` → `Quantity.viewCorrectQuantity(` (línea ~318)

- [ ] **Step 7: Actualizar `src/services/operations/inventory/transactions.services.js`**

Este archivo no usa `Utils.encode`/`Utils.decode` — el import de `Utils` (línea 7) se elimina por completo. Reemplazar:

```js
const Utils = require('../../../utils/Utils');
```

por:

```js
const Quantity = require('../../../utils/quantity');
```

Reemplazar las 4 ocurrencias de `Utils.normalizeQuantity(` por `Quantity.normalizeQuantity(` (líneas ~54, ~197, ~224, ~316).

- [ ] **Step 8: Actualizar `src/controllers/operations/inventory/products.controller.js`**

Este archivo usa `Utils.encode`/`Utils.decode` extensamente — el import de `Utils` (línea 2) **se queda**. Agregar:

```js
const Quantity = require('../../../utils/quantity');
```

Reemplazar las 2 ocurrencias:
- `Utils.viewCorrectQuantity(x.product, x.quantity)` → `Quantity.viewCorrectQuantity(x.product, x.quantity)` (línea ~59)
- `Utils.viewCorrectQuantity(x.product, x.totalBarConsumption)` → `Quantity.viewCorrectQuantity(x.product, x.totalBarConsumption)` (línea ~60)

- [ ] **Step 9: Actualizar `src/controllers/operations/inventory/warehouse.controller.js`**

Este archivo usa `Utils.encode`/`Utils.decode` — el import de `Utils` (línea 4) **se queda**. Agregar:

```js
const Quantity = require('../../../utils/quantity');
```

Reemplazar la única ocurrencia:
- `Utils.viewCorrectQuantity(result.product, result.quantity)` → `Quantity.viewCorrectQuantity(result.product, result.quantity)` (línea ~60)

- [ ] **Step 10: Actualizar `src/controllers/operations/yachtRequest/yachtRequest.controller.js`**

Este archivo usa `Utils.encode`/`Utils.decode` — el import de `Utils` (línea 6) **se queda**. Agregar:

```js
const Quantity = require('../../../utils/quantity');
```

Reemplazar la única ocurrencia:
- `Utils.viewCorrectQuantity(x.configuracion?.product, x.stock)` → `Quantity.viewCorrectQuantity(x.configuracion?.product, x.stock)` (línea ~31)

- [ ] **Step 11: Correr la suite completa**

Run: `npm test`
Expected: Todos los tests PASS, incluyendo los 6 nuevos de `quantity.test.js`. El smoke test de `warehouse` en particular ejercita `viewCorrectQuantity` end-to-end.

- [ ] **Step 12: Commit**

```bash
git add src/utils/quantity.js tests/unit/utils/quantity.test.js src/utils/Utils.js src/services/operations/inventory/products.services.js src/services/operations/inventory/transactions.services.js src/controllers/operations/inventory/products.controller.js src/controllers/operations/inventory/warehouse.controller.js src/controllers/operations/yachtRequest/yachtRequest.controller.js
git commit -m "refactor: extraer normalización de cantidades a src/utils/quantity.js"
```

---

### Task 4: Extraer scoring de encuestas a `src/utils/surveyScoring.js`

**Files:**
- Create: `src/utils/surveyScoring.js`
- Create: `tests/unit/utils/surveyScoring.test.js`
- Modify: `src/utils/Utils.js` (eliminar `asignarPuntaje`; el archivo queda solo con `encode`/`decode`)
- Modify: `src/controllers/reports/generateGeneralReportEvaluations.js`

**Interfaces:**
- Produces: `src/utils/surveyScoring.js` exporta `{ asignarPuntaje }` — misma firma que el método eliminado de `Utils`.

- [ ] **Step 1: Escribir el test que falla**

Crear `tests/unit/utils/surveyScoring.test.js`:

```js
const SurveyScoring = require('../../../src/utils/surveyScoring');

describe('surveyScoring utils', () => {
    it('reconoce un número solo (1-5)', () => {
        expect(SurveyScoring.asignarPuntaje('3')).toBe(3);
    });

    it('reconoce un número entre paréntesis al final', () => {
        expect(SurveyScoring.asignarPuntaje('Muy bueno (4)')).toBe(4);
    });

    it('reconoce texto mapeado a puntaje', () => {
        expect(SurveyScoring.asignarPuntaje('Excelente')).toBe(5);
        expect(SurveyScoring.asignarPuntaje('Regular')).toBe(2);
    });

    it('devuelve el texto original si no matchea ningún patrón', () => {
        expect(SurveyScoring.asignarPuntaje('Respuesta libre')).toBe('Respuesta libre');
    });

    it('devuelve null para input no-string o vacío', () => {
        expect(SurveyScoring.asignarPuntaje(null)).toBeNull();
        expect(SurveyScoring.asignarPuntaje(undefined)).toBeNull();
    });
});
```

- [ ] **Step 2: Correr el test y confirmar que falla**

Run: `npm test -- tests/unit/utils/surveyScoring.test.js`
Expected: FAIL con "Cannot find module '../../../src/utils/surveyScoring'"

- [ ] **Step 3: Crear `src/utils/surveyScoring.js`**

```js
function asignarPuntaje(respuesta) {
    if (!respuesta || typeof respuesta !== 'string') return null;

    const texto = respuesta.trim();

    const textoLimpio = texto
        .replace(/[✅✔️☑️]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    const soloNumero = textoLimpio.match(/^[1-5]$/);
    if (soloNumero) {
        return Number(soloNumero[0]);
    }

    const numeroEnParentesis = textoLimpio.match(/\(([1-5])\)\s*$/);
    if (numeroEnParentesis) {
        return Number(numeroEnParentesis[1]);
    }

    const numeroAntesParentesis = textoLimpio.match(/\b([1-5])\s*\(/);
    if (numeroAntesParentesis) {
        return Number(numeroAntesParentesis[1]);
    }

    const numeroAlInicio = textoLimpio.match(/^([1-5])\b/);
    if (numeroAlInicio) {
        return Number(numeroAlInicio[1]);
    }

    const puntajes = {
        5: ['Casi siempre', 'Excelente', 'Siempre'],
        4: ['Con frecuencia', 'Muy bueno', 'Muy Bueno'],
        3: ['Mas o menos', 'Más o menos', 'Bueno'],
        2: ['A veces', 'Regular'],
        1: ['Casi nunca', 'Ineficiente']
    };

    for (const [puntos, respuestas] of Object.entries(puntajes)) {
        if (respuestas.includes(textoLimpio)) {
            return Number(puntos);
        }
    }

    return texto;
}

module.exports = { asignarPuntaje };
```

- [ ] **Step 4: Correr el test y confirmar que pasa**

Run: `npm test -- tests/unit/utils/surveyScoring.test.js`
Expected: PASS (5 tests)

- [ ] **Step 5: Eliminar `asignarPuntaje` de `src/utils/Utils.js` y verificar el estado final del archivo**

Eliminar el método completo. `src/utils/Utils.js` debe quedar así en su totalidad:

```js
const Hashids = require('hashids/cjs')
const numberKeys = 10;

class Utils {
  static encode(text) {
    const hashids = new Hashids(process.env.HASHIDS_SALT, numberKeys);
    const id = hashids.encode(text);
    return id;
  }

  static decode(text) {
    const hashids = new Hashids(process.env.HASHIDS_SALT, numberKeys);
    const id = hashids.decode(text);
    return id[0];
  }
}
module.exports = Utils;
```

- [ ] **Step 6: Actualizar `src/controllers/reports/generateGeneralReportEvaluations.js`**

Este archivo usa `Utils.decode` (línea 17) — el import completo de `Utils` (línea 6, `const Utils = require('../../utils/Utils');`) **se queda**. Agregar:

```js
const SurveyScoring = require('../../utils/surveyScoring');
```

Reemplazar la única ocurrencia:
- `Utils.asignarPuntaje(r.answer)` → `SurveyScoring.asignarPuntaje(r.answer)` (línea ~157)

- [ ] **Step 7: Correr la suite completa**

Run: `npm test`
Expected: Todos los tests PASS, incluyendo los 5 nuevos de `surveyScoring.test.js`.

- [ ] **Step 8: Commit**

```bash
git add src/utils/surveyScoring.js tests/unit/utils/surveyScoring.test.js src/utils/Utils.js src/controllers/reports/generateGeneralReportEvaluations.js
git commit -m "refactor: extraer scoring de encuestas a src/utils/surveyScoring.js"
```

---

### Task 5: Unificar sufijo de archivos de servicios (`.service.js` → `.services.js`)

**Files:**
- Rename: `src/services/bar/consumerCardReportExcel.service.js` → `consumerCardReportExcel.services.js`
- Rename: `src/services/bar/cruiseReportExcel.service.js` → `cruiseReportExcel.services.js`
- Rename: `src/services/bar/cruiseReportPDF.service.js` → `cruiseReportPDF.services.js`
- Rename: `src/services/bar/passengerInvoicePDF.service.js` → `passengerInvoicePDF.services.js`
- Modify: `src/controllers/bar/consumerCard.controller.js`
- Modify: `src/controllers/bar/cruise.controller.js`

**Interfaces:** ninguna (rename puro, mismas exportaciones).

- [ ] **Step 1: Renombrar los 4 archivos**

```bash
git mv src/services/bar/consumerCardReportExcel.service.js src/services/bar/consumerCardReportExcel.services.js
git mv src/services/bar/cruiseReportExcel.service.js src/services/bar/cruiseReportExcel.services.js
git mv src/services/bar/cruiseReportPDF.service.js src/services/bar/cruiseReportPDF.services.js
git mv src/services/bar/passengerInvoicePDF.service.js src/services/bar/passengerInvoicePDF.services.js
```

- [ ] **Step 2: Actualizar `src/controllers/bar/consumerCard.controller.js`**

Reemplazar las 2 líneas de import:

```js
const { passengerInvoicePDF } = require('../../services/bar/passengerInvoicePDF.service');
```
```js
const { generateConsumerCardReportExcel } = require('../../services/bar/consumerCardReportExcel.service');
```

por:

```js
const { passengerInvoicePDF } = require('../../services/bar/passengerInvoicePDF.services');
```
```js
const { generateConsumerCardReportExcel } = require('../../services/bar/consumerCardReportExcel.services');
```

- [ ] **Step 3: Actualizar `src/controllers/bar/cruise.controller.js`**

Reemplazar las 2 líneas de import:

```js
const CruiseReportExcelService = require('../../services/bar/cruiseReportExcel.service');
const CruiseReportPDFService = require('../../services/bar/cruiseReportPDF.service');
```

por:

```js
const CruiseReportExcelService = require('../../services/bar/cruiseReportExcel.services');
const CruiseReportPDFService = require('../../services/bar/cruiseReportPDF.services');
```

- [ ] **Step 4: Verificar que no queda ningún archivo `.service.js`**

Run: `find src/services -iname "*.service.js"`
Expected: sin output (ningún archivo con ese sufijo)

- [ ] **Step 5: Correr la suite completa**

Run: `npm test`
Expected: Todos los tests PASS (el smoke test de `bar` ejercita `cruise.controller.js`).

- [ ] **Step 6: Commit**

```bash
git add src/services/bar/consumerCardReportExcel.services.js src/services/bar/cruiseReportExcel.services.js src/services/bar/cruiseReportPDF.services.js src/services/bar/passengerInvoicePDF.services.js src/controllers/bar/consumerCard.controller.js src/controllers/bar/cruise.controller.js
git commit -m "chore: unificar sufijo de servicios a .services.js"
```

---

### Task 6: Corregir naming interno `donwloads` → `downloads`

**Files:**
- Rename: `src/controllers/donwloads/donwloads.controller.js` → `src/controllers/downloads/downloads.controller.js`
- Rename: `src/routes/donwloads/donwloads.routes.js` → `src/routes/downloads/downloads.routes.js`
- Modify: `src/routes/index.js`

**Interfaces:** ninguna (naming interno puro — la URL pública `/api/downloads` no cambia).

- [ ] **Step 1: Renombrar el controller**

```bash
mkdir -p src/controllers/downloads
git mv src/controllers/donwloads/donwloads.controller.js src/controllers/downloads/downloads.controller.js
rmdir src/controllers/donwloads
```

- [ ] **Step 2: Renombrar `DonwloadController` a `DownloadController` dentro del archivo movido**

En `src/controllers/downloads/downloads.controller.js`, reemplazar:

```js
const DonwloadController = {
    downloadReglamento,
    downloadFormato,
    downloadSolicitud,
    downloadGuiaRemision,
    downloadreportePdf,
    downloadreporteExcel
}

module.exports = DonwloadController
```

por:

```js
const DownloadController = {
    downloadReglamento,
    downloadFormato,
    downloadSolicitud,
    downloadGuiaRemision,
    downloadreportePdf,
    downloadreporteExcel
}

module.exports = DownloadController
```

No tocar ninguna otra línea del archivo (los nombres de las funciones internas ya están bien escritos en inglés correcto: `downloadReglamento`, etc.).

- [ ] **Step 3: Renombrar el archivo de rutas**

```bash
mkdir -p src/routes/downloads
git mv src/routes/donwloads/donwloads.routes.js src/routes/downloads/downloads.routes.js
rmdir src/routes/donwloads
```

- [ ] **Step 4: Actualizar `src/routes/downloads/downloads.routes.js`**

Reemplazar el archivo completo (import + 6 referencias a `DonwloadController`):

```js
const { Router } = require('express');
const DownloadController = require('../../controllers/downloads/downloads.controller');
const ConsumerCardController = require('../../controllers/bar/consumerCard.controller');

const router = Router();

router.get('/:rule_id/download', DownloadController.downloadReglamento);
router.get('/guide/:guide_id/download', DownloadController.downloadGuiaRemision);
router.get('/doctor_format/:format_id/download', DownloadController.downloadFormato);
router.get('/staff/request/:request_id/download', DownloadController.downloadSolicitud);
//bar
router.get('/cruise/:cruise_id/download/pfd', DownloadController.downloadreportePdf);
router.get('/cruise/:cruise_id/download/excel', DownloadController.downloadreporteExcel);
router.get('/consumer-cards/export/report', ConsumerCardController.exportConsumerCardReport);



module.exports = router;
```

- [ ] **Step 5: Actualizar `src/routes/index.js`**

Reemplazar la línea 39:

```js
const downloadsRoutes = require("./donwloads/donwloads.routes");
```

por:

```js
const downloadsRoutes = require("./downloads/downloads.routes");
```

No tocar la línea 80 (`app.use("/api/downloads", authJwt.verifyToken, downloadsRoutes);`) — la URL pública ya es correcta y la variable `downloadsRoutes` ya se llama bien.

- [ ] **Step 6: Verificar que no queda ninguna referencia a `donwload`**

Run: `grep -ril "donwload" src`
Expected: sin output

- [ ] **Step 7: Correr la suite completa**

Run: `npm test`
Expected: Todos los tests PASS.

- [ ] **Step 8: Commit**

```bash
git add src/controllers/downloads/downloads.controller.js src/routes/downloads/downloads.routes.js src/routes/index.js
git commit -m "fix: corregir typo interno donwloads -> downloads (sin cambio de URL)"
```

---

### Task 7: Documentar convenciones en `docs/CONVENTIONS.md`

**Files:**
- Create: `docs/CONVENTIONS.md`

**Interfaces:** ninguna (documentación pura).

- [ ] **Step 1: Crear `docs/CONVENTIONS.md`**

```markdown
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

\`\`\`js
try {
    const result = await Service.getAll();
    res.status(200).json(result);
} catch (error) {
    res.status(400).json(error.message);
}
\`\`\`

**Convención nueva (para código nuevo o tocado):**

\`\`\`js
const AppError = require('../errors/AppError');

const getAll = async (req, res, next) => {
    try {
        const result = await Service.getAll();
        res.status(200).json(result);
    } catch (error) {
        next(error instanceof AppError ? error : new AppError(error.message, 400));
    }
};
\`\`\`

La respuesta de error resultante tiene esta forma:

\`\`\`json
{ "error": { "message": "mensaje descriptivo", "code": "AppError" } }
\`\`\`

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
```

- [ ] **Step 2: Commit**

```bash
git add docs/CONVENTIONS.md
git commit -m "docs: agregar CONVENTIONS.md (errores, sufijos de servicios, ubicación de utils)"
```

---

### Task 8: Verificación final contra criterios de éxito del spec

**Files:** ninguno creado/modificado — solo verificación.

- [ ] **Step 1: Confirmar que `Utils.js` solo tiene `encode`/`decode`**

Run: `grep -c "static " src/utils/Utils.js`
Expected: `2`

- [ ] **Step 2: Confirmar que no queda ninguna referencia a los métodos movidos**

Run: `grep -rn "Utils\.getPasswordRandom\|Utils\.generateAccessToken\|Utils\.generateRefreshToken\|Utils\.getSessionRandom\|Utils\.formatDateToLocal\|Utils\.formatMonthYear\|Utils\.asignarPuntaje\|Utils\.normalizeQuantity\|Utils\.viewCorrectQuantity" src`
Expected: sin output

- [ ] **Step 3: Confirmar que no queda ningún `.service.js`**

Run: `find src/services -iname "*.service.js"`
Expected: sin output

- [ ] **Step 4: Confirmar que no queda ninguna referencia a `donwload`**

Run: `grep -ril "donwload" src`
Expected: sin output

- [ ] **Step 5: Confirmar que `docs/CONVENTIONS.md` existe**

Run: `test -f docs/CONVENTIONS.md && echo OK`
Expected: `OK`

- [ ] **Step 6: Correr la suite completa una vez más**

Run: `npm test`
Expected: 10 smoke tests + todos los unit tests (incluyendo `tokens.test.js`, `dateFormat.test.js`, `quantity.test.js`, `surveyScoring.test.js`, y los de Fase 0) PASS.

- [ ] **Step 7: Confirmar que `npm run lint` sigue corriendo**

Run: `npm run lint`
Expected: completa sin crashear (warnings/errores en código preexistente son esperados, per criterio de Fase 0).

- [ ] **Step 8: Revisar el diff contra el spec — cero cambios de ruta o forma de respuesta**

Run: `git diff trunk --stat`
Expected: solo archivos listados en las Tasks 1-7 (más `docs/superpowers/plans/2026-07-24-fase-1-convenciones-plan.md` si se commiteó). Ningún archivo bajo `src/routes/` cambia su contenido de rutas (salvo el import path en `src/routes/index.js` y `downloads.routes.js`, Task 6) — cero endpoints nuevos, renombrados o eliminados.

No hay commit para esta task — es una pasada de verificación. Si algún paso falla, volver a la task dueña de ese archivo y corregirlo ahí (con su propio commit), luego re-correr este checklist.

---

## Self-Review Notes

- **Cobertura del spec:** Sección 1 (romper Utils.js) → Tasks 1-4. Sección 2 (sufijos) → Task 5. Sección 3 (documentar errores) → Task 7. Sección 4 (naming donwloads) → Task 6. Criterios de éxito → Task 8. Las 4 secciones del spec tienen task dueña.
- **Corrección de alcance encontrada durante el plan:** el spec original listaba `dateFormat.js` con ~2 call sites; la investigación de archivo-por-archivo (buscando también imports destructurados `{ formatDateToLocal }`, no solo `Utils.formatDateToLocal`) encontró 6 call sites reales. El spec ya fue corregido (commit `3f88f11`) antes de escribir este plan, y Task 2 refleja la lista completa y verificada.
- **Consistencia de imports:** en cada task se verificó explícitamente, archivo por archivo, si `Utils.encode`/`Utils.decode` se usan en ese archivo — si sí, el import de `Utils` se conserva y se agrega el import nuevo al lado; si no, el import de `Utils` se reemplaza por completo. Esto evita imports muertos o duplicados.
- **Orden de tasks:** Task 2 (dateFormat) edita el contenido de `cruiseReportPDF.service.js`: **antes** de que Task 5 lo renombre a `.services.js`. El orden Task 1→2→3→4→5→6→7→8 respeta esa dependencia.
- **Placeholder scan:** sin TBD/TODO; cada step tiene contenido literal de archivo o comando exacto con output esperado.
