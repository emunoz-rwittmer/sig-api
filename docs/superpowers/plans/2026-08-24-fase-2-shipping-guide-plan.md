# Fase 2 — Dominio ShippingGuide — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retrofit the `shippingGuide` domain (`/api/shipping_guides`, 4 existing endpoints) to the `AppError`/`next(error)` standard, fix three verified real bugs (a `ReferenceError` that breaks every item-update call, a wrong param name that breaks every new-item creation, and a missing service method that breaks the same new-item path even after the param fix), and add a new `DELETE /api/shipping_guides/:guide_id` endpoint that removes a guide, its items, and its PDF file. Cover the whole domain with real-DB tests.

**Architecture:** No new files besides the test suite. `src/controllers/operations/shippingGuide/shippingGuide.controller.js` and `src/services/operations/shippingGuide/shippingGuide.services.js` are modified in place, endpoint by endpoint. `src/routes/operations/shippingGuide/shippingGuide.routes.js` gets one line uncommented (the `DELETE` route already exists as a comment). This plan runs inside an isolated git worktree — set that up via `superpowers:using-git-worktrees` before dispatching Task 1 (the user explicitly asked for worktree isolation for this domain, given the scale of the change).

**Tech Stack:** Express, Sequelize (MySQL), Jest + Supertest (real DB, no mocks except `jest.mock` on `src/mails/mailer` — same pattern already used in `tests/domain/operations-orders/orders.test.js` — and one `jest.spyOn` for the 500-delegation test), existing `AppError`/`errorHandler` middleware, `hashids` via `src/utils/Utils.js`, real `pdfkit` PDF generation (not mocked — same precedent as the real file-upload I/O already exercised in the orders domain tests).

**Spec:** `docs/superpowers/specs/2026-08-24-fase-2-shipping-guide-design.md`

## Global Constraints

- All 5 handlers (4 existing + new `deleteShippingGuide`) end up with signature `(req, res, next)` and every `catch` block calls `next(error)` — no handler keeps `res.status(400).json(error.message)`.
- The `guide_id` URL param is decoded through a local `decodeId(value, fieldName)` helper (identical to the one already shipped in `products.controller.js`/`warehouse.controller.js`/`transactions.controller.js`) that throws `AppError('${fieldName} inválido', 400)` on failure.
- `updateShippingGuide` gets a "buscar primero" existence check (reusing the already-existing `ShippingGuideService.getShippingGuideById`, contract untouched) before touching any item — this is what produces the 404 the spec's contract table commits to; today the endpoint silently "succeeds" on any `guide_id`.
- `ShippingGuideService.getShippingGuideById` is called cross-domain from `src/controllers/downloads/downloads.controller.js` (`downloadGuiaRemision`), which already does its own `if (!guide) throw new AppError(...)` against a `null` return. **Do not change this method's signature or return contract** — it keeps returning `null` on a missing guide, exactly as today. The 404 conversions in this plan happen only inside `shippingGuide.controller.js`'s own handlers.
- `createShippingGuide` validates `dateStartTraslate`, `dateEndTraslate` (both `allowNull: false` on the `ShippingGuide` model) and `details` (must be a non-empty array — `ShippingGuideService.createShippingGuide` does `data.details.map(...)` unguarded) are present, throwing `AppError(msg, 400)` before generating the PDF. Without this guard, a request missing one of these would go from an accidental-400/crash (today) to an unclassified 500 once `next(error)` takes over.
- Three real bugs get fixed as part of this retrofit (see spec for full detail):
  1. `ShippingGuideService.updateShippingGuide` uses `Utils.decode(item.id)` without importing `Utils` → add the import.
  2. `ShippingGuideController.updateShippingGuide` reads `Utils.decode(params.order_id)` but the route param is `:guide_id` → rename to `params.guide_id`, and rename the local variable from `orderId` to `guideId` (it flows into the object passed to `bulkCreate`, which needs the key `guideId` to match the `ShippingGuideItems` model attribute — not `orderId`).
  3. The same code path calls `ShippingGuideService.createItemsOfShippingGuide(...)`, a method that does not exist anywhere in the service. Add it (`ShippingGuideItems.bulkCreate(items)`, same pattern `createShippingGuide` already uses for its own `details`).
- New feature: `ShippingGuideService.deleteShippingGuide(id)` — `findByPk` first (404 if missing), then in a transaction: destroy `ShippingGuideItems` where `guideId: id`, then destroy the `ShippingGuide` row (items first — `shippingGuideItems.belongsTo(ShippingGuide, ...)` has no `onDelete: CASCADE` in `init.models.js`, so deleting the guide first would fail on the FK constraint if it has items). After commit, best-effort `fs.unlink` the PDF file at `guide.file` (resolved the same way `sendFileDownload` in `downloads.controller.js` resolves relative paths against the project root) — failures here (including `ENOENT`) are logged with `console.error` and swallowed, never thrown; the DB deletion already succeeded and that's what matters to the caller.
- `console.log(error)` debug line in `createShippingGuide`'s catch is removed while that handler is being touched anyway.
- Every new/changed error path a client can trigger gets a test asserting the exact status code and, where applicable, `response.body.error.code === 'AppError'`.
- Mock `src/mails/mailer` in the test file (`jest.mock('../../../src/mails/mailer', () => ({ sendEmailGuiaRemisionCreada: jest.fn() }))`) — the real module calls a live SendGrid client with a real-looking API key from `.env.test`; the `orders` domain test suite already mocks this module for the same reason, this plan follows the same precedent rather than risk sending real email during test runs.
- The mounted route prefix is `/api/shipping_guides` — `src/routes/index.js:70` (`app.use("/api/shipping_guides", authJwt.verifyToken, shippingGuideRoutes);`).
- Run `npx jest tests/domain/operations-shippingGuide --runInBand` after every task; it must stay green from Task 1 onward.

---

### Task 1: Test scaffold, fixtures, `decodeId` helper, mailer mock, retrofit `getShippingGuides`

**Files:**
- Create: `tests/domain/operations-shippingGuide/shippingGuide.test.js`
- Modify: `src/controllers/operations/shippingGuide/shippingGuide.controller.js:1-21` (imports + `getShippingGuides`)

**Interfaces:**
- Produces: `decodeId(value, fieldName)` and `AppError` imported in the controller module scope — used by every later task.
- Produces fixture helpers in the test file, reused by every later task: `createShippingGuideFixture(overrides)`, `createShippingGuideItemFixture(guideId, overrides)`, plus `auth(httpRequest)` and `suffix()`.

- [ ] **Step 1: Write the test file with fixtures, mailer mock, and the `getShippingGuides` describe block**

```js
jest.mock('../../../src/mails/mailer', () => ({
    sendEmailGuiaRemisionCreada: jest.fn(),
}));

const request = require('supertest');
const { bootTestApp, shutdownTestApp } = require('../../helpers/testApp');
const { createAuthenticatedUser } = require('../../helpers/auth');
const ShippingGuide = require('../../../src/models/operations/shippingGuide/shippingGuide.models');
const ShippingGuideItems = require('../../../src/models/operations/shippingGuide/shippingGuideItems.models');
const Utils = require('../../../src/utils/Utils');
const ShippingGuideService = require('../../../src/services/operations/shippingGuide/shippingGuide.services');
const fs = require('fs');
const path = require('path');

let app;
let token;
let fixtureCounter = 0;

const auth = (httpRequest) => httpRequest.set('Authorization', `Bearer ${token}`);
const suffix = () => {
    fixtureCounter += 1;
    return `${Date.now()}-${fixtureCounter}`;
};

beforeAll(async () => {
    app = await bootTestApp();
    token = await createAuthenticatedUser(app);
}, 60000);

afterAll(async () => {
    await shutdownTestApp();
});

// --- Helpers de fixtures --------------------------------------------------

async function createShippingGuideFixture(overrides = {}) {
    const s = suffix();
    return ShippingGuide.create({
        counter: `000-${s}`,
        dateStartTraslate: new Date('2026-01-01'),
        dateEndTraslate: new Date('2026-01-05'),
        from: 'Santa Cruz',
        to: 'Quito',
        addressee: 'Cliente Test',
        addresseeRuc: '0999999999',
        carrier: 'Transportista Test',
        carrierRuc: '0988888888',
        carrierLicence: 'ABC-1234',
        file: `/uploads/pdfs/guides/guia_remision_test-${s}.pdf`,
        ...overrides,
    });
}

async function createShippingGuideItemFixture(guideId, overrides = {}) {
    return ShippingGuideItems.create({
        guideId,
        quantity: '10',
        detail: 'Item de prueba',
        ...overrides,
    });
}

// =========================================================================
// GET /api/shipping_guides
// =========================================================================

describe('GET /api/shipping_guides — listar guías de remisión', () => {
    it('devuelve 200 con la lista de guías', async () => {
        await createShippingGuideFixture();

        const response = await auth(request(app).get('/api/shipping_guides'));

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
    });

    it('devuelve 403 sin JWT', async () => {
        const response = await request(app).get('/api/shipping_guides');

        expect(response.status).toBe(403);
    });

    it('delega fallas inesperadas al handler global de 500', async () => {
        const failure = jest
            .spyOn(ShippingGuideService, 'getShippingGuides')
            .mockRejectedValueOnce(new Error('database unavailable'));

        const response = await auth(request(app).get('/api/shipping_guides'));

        expect(response.status).toBe(500);
        expect(response.body).toEqual({
            error: {
                message: 'database unavailable',
                code: 'INTERNAL_ERROR',
            },
        });
        failure.mockRestore();
    });
});
```

- [ ] **Step 2: Run the suite and confirm it fails on the new tests**

Run: `npx jest tests/domain/operations-shippingGuide --runInBand`
Expected: FAIL — only the third test ("delega fallas inesperadas...") fails. Today's `catch` responds `res.status(400).json(error.message)` for any service failure, so a rejected `getShippingGuides` produces a `400` with a raw string body instead of the expected `500` with `{error:{code:'INTERNAL_ERROR'}}`. The first two tests already pass today.

- [ ] **Step 3: Retrofit imports and `getShippingGuides` in the controller**

Modify `src/controllers/operations/shippingGuide/shippingGuide.controller.js:1-21`:

```js
const ShippingGuideCount = require('../../../models/operations/shippingGuide/shippingGuideCount.model');
const ShippingGuideService = require('../../../services/operations/shippingGuide/shippingGuide.services');
const { generateRemisionPDF } = require('../../../services/operations/shippingGuide/pdfService');
const { sendEmailGuiaRemisionCreada } = require('../../../mails/mailer');
const Utils = require('../../../utils/Utils');
const AppError = require('../../../errors/AppError');
const fs = require('fs');
const path = require('path');

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

const getShippingGuides = async (req, res, next) => {
    try {
        const result = await ShippingGuideService.getShippingGuides();
        if (result instanceof Array) {
            result.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
            });
        }
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}
```

- [ ] **Step 4: Run and confirm all pass**

Run: `npx jest tests/domain/operations-shippingGuide --runInBand`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add tests/domain/operations-shippingGuide/shippingGuide.test.js src/controllers/operations/shippingGuide/shippingGuide.controller.js
git commit -m "test+fix: retrofit getShippingGuides a next(error), agregar decodeId/AppError"
```

---

### Task 2: `getShippingGuideById` — decodeId, 404 real en vez de TypeError

**Files:**
- Modify: `src/controllers/operations/shippingGuide/shippingGuide.controller.js` (method `getShippingGuideById`)
- Test: `tests/domain/operations-shippingGuide/shippingGuide.test.js`

**Interfaces:**
- Consumes: `decodeId`, `AppError` (Task 1), `createShippingGuideFixture` (Task 1).
- **Does not modify** `ShippingGuideService.getShippingGuideById` — keeps returning `null` on a missing guide (see Global Constraints — `downloads.controller.js` depends on this).

- [ ] **Step 1: Add the failing tests**

```js
// =========================================================================
// GET /api/shipping_guides/:guide_id
// =========================================================================

describe('GET /api/shipping_guides/:guide_id', () => {
    it('devuelve 200 con la guía y sus items', async () => {
        const guide = await createShippingGuideFixture();
        await createShippingGuideItemFixture(guide.id, { detail: 'Caja de vino' });

        const response = await auth(
            request(app).get(`/api/shipping_guides/${Utils.encode(guide.id)}`)
        );

        expect(response.status).toBe(200);
        expect(response.body.counter).toBe(guide.counter);
        expect(response.body.details.length).toBe(1);
    });

    it('devuelve 400 con hashid inválido', async () => {
        const response = await auth(request(app).get('/api/shipping_guides/not-a-hashid'));

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 404 cuando la guía no existe', async () => {
        const response = await auth(
            request(app).get(`/api/shipping_guides/${Utils.encode(999999)}`)
        );

        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 403 sin JWT', async () => {
        const response = await request(app).get('/api/shipping_guides/any-id');

        expect(response.status).toBe(403);
    });
});
```

- [ ] **Step 2: Run and confirm the new failure modes**

Run: `npx jest tests/domain/operations-shippingGuide --runInBand -t "guide_id"`
Expected: FAIL on "no existe" (today `result.id = Utils.encode(result.id)` throws an unhandled `TypeError` on `null`, caught by the generic catch as a `400` with a raw message, not a clean `404`) and on "hashid inválido" (unguarded `Utils.decode`).

- [ ] **Step 3: Retrofit the controller**

Modify `getShippingGuideById` in `src/controllers/operations/shippingGuide/shippingGuide.controller.js`:

```js
const getShippingGuideById = async (req, res, next) => {
    try {
        const guideId = decodeId(req.params.guide_id, 'guide_id');
        const result = await ShippingGuideService.getShippingGuideById(guideId);
        if (!result) {
            throw new AppError('Guía no encontrada', 404);
        }
        result.id = Utils.encode(result.id);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}
```

- [ ] **Step 4: Run and confirm all pass**

Run: `npx jest tests/domain/operations-shippingGuide --runInBand`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add tests/domain/operations-shippingGuide/shippingGuide.test.js src/controllers/operations/shippingGuide/shippingGuide.controller.js
git commit -m "test+fix: getShippingGuideById responde 404 en vez de crashear sobre guía inexistente"
```

---

### Task 3: `createShippingGuide` — validación explícita, quitar console.log, next(error)

**Files:**
- Modify: `src/controllers/operations/shippingGuide/shippingGuide.controller.js` (method `createShippingGuide`)
- Test: `tests/domain/operations-shippingGuide/shippingGuide.test.js`

**Interfaces:**
- Consumes: `AppError` (Task 1).

- [ ] **Step 1: Add the failing tests**

```js
// =========================================================================
// POST /api/shipping_guides
// =========================================================================

describe('POST /api/shipping_guides — crear guía de remisión', () => {
    const validPayload = () => ({
        dateStartTraslate: '2026-02-01',
        dateEndTraslate: '2026-02-05',
        from: 'Santa Cruz',
        to: 'Quito',
        sale: true,
        buy: false,
        other: false,
        addressee: 'Cliente Test',
        addresseeRuc: '0999999999',
        carrier: 'Transportista Test',
        carrierRuc: '0988888888',
        carrierLicence: 'ABC-1234',
        details: [{ quantity: 5, detail: 'Caja de vino' }],
    });

    it('devuelve 200 al crear una guía', async () => {
        const response = await auth(
            request(app).post('/api/shipping_guides').send(validPayload())
        );

        expect(response.status).toBe(200);
        expect(response.body.data).toBe('resource created successfully');

        const created = await ShippingGuide.findOne({ where: {}, order: [['id', 'DESC']] });
        expect(created).not.toBeNull();
        expect(fs.existsSync(path.join(__dirname, '../../..', created.file))).toBe(true);
    });

    it('devuelve 400 cuando falta dateStartTraslate', async () => {
        const payload = validPayload();
        delete payload.dateStartTraslate;

        const response = await auth(request(app).post('/api/shipping_guides').send(payload));

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 400 cuando falta dateEndTraslate', async () => {
        const payload = validPayload();
        delete payload.dateEndTraslate;

        const response = await auth(request(app).post('/api/shipping_guides').send(payload));

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 400 cuando details está vacío', async () => {
        const payload = validPayload();
        payload.details = [];

        const response = await auth(request(app).post('/api/shipping_guides').send(payload));

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 403 sin JWT', async () => {
        const response = await request(app).post('/api/shipping_guides').send({});

        expect(response.status).toBe(403);
    });
});
```

- [ ] **Step 2: Run and confirm the validation tests fail**

Run: `npx jest tests/domain/operations-shippingGuide --runInBand -t "crear guía"`
Expected: FAIL on "falta dateStartTraslate" / "falta dateEndTraslate" / "details está vacío" — today these either hit `pdfService`'s `DateFormat.formatMonthYear(undefined)` or `data.details.forEach`/`.map` on `undefined`/`[]` in ways that don't produce a clean `AppError` 400 body.

- [ ] **Step 3: Add the field guards and next(error) wiring**

Modify `createShippingGuide` in `src/controllers/operations/shippingGuide/shippingGuide.controller.js`:

```js
const createShippingGuide = async (req, res, next) => {
    try {
        const data = req.body;
        if (!data.dateStartTraslate) {
            throw new AppError('dateStartTraslate es requerido', 400);
        }
        if (!data.dateEndTraslate) {
            throw new AppError('dateEndTraslate es requerido', 400);
        }
        if (!Array.isArray(data.details) || data.details.length === 0) {
            throw new AppError('details debe tener al menos un item', 400);
        }

        const [consecutivo] = await ShippingGuideCount.findOrCreate({
            where: {},
            defaults: { valor: 1 },
        });

        const formattedCounter = `000-${consecutivo.valor.toString().padStart(3, '0')}`;
        await ShippingGuideCount.update(
            { valor: consecutivo.valor + 1 }, { where: {} }
        );

        data.counter = formattedCounter;

        const fileName = `guia_remision_${data.counter}.pdf`;
        const filePath = path.join(__dirname, '../../../../uploads/pdfs/guides', fileName);

        await generateRemisionPDF(data, filePath);

        const documentPath = '/' + path.relative(path.join(__dirname, '../../../../'), filePath).replace(/\\/g, '/');
        const fileData = fs.readFileSync(filePath).toString('base64');

        data.file = documentPath;

        await ShippingGuideService.createShippingGuide(data);
        const dataMail = {
            counter: data.counter,
        };
        sendEmailGuiaRemisionCreada(dataMail, fileName, fileData);

        res.status(200).json({ data: 'resource created successfully' });
    } catch (error) {
        next(error);
    }
};
```

(This drops the `console.log(error)` debug line that was in the catch, and switches `res.status(400).json(error.message)` for `next(error)`.)

- [ ] **Step 4: Run and confirm all pass**

Run: `npx jest tests/domain/operations-shippingGuide --runInBand`
Expected: PASS (12 tests)

- [ ] **Step 5: Commit**

```bash
git add tests/domain/operations-shippingGuide/shippingGuide.test.js src/controllers/operations/shippingGuide/shippingGuide.controller.js
git commit -m "test+fix: createShippingGuide exige fechas y details como AppError 400"
```

---

### Task 4: `updateShippingGuide` — fix Utils import, fix guide_id bug, agregar createItemsOfShippingGuide, 404 real

**Files:**
- Modify: `src/services/operations/shippingGuide/shippingGuide.services.js` (imports + `updateShippingGuide` + new `createItemsOfShippingGuide`)
- Modify: `src/controllers/operations/shippingGuide/shippingGuide.controller.js` (method `updateShippingGuide`)
- Test: `tests/domain/operations-shippingGuide/shippingGuide.test.js`

**Interfaces:**
- Consumes: `decodeId`, `AppError` (Task 1), `createShippingGuideFixture`, `createShippingGuideItemFixture` (Task 1).
- Produces: `ShippingGuideService.createItemsOfShippingGuide(items)` — new method, `items` is an array of `{ product, quantity, originalQuantity, guideId }`, returns the created rows via `ShippingGuideItems.bulkCreate`.

- [ ] **Step 1: Add the failing tests**

```js
// =========================================================================
// PUT /api/shipping_guides/:guide_id
// =========================================================================

describe('PUT /api/shipping_guides/:guide_id — actualizar guía', () => {
    it('devuelve 200 y actualiza un item existente', async () => {
        const guide = await createShippingGuideFixture();
        const item = await createShippingGuideItemFixture(guide.id, { quantity: '10', detail: 'Original' });

        const response = await auth(
            request(app)
                .put(`/api/shipping_guides/${Utils.encode(guide.id)}`)
                .send({
                    id: [Utils.encode(item.id)],
                    product: ['Producto actualizado'],
                    quantity: ['20'],
                    originalQuantity: ['10'],
                })
        );

        expect(response.status).toBe(200);

        const refreshed = await ShippingGuideItems.findByPk(item.id);
        expect(refreshed.quantity).toBe('20');
    });

    it('devuelve 200 y crea un item nuevo asociado a la guía correcta', async () => {
        const guide = await createShippingGuideFixture();

        const response = await auth(
            request(app)
                .put(`/api/shipping_guides/${Utils.encode(guide.id)}`)
                .send({
                    id: [''],
                    product: ['Producto nuevo'],
                    quantity: ['5'],
                    originalQuantity: ['5'],
                })
        );

        expect(response.status).toBe(200);

        const items = await ShippingGuideItems.findAll({ where: { guideId: guide.id } });
        expect(items.length).toBe(1);
        expect(items[0].quantity).toBe('5');
    });

    it('devuelve 400 con hashid inválido', async () => {
        const response = await auth(
            request(app).put('/api/shipping_guides/not-a-hashid').send({ id: [] })
        );

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 404 cuando la guía no existe', async () => {
        const response = await auth(
            request(app)
                .put(`/api/shipping_guides/${Utils.encode(999999)}`)
                .send({ id: [] })
        );

        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 400 cuando id no es un arreglo', async () => {
        const guide = await createShippingGuideFixture();

        const response = await auth(
            request(app)
                .put(`/api/shipping_guides/${Utils.encode(guide.id)}`)
                .send({ id: 'no-es-arreglo' })
        );

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 403 sin JWT', async () => {
        const response = await request(app).put('/api/shipping_guides/any-id').send({});

        expect(response.status).toBe(403);
    });
});
```

- [ ] **Step 2: Run and confirm the new failure modes**

Run: `npx jest tests/domain/operations-shippingGuide --runInBand -t "actualizar guía"`
Expected: FAIL on "actualiza un item existente" (today: `ReferenceError: Utils is not defined` inside the service, bug #1 — surfaces as a raw 400 today, not a clean success), FAIL on "crea un item nuevo" (today: `params.order_id` is always `undefined`, and even after that, `ShippingGuideService.createItemsOfShippingGuide` doesn't exist — `TypeError`), FAIL on "no existe" (today: silent 200, no existence check at all), FAIL on "hashid inválido" and "id no es un arreglo" (no guards today).

- [ ] **Step 3: Fix the service — import Utils, add createItemsOfShippingGuide**

Modify the top of `src/services/operations/shippingGuide/shippingGuide.services.js`:

```js
const ShippingGuideItems = require('../../../models/operations/shippingGuide/shippingGuideItems.models');
const ShippingGuide = require('../../../models/operations/shippingGuide/shippingGuide.models');
const db = require('../../../utils/database');
const Utils = require('../../../utils/Utils');
```

Modify `updateShippingGuide` (this fixes bug #1 — `Utils` is now imported, so the existing `Utils.decode(item.id)` call inside it works):

```js
    static async updateShippingGuide(data) {
        try {
            const results = await Promise.all(data.map(async (item) => {
                const result = await ShippingGuideItems.update({
                    product: item.product,
                    quantity: item.quantity,
                    originalQuantity: item.originalQuantity,
                },
                    {
                        where: { id: Utils.decode(item.id) }
                    });
                return result;
            }));
            return results;
        } catch (error) {

            throw error;
        }
    }
```

Add the new method right after `updateShippingGuide`:

```js
    static async createItemsOfShippingGuide(items) {
        try {
            const result = await ShippingGuideItems.bulkCreate(items);
            return result;
        } catch (error) {
            throw error;
        }
    }
```

- [ ] **Step 4: Fix the controller — decodeId, existence check, guide_id param, next(error)**

Modify `updateShippingGuide` in `src/controllers/operations/shippingGuide/shippingGuide.controller.js`:

```js
const updateShippingGuide = async (req, res, next) => {
    try {
        const guideId = decodeId(req.params.guide_id, 'guide_id');
        const existing = await ShippingGuideService.getShippingGuideById(guideId);
        if (!existing) {
            throw new AppError('Guía no encontrada', 404);
        }

        const { body } = req;

        const ids = body.id;
        const products = body.product;
        const quantitys = body.quantity;
        const originalQuantitys = body.originalQuantity;

        if (!Array.isArray(ids)) {
            throw new AppError('id debe ser un arreglo', 400);
        }

        const items = []
        for (let i = 0; i < ids.length; i++) {
            const id = ids[i];
            const product = products[i];
            const quantity = quantitys[i];
            const originalQuantity = originalQuantitys[i];
            const item = {
                id,
                product,
                quantity,
                originalQuantity,
            }
            items.push(item)
        }

        const itemsUpdate = items.filter(item => item.id !== "");
        const result = await ShippingGuideService.updateShippingGuide(itemsUpdate);

        const newItems = items.filter(item => item.id === "");
        if (newItems.length > 0) {
            const itemsCreate = newItems.map(({ id, ...rest }) => ({
                ...rest,
                guideId: guideId
            }));
            await ShippingGuideService.createItemsOfShippingGuide(itemsCreate);
        }

        if (result) {
            res.status(200).json({ data: 'resource created successfully' });
        }

    } catch (error) {

        next(error);
    }
}
```

- [ ] **Step 5: Run and confirm all pass**

Run: `npx jest tests/domain/operations-shippingGuide --runInBand`
Expected: PASS (18 tests)

- [ ] **Step 6: Commit**

```bash
git add tests/domain/operations-shippingGuide/shippingGuide.test.js src/controllers/operations/shippingGuide/shippingGuide.controller.js src/services/operations/shippingGuide/shippingGuide.services.js
git commit -m "test+fix: updateShippingGuide corrige Utils sin importar, guide_id, y agrega createItemsOfShippingGuide"
```

---

### Task 5: `deleteShippingGuide` — feature nueva, cascada de items + borrado best-effort del PDF

**Files:**
- Modify: `src/services/operations/shippingGuide/shippingGuide.services.js` (new method `deleteShippingGuide`, add `fs`/`path`/`AppError` imports)
- Modify: `src/controllers/operations/shippingGuide/shippingGuide.controller.js` (new method `deleteShippingGuide`, uncomment export)
- Modify: `src/routes/operations/shippingGuide/shippingGuide.routes.js` (uncomment the route)
- Test: `tests/domain/operations-shippingGuide/shippingGuide.test.js`

**Interfaces:**
- Consumes: `decodeId` (controller, Task 1), `createShippingGuideFixture`, `createShippingGuideItemFixture` (Task 1).
- Produces: `ShippingGuideService.deleteShippingGuide(id)` — throws `AppError('Guía no encontrada', 404)` if `id` doesn't exist; otherwise returns `'resource deleted successfully'` after deleting the guide, its items, and best-effort removing its PDF file.

- [ ] **Step 1: Add the failing tests**

```js
// =========================================================================
// DELETE /api/shipping_guides/:guide_id
// =========================================================================

describe('DELETE /api/shipping_guides/:guide_id — eliminar guía', () => {
    it('devuelve 200, borra la guía, sus items y el PDF', async () => {
        const s = suffix();
        const filePath = `/uploads/pdfs/guides/guia_remision_delete-test-${s}.pdf`;
        const absolutePath = path.join(__dirname, '../../..', filePath);
        fs.writeFileSync(absolutePath, 'contenido de prueba');

        const guide = await createShippingGuideFixture({ file: filePath });
        await createShippingGuideItemFixture(guide.id);

        const response = await auth(
            request(app).delete(`/api/shipping_guides/${Utils.encode(guide.id)}`)
        );

        expect(response.status).toBe(200);

        const refreshedGuide = await ShippingGuide.findByPk(guide.id);
        expect(refreshedGuide).toBeNull();

        const remainingItems = await ShippingGuideItems.findAll({ where: { guideId: guide.id } });
        expect(remainingItems.length).toBe(0);

        expect(fs.existsSync(absolutePath)).toBe(false);
    });

    it('devuelve 200 aunque el archivo PDF ya no exista en disco', async () => {
        const guide = await createShippingGuideFixture({ file: '/uploads/pdfs/guides/no-existe.pdf' });

        const response = await auth(
            request(app).delete(`/api/shipping_guides/${Utils.encode(guide.id)}`)
        );

        expect(response.status).toBe(200);

        const refreshedGuide = await ShippingGuide.findByPk(guide.id);
        expect(refreshedGuide).toBeNull();
    });

    it('devuelve 400 con hashid inválido', async () => {
        const response = await auth(request(app).delete('/api/shipping_guides/not-a-hashid'));

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 404 cuando la guía no existe', async () => {
        const response = await auth(
            request(app).delete(`/api/shipping_guides/${Utils.encode(999999)}`)
        );

        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 403 sin JWT', async () => {
        const response = await request(app).delete('/api/shipping_guides/any-id');

        expect(response.status).toBe(403);
    });
});
```

- [ ] **Step 2: Run and confirm it fails**

Run: `npx jest tests/domain/operations-shippingGuide --runInBand -t "eliminar guía"`
Expected: FAIL on all five — the route doesn't exist yet (404 from Express itself, not from `AppError`, so `response.body.error.code` is `undefined`).

- [ ] **Step 3: Add `deleteShippingGuide` to the service**

Add these imports at the top of `src/services/operations/shippingGuide/shippingGuide.services.js` (alongside the ones from Task 4):

```js
const AppError = require('../../../errors/AppError');
const fs = require('fs');
const path = require('path');
```

Add the method at the end of the class, right before `deleteItem` (or after it — placement inside the class doesn't matter, keep it next to `deleteItem` since both are delete-shaped operations):

```js
    static async deleteShippingGuide(id) {
        const existing = await ShippingGuide.findByPk(id);
        if (!existing) {
            throw new AppError('Guía no encontrada', 404);
        }

        const filePath = existing.file;

        const transaction = await db.transaction();
        try {
            await ShippingGuideItems.destroy({ where: { guideId: id }, transaction });
            await ShippingGuide.destroy({ where: { id }, transaction });
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }

        if (filePath) {
            const absolutePath = path.resolve(path.join(__dirname, '../../../../'), `.${filePath}`);
            try {
                fs.unlinkSync(absolutePath);
            } catch (error) {
                console.error('No se pudo borrar el PDF de la guía eliminada:', error.message);
            }
        }

        return 'resource deleted successfully';
    }
```

- [ ] **Step 4: Add `deleteShippingGuide` to the controller**

Modify `src/controllers/operations/shippingGuide/shippingGuide.controller.js` — replace the commented-out placeholder and export:

```js
const deleteShippingGuide = async (req, res, next) => {
    try {
        const guideId = decodeId(req.params.guide_id, 'guide_id');
        const result = await ShippingGuideService.deleteShippingGuide(guideId);
        res.status(200).json({ data: result });
    } catch (error) {
        next(error);
    }
};


const ShippingGuideController = {

    getShippingGuides,
    getShippingGuideById,
    createShippingGuide,
    updateShippingGuide,
    deleteShippingGuide,
}
module.exports = ShippingGuideController
```

- [ ] **Step 5: Uncomment the route**

Modify `src/routes/operations/shippingGuide/shippingGuide.routes.js`:

```js
const { Router } = require('express');
const ShippingGuideController  = require ('../../../controllers/operations/shippingGuide/shippingGuide.controller');

const router = Router();

router.get('/',ShippingGuideController.getShippingGuides);
router.get('/:guide_id',ShippingGuideController.getShippingGuideById);
router.post('/',  ShippingGuideController.createShippingGuide);
router.put('/:guide_id', ShippingGuideController.updateShippingGuide);
router.delete('/:guide_id', ShippingGuideController.deleteShippingGuide);

module.exports = router;
```

- [ ] **Step 6: Run and confirm all pass**

Run: `npx jest tests/domain/operations-shippingGuide --runInBand`
Expected: PASS (23 tests)

- [ ] **Step 7: Commit**

```bash
git add tests/domain/operations-shippingGuide/shippingGuide.test.js src/controllers/operations/shippingGuide/shippingGuide.controller.js src/services/operations/shippingGuide/shippingGuide.services.js src/routes/operations/shippingGuide/shippingGuide.routes.js
git commit -m "feat+test: DELETE /api/shipping_guides/:guide_id — borra guía, items y PDF"
```

---

### Task 6: Verificación final del dominio y de la suite completa

**Files:** none (verification only), plus the spec status line.

**Interfaces:** none.

- [ ] **Step 1: Run the domain suite three times in isolation to rule out flakiness**

Run: `npx jest tests/domain/operations-shippingGuide --runInBand` (three times)
Expected: PASS (23 tests) all three times.

- [ ] **Step 2: Run the full repo test suite to confirm no cross-domain regressions**

Run: `npx jest --runInBand --roots tests`
Expected: all suites PASS. `--roots tests` is required — a bare `npx jest --runInBand` also sweeps up any leftover `.claude/worktrees/*/tests/**/*.test.js`, which is not what this check is for.

Pay particular attention to `tests/domain/downloads` (or any test touching `downloadGuiaRemision`) — that's the one other domain that calls `ShippingGuideService.getShippingGuideById` directly (see Global Constraints). If it regresses, it means that method's contract was accidentally changed somewhere in Tasks 1-5; stop and investigate rather than proceeding.

- [ ] **Step 3: Re-read the diff against the spec's contract table**

Manually check `git diff <first-shippingGuide-commit>~1..HEAD -- src/controllers/operations/shippingGuide/shippingGuide.controller.js src/services/operations/shippingGuide/shippingGuide.services.js src/routes/operations/shippingGuide/shippingGuide.routes.js` against the "Contrato HTTP" table in `docs/superpowers/specs/2026-08-24-fase-2-shipping-guide-design.md` — every row must have a corresponding test from Tasks 1-5.

- [ ] **Step 4: Update the spec status**

Modify `docs/superpowers/specs/2026-08-24-fase-2-shipping-guide-design.md:4`:

```
**Estado:** Implementado
```

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/specs/2026-08-24-fase-2-shipping-guide-design.md
git commit -m "docs: marcar spec de shippingGuide como implementado"
```

At this point the domain is done and green. This plan runs inside an isolated worktree (per the Architecture section) — merging/pushing the branch and opening the PR is a separate, explicit step; confirm with the user before merging or pushing.
