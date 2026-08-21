# Fase 2 — Dominio Inventory/Warehouse — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retrofit the `inventory/warehouse` domain (`/api/warehouse`, 5 endpoints) to the `AppError`/`next(error)` error-handling standard, fix the three verified 200-instead-of-404 (or crash) bugs, clean up dead imports/methods, and cover the domain with real-DB tests. This is the last domain in the `operations/inventory` subtree — `products`, `registers`, and `transactions` are already done.

**Architecture:** No new files besides the test suite. `src/controllers/operations/inventory/warehouse.controller.js` and `src/services/operations/inventory/warehouse.services.js` are modified in place, endpoint by endpoint. `src/routes/operations/inventory/warehouse.routes.js` needs no changes — Express already passes `next` to every route handler regardless of whether the handler declares it. This plan is meant to run inside an isolated git worktree (the user explicitly asked for worktree isolation this time, unlike `registers`/`transactions` which went straight to `trunk`) — set that up via `superpowers:using-git-worktrees` before dispatching Task 1.

**Tech Stack:** Express, Sequelize (MySQL), Jest + Supertest (real DB, no mocks except the one `jest.spyOn` for the 500-delegation test), existing `AppError`/`errorHandler` middleware, `hashids` via `src/utils/Utils.js`.

**Spec:** `docs/superpowers/specs/2026-08-21-fase-2-inventory-warehouse-design.md`

## Global Constraints

- All 5 handlers end up with signature `(req, res, next)` and every `catch` block calls `next(error)` — no handler keeps `res.status(400).json(error.message)`.
- Hashid params (`warehouse_id`, `stock_id`) are decoded through a local `decodeId(value, fieldName)` helper (identical to the one already shipped in `products.controller.js` and `transactions.controller.js`) that throws `AppError('${fieldName} inválido', 400)` on failure.
- 404 applies to all three endpoints that take an id in the URL path: `updateWarehouse`, `deleteWarehouse`, `getStockProduct`. `updateWarehouse` uses "buscar primero" (`findByPk` before `update`) — **never** `affectedRows`, for the same reason documented in the `products` retrofit (an idempotent update also reports `affectedRows: 0`, which would produce a false 404). `deleteWarehouse` is the one place in this whole Fase 2 effort where checking the mutation's own result (`Warehouse.destroy`'s return value, the count of deleted rows) is safe and correct instead of buscar-primero — `destroy` has no idempotent-update ambiguity: `0` rows deleted means the row never existed, unconditionally.
- `WarehouseService.getStockProduct` and `WarehouseService.getWarehouseById` are called from OTHER domains too (`src/controllers/reports/generateTransactionsExcel.js` calls `getStockProduct` directly; `src/controllers/operations/yachtRequest/yachtRequest.controller.js` calls `getWarehouseById`). **Do not change either method's signature or return contract.** Both keep returning `null` when nothing is found, exactly as today — the 404 conversion happens only inside `warehouse.controller.js`'s own `getStockProduct` handler. `getWarehouseById` is not touched by this plan at all (it has no route in `warehouse.routes.js`, but it is not dead code — leave it exactly as is).
- `createWarehouse` validates `name`, `location`, `type` are present (all three are `allowNull: false` on the `Warehouse` model) and throws `AppError(msg, 400)` before calling the service — without this guard, a request missing one of these fields would go from an accidental-400 (today's catch-all) to an unclassified 500 once `next(error)` takes over, because `Warehouse.create` would raise a raw `SequelizeValidationError`.
- Dead code removed as part of this retrofit (confirmed unused via repo-wide search, see the spec): in `warehouse.controller.js`, the `escpos` (`Console`) import and the `RequestService` import; in `warehouse.services.js`, the `requestItems`, `LaundryYacht`, and `Request` imports, and the entire `updateStatusWarehouse` method (no route, no caller anywhere).
- While touching `updateWarehouse`'s service method, also remove the leftover `console.log(error)` debug line in its `catch` block — noise in the same block already being edited, same class of finding flagged in the `transactions` retrofit's final review.
- Every new/changed error path that a client can trigger gets a test asserting the exact status code and, where applicable, `response.body.error.code === 'AppError'`.
- The real mounted route prefix is **`/api/warehouse`** (singular) — `src/routes/index.js:65` (`app.use("/api/warehouse", authJwt.verifyToken, warehouseRoutes);`). The spec originally said `/api/warehouses` (plural); that was a spec typo, corrected before this plan was written. Use the singular form in every test.
- Run `npx jest tests/domain/operations-inventory-warehouse --runInBand` after every task; it must stay green from Task 1 onward (each task only adds tests for behavior that task itself implements).

---

### Task 1: Test scaffold, fixtures, `decodeId` helper, dead-code cleanup, `getAllWarehouses`

**Files:**
- Create: `tests/domain/operations-inventory-warehouse/warehouse.test.js`
- Modify: `src/controllers/operations/inventory/warehouse.controller.js:1-21` (imports + `getAllWarehouses`)
- Modify: `src/services/operations/inventory/warehouse.services.js:1-33` (imports + `getAllWarehouses`), `:175-187` (delete `updateStatusWarehouse`)

**Interfaces:**
- Produces: `decodeId(value, fieldName)` in the controller module scope — used by every later task that touches `warehouse_id` or `stock_id`.
- Produces: `AppError` imported in both the controller and the service — used by every later task.
- Produces fixture helpers in the test file, reused by every later task: `createWarehouseFixture(overrides)`, `createProductFixture(overrides)`, `createStockFixture(productId, warehouseId, companyId, overrides)`, plus `auth(httpRequest)` and `suffix()`.

- [ ] **Step 1: Write the test file with fixtures and the `getAllWarehouses` describe block**

```js
const request = require('supertest');
const { bootTestApp, shutdownTestApp } = require('../../helpers/testApp');
const { createAuthenticatedUser } = require('../../helpers/auth');
const { createCompanyWithYacht } = require('../../helpers/staffFixtures');
const Warehouse = require('../../../src/models/catalogs/wareHouse.models');
const Product = require('../../../src/models/operations/inventory/product.models');
const Stock = require('../../../src/models/operations/inventory/stock.models');
const Utils = require('../../../src/utils/Utils');
const WarehouseService = require('../../../src/services/operations/inventory/warehouse.services');

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

async function createWarehouseFixture(overrides = {}) {
    return Warehouse.create({
        name: `Warehouse-${suffix()}`,
        location: 'Bodega Test',
        type: 'Yate',
        ...overrides,
    });
}

async function createProductFixture(overrides = {}) {
    const s = suffix();
    return Product.create({
        name: `Producto-${s}`,
        sku: `SKU-${s}`,
        type: 'DISCRETE',
        unit: 'unidad',
        active: true,
        ...overrides,
    });
}

async function createStockFixture(productId, warehouseId, companyId, overrides = {}) {
    return Stock.create({
        productId,
        warehouseId,
        companyId,
        quantity: 10,
        max: 20,
        min: 2,
        ...overrides,
    });
}

// =========================================================================
// GET /api/warehouse
// =========================================================================

describe('GET /api/warehouse — lista de bodegas', () => {
    it('devuelve 200 con la lista de bodegas', async () => {
        await createWarehouseFixture();

        const response = await auth(request(app).get('/api/warehouse'));

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
    });

    it('devuelve 403 sin JWT', async () => {
        const response = await request(app).get('/api/warehouse');

        expect(response.status).toBe(403);
    });

    it('delega fallas inesperadas al handler global de 500', async () => {
        const failure = jest
            .spyOn(WarehouseService, 'getAllWarehouses')
            .mockRejectedValueOnce(new Error('database unavailable'));

        const response = await auth(request(app).get('/api/warehouse'));

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

Run: `npx jest tests/domain/operations-inventory-warehouse --runInBand`
Expected: FAIL — only the third test ("delega fallas inesperadas...") fails.
Today's `catch` responds `res.status(400).json(error.message)` for any
service failure, so a rejected `getAllWarehouses` produces a `400` with a
raw string body instead of the expected `500` with `{error:{code:
'INTERNAL_ERROR'}}`. The first two tests already pass today (the happy
path and the 403 don't exercise the retrofit) — that's expected, not a
problem; this task's real behavior change is only in the error path.

- [ ] **Step 3: Retrofit imports and `getAllWarehouses` in the controller, dropping the two dead imports**

Modify `src/controllers/operations/inventory/warehouse.controller.js:1-21`:

```js
const WarehouseService = require('../../../services/operations/inventory/warehouse.services');
const Utils = require('../../../utils/Utils');
const Quantity = require('../../../utils/quantity');
const AppError = require('../../../errors/AppError');

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

const getAllWarehouses = async (req, res, next) => {
    try {
        let result = await WarehouseService.getAllWarehouses();
        const rol = req.userRol
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

(This drops `const { Console } = require('escpos');` and
`const RequestService = require('../../../services/operations/yachtRequest/yachtRequest.services');`
— both confirmed unused anywhere in this file. `const rol = req.userRol` is
left exactly as-is: it's pre-existing, unused-but-harmless, and out of this
retrofit's stated scope.)

- [ ] **Step 4: Retrofit imports in the service, dropping the three dead imports and the dead `updateStatusWarehouse` method**

Modify `src/services/operations/inventory/warehouse.services.js:1-33`:

```js
const Staff = require('../../../models/catalogs/staff.models');
const Warehouse = require('../../../models/catalogs/wareHouse.models');
const Stock = require('../../../models/operations/inventory/stock.models');
const Transaction = require('../../../models/operations/inventory/transaction.models');
const Product = require('../../../models/operations/inventory/product.models');
const { Sequelize, Op } = require("sequelize");
const db = require('../../../utils/database');
const Company = require('../../../models/catalogs/company.models');
const AppError = require('../../../errors/AppError');

class WarehouseService {

    static async getAllWarehouses() {
        try {
            const result = await Warehouse.findAll({
                attributes: [
                    'id', 'name', 'location', 'type',
                    [Sequelize.fn('COUNT', Sequelize.col('stocks.id')), 'stockCount']
                ],
                include: [{
                    model: Stock,
                    as: 'stocks',
                    attributes: []
                }],
                group: ['id']
            });
            return result;
        } catch (error) {
            throw error;
        }
    }
```

(This drops the `requestItems`, `LaundryYacht`, and `Request` imports —
none referenced anywhere in this file — and adds `AppError`, which no
method in this task uses yet but every later task needs.)

Then delete the `updateStatusWarehouse` method entirely. It currently sits
at the end of the file, right before `module.exports = WarehouseService;`
(originally lines 175-187):

```js
    static async updateStatusWarehouse(id, status) {
        try {
            const result = await Warehouse.update({
                status
            }, {
                where: { id }
            });
            return result;
        } catch (error) {
            throw error;

        }
    }
```

Remove this whole block — it has no route in `warehouse.routes.js` and no
caller anywhere in the repo (verified with a repo-wide search before this
plan was written). The file should end with the closing `}` of the class
immediately after the last remaining method (`getStockProduct`), then
`module.exports = WarehouseService;`.

- [ ] **Step 5: Run and confirm all pass**

Run: `npx jest tests/domain/operations-inventory-warehouse --runInBand`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add tests/domain/operations-inventory-warehouse/warehouse.test.js src/controllers/operations/inventory/warehouse.controller.js src/services/operations/inventory/warehouse.services.js
git commit -m "test+fix: retrofit getAllWarehouses a next(error), limpiar imports/método muertos"
```

---

### Task 2: `createWarehouse` — validación explícita de `name`/`location`/`type`

**Files:**
- Modify: `src/controllers/operations/inventory/warehouse.controller.js:23-31`
- Test: `tests/domain/operations-inventory-warehouse/warehouse.test.js`

**Interfaces:**
- Consumes: `AppError` (controller, Task 1).

- [ ] **Step 1: Add the failing tests**

```js
// =========================================================================
// POST /api/warehouse
// =========================================================================

describe('POST /api/warehouse — crear bodega', () => {
    it('devuelve 200 al crear una bodega', async () => {
        const s = suffix();

        const response = await auth(
            request(app)
                .post('/api/warehouse')
                .send({ name: `Nueva-${s}`, location: 'Cubierta 1', type: 'Yate' })
        );

        expect(response.status).toBe(200);
        expect(response.body.data).toBe('resource created successfully');
    });

    it('devuelve 400 cuando falta name', async () => {
        const response = await auth(
            request(app)
                .post('/api/warehouse')
                .send({ location: 'Cubierta 1', type: 'Yate' })
        );

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 400 cuando falta location', async () => {
        const response = await auth(
            request(app)
                .post('/api/warehouse')
                .send({ name: `SinLocation-${suffix()}`, type: 'Yate' })
        );

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 400 cuando falta type', async () => {
        const response = await auth(
            request(app)
                .post('/api/warehouse')
                .send({ name: `SinType-${suffix()}`, location: 'Cubierta 1' })
        );

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 403 sin JWT', async () => {
        const response = await request(app).post('/api/warehouse').send({});

        expect(response.status).toBe(403);
    });
});
```

- [ ] **Step 2: Run and confirm the field-validation tests fail**

Run: `npx jest tests/domain/operations-inventory-warehouse --runInBand -t "crear bodega"`
Expected: FAIL on "falta name" / "falta location" / "falta type" — today
these hit `Warehouse.create` directly, which throws a raw
`SequelizeValidationError` caught by the generic catch-all as a 400, but
without `response.body.error.code` (the body today is just the raw error
message string, not `{error:{code:'AppError'}}`).

- [ ] **Step 3: Add the field guards and `next(error)` wiring**

Modify `src/controllers/operations/inventory/warehouse.controller.js:23-31`:

```js
const createWarehouse = async (req, res, next) => {
    try {
        const data = req.body;
        if (!data.name) {
            throw new AppError('name es requerido', 400);
        }
        if (!data.location) {
            throw new AppError('location es requerido', 400);
        }
        if (!data.type) {
            throw new AppError('type es requerido', 400);
        }
        await WarehouseService.createWarehouse(data);
        res.status(200).json({ data: 'resource created successfully' });
    } catch (error) {
        next(error);
    }
}
```

- [ ] **Step 4: Run and confirm all pass**

Run: `npx jest tests/domain/operations-inventory-warehouse --runInBand`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add tests/domain/operations-inventory-warehouse/warehouse.test.js src/controllers/operations/inventory/warehouse.controller.js
git commit -m "test+fix: createWarehouse exige name/location/type como AppError 400"
```

---

### Task 3: `updateWarehouse` — decodeId, "buscar primero" para 404, quitar console.log

**Files:**
- Modify: `src/controllers/operations/inventory/warehouse.controller.js:33-43`
- Modify: `src/services/operations/inventory/warehouse.services.js:45-55` (post-Task-1 line numbers; the method named `updateWarehouse`)
- Test: `tests/domain/operations-inventory-warehouse/warehouse.test.js`

**Interfaces:**
- Consumes: `decodeId` (controller, Task 1), `AppError` (service, Task 1), `createWarehouseFixture` (Task 1).
- Produces: `WarehouseService.updateWarehouse` now throws `AppError('Bodega no encontrada', 404)` when `id` doesn't exist — the only caller is this controller, updated in the same task.

- [ ] **Step 1: Add the failing tests**

```js
// =========================================================================
// PUT /api/warehouse/:warehouse_id
// =========================================================================

describe('PUT /api/warehouse/:warehouse_id — actualizar bodega', () => {
    it('devuelve 200 al actualizar la bodega', async () => {
        const warehouse = await createWarehouseFixture();

        const response = await auth(
            request(app)
                .put(`/api/warehouse/${Utils.encode(warehouse.id)}`)
                .send({ name: 'Actualizada', location: warehouse.location, type: warehouse.type })
        );

        expect(response.status).toBe(200);
        expect(response.body.data).toBe('resource updated successfully');

        const refreshed = await Warehouse.findByPk(warehouse.id);
        expect(refreshed.name).toBe('Actualizada');
    });

    it('devuelve 400 con hashid inválido', async () => {
        const response = await auth(
            request(app)
                .put('/api/warehouse/not-a-hashid')
                .send({ name: 'X' })
        );

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 404 cuando la bodega no existe', async () => {
        const response = await auth(
            request(app)
                .put(`/api/warehouse/${Utils.encode(999999)}`)
                .send({ name: 'X' })
        );

        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 403 sin JWT', async () => {
        const response = await request(app).put('/api/warehouse/any-id').send({});

        expect(response.status).toBe(403);
    });
});
```

- [ ] **Step 2: Run and confirm the new failure modes**

Run: `npx jest tests/domain/operations-inventory-warehouse --runInBand -t "actualizar bodega"`
Expected: FAIL on "hashid inválido" (today `Utils.decode` on garbage input
returns `undefined`, unguarded, and the subsequent `Warehouse.update({...},
{where:{id:undefined}})` either no-ops or produces an unclassified error —
not a clean `AppError` 400) and on "no existe" (today this returns `200`,
since the controller never inspects `Warehouse.update`'s
`[affectedRowsCount]` return value).

- [ ] **Step 3: Add the "buscar primero" existence check in the service, and drop the debug `console.log`**

Modify `updateWarehouse` in `src/services/operations/inventory/warehouse.services.js` (post-Task-1, this is the second method in the file, right after `getAllWarehouses`):

```js
    static async updateWarehouse(data, id) {
        try {
            const existing = await Warehouse.findByPk(id);
            if (!existing) {
                throw new AppError('Bodega no encontrada', 404);
            }
            const result = await Warehouse.update(data, {
                where: { id },
            });
            return result
        } catch (error) {
            throw error;
        }
    }
```

(The pre-existing `console.log(error)` that used to sit right before `throw
error;` in this method's catch is gone — it logged a full stack trace on
every failure, including ordinary 404s once this method starts throwing
`AppError`.)

- [ ] **Step 4: Add `decodeId` and `next(error)` wiring in the controller**

Modify `src/controllers/operations/inventory/warehouse.controller.js:33-43`:

```js
const updateWarehouse = async (req, res, next) => {
    try {
        const warehouseId = decodeId(req.params.warehouse_id, 'warehouse_id');
        const data = req.body;
        delete data.id
        await WarehouseService.updateWarehouse(data, warehouseId);
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        next(error);
    }
}
```

- [ ] **Step 5: Run and confirm all pass**

Run: `npx jest tests/domain/operations-inventory-warehouse --runInBand`
Expected: PASS (12 tests)

- [ ] **Step 6: Commit**

```bash
git add tests/domain/operations-inventory-warehouse/warehouse.test.js src/controllers/operations/inventory/warehouse.controller.js src/services/operations/inventory/warehouse.services.js
git commit -m "test+fix: updateWarehouse valida hashid y responde 404 real via buscar-primero"
```

---

### Task 4: `deleteWarehouse` — decodeId, 404 vía resultado de `destroy`

**Files:**
- Modify: `src/controllers/operations/inventory/warehouse.controller.js:45-54`
- Modify: `src/services/operations/inventory/warehouse.services.js` (method `deleteWarehouse`)
- Test: `tests/domain/operations-inventory-warehouse/warehouse.test.js`

**Interfaces:**
- Consumes: `decodeId` (controller, Task 1), `AppError` (service, Task 1), `createWarehouseFixture` (Task 1).

- [ ] **Step 1: Add the failing tests**

```js
// =========================================================================
// DELETE /api/warehouse/:warehouse_id
// =========================================================================

describe('DELETE /api/warehouse/:warehouse_id — eliminar bodega', () => {
    it('devuelve 200 al eliminar la bodega', async () => {
        const warehouse = await createWarehouseFixture();

        const response = await auth(
            request(app).delete(`/api/warehouse/${Utils.encode(warehouse.id)}`)
        );

        expect(response.status).toBe(200);
        expect(response.body.data).toBe('resource deleted successfully');

        const refreshed = await Warehouse.findByPk(warehouse.id);
        expect(refreshed).toBeNull();
    });

    it('devuelve 400 con hashid inválido', async () => {
        const response = await auth(request(app).delete('/api/warehouse/not-a-hashid'));

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 404 cuando la bodega no existe', async () => {
        const response = await auth(
            request(app).delete(`/api/warehouse/${Utils.encode(999999)}`)
        );

        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 403 sin JWT', async () => {
        const response = await request(app).delete('/api/warehouse/any-id');

        expect(response.status).toBe(403);
    });
});
```

- [ ] **Step 2: Run and confirm "no existe" fails**

Run: `npx jest tests/domain/operations-inventory-warehouse --runInBand -t "eliminar bodega"`
Expected: FAIL on "no existe" (today the controller responds `200 { data:
undefined }` because the service only returns a truthy message when
`result` is truthy, and the controller never checks) and on "hashid
inválido" (unguarded `Utils.decode`, no `AppError` shape today).

- [ ] **Step 3: Retrofit the service's `deleteWarehouse`**

Modify `deleteWarehouse` in `src/services/operations/inventory/warehouse.services.js`:

```js
    static async deleteWarehouse(id) {
        try {
            const result = await Warehouse.destroy({
                where: { id }
            });
            if (!result) {
                throw new AppError('Bodega no encontrada', 404);
            }
            return 'resource deleted successfully'
        } catch (error) {
            throw error;
        }
    }
```

- [ ] **Step 4: Retrofit the controller**

Modify `src/controllers/operations/inventory/warehouse.controller.js:45-54`:

```js
const deleteWarehouse = async (req, res, next) => {
    try {
        const warehouseId = decodeId(req.params.warehouse_id, 'warehouse_id');
        const result = await WarehouseService.deleteWarehouse(warehouseId);
        res.status(200).json({ data: result })
    } catch (error) {
        next(error);
    }
}
```

- [ ] **Step 5: Run and confirm all pass**

Run: `npx jest tests/domain/operations-inventory-warehouse --runInBand`
Expected: PASS (16 tests)

- [ ] **Step 6: Commit**

```bash
git add tests/domain/operations-inventory-warehouse/warehouse.test.js src/controllers/operations/inventory/warehouse.controller.js src/services/operations/inventory/warehouse.services.js
git commit -m "test+fix: deleteWarehouse valida hashid y responde 404 cuando la bodega no existe"
```

---

### Task 5: `getStockProduct` — decodeId, 404 en el controller (sin tocar el contrato del service)

**Files:**
- Modify: `src/controllers/operations/inventory/warehouse.controller.js:57-66`
- Test: `tests/domain/operations-inventory-warehouse/warehouse.test.js`

**Interfaces:**
- Consumes: `decodeId` (controller, Task 1), `AppError` (controller, Task 1), `createWarehouseFixture`, `createProductFixture`, `createStockFixture` (Task 1).
- **Does not modify** `WarehouseService.getStockProduct` — it keeps returning `null` on a missing stock, exactly as today. `src/controllers/reports/generateTransactionsExcel.js` calls this same service method directly and already does its own `if (!result) throw new AppError(...)` check against that `null` — changing the service's contract here would be a breaking change for that other caller. The 404 in this task is added only inside `warehouse.controller.js`'s own `getStockProduct` handler.

- [ ] **Step 1: Add the failing tests**

```js
// =========================================================================
// GET /api/warehouse/:stock_id/stockProduct
// =========================================================================

describe('GET /api/warehouse/:stock_id/stockProduct', () => {
    it('devuelve 200 con el stock y la cantidad correcta', async () => {
        const warehouse = await createWarehouseFixture();
        const product = await createProductFixture();
        const stock = await createStockFixture(product.id, warehouse.id, null, { quantity: 15 });

        const response = await auth(
            request(app).get(`/api/warehouse/${Utils.encode(stock.id)}/stockProduct`)
        );

        expect(response.status).toBe(200);
        expect(response.body.quantity).toBe(15);
        expect(response.body.product.name).toBe(product.name);
        expect(response.body.warehouse.name).toBe(warehouse.name);
    });

    it('devuelve 400 con hashid inválido', async () => {
        const response = await auth(
            request(app).get('/api/warehouse/not-a-hashid/stockProduct')
        );

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 404 cuando el stock no existe', async () => {
        const response = await auth(
            request(app).get(`/api/warehouse/${Utils.encode(999999)}/stockProduct`)
        );

        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 403 sin JWT', async () => {
        const response = await request(app).get('/api/warehouse/any-id/stockProduct');

        expect(response.status).toBe(403);
    });
});
```

- [ ] **Step 2: Run and confirm the new failure modes**

Run: `npx jest tests/domain/operations-inventory-warehouse --runInBand -t "stockProduct"`
Expected: FAIL on "no existe" — today this crashes with an unhandled
`TypeError: Cannot read properties of null (reading 'product')` inside the
try block; since it's still inside the `try`, the `catch` reports it as a
`400` with the raw `TypeError` message, not a clean `404` with
`{error:{code:'AppError'}}`. Also FAIL on "hashid inválido" for the same
reason as prior tasks.

- [ ] **Step 3: Retrofit the controller**

Modify `src/controllers/operations/inventory/warehouse.controller.js:57-66`:

```js
const getStockProduct = async (req, res, next) => {
    try {
        const stockId = decodeId(req.params.stock_id, 'stock_id');
        const result = await WarehouseService.getStockProduct(stockId);
        if (!result) {
            throw new AppError('Stock no encontrado', 404);
        }
        result.quantity = await Quantity.viewCorrectQuantity(result.product, result.quantity)
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};
```

- [ ] **Step 4: Run and confirm all pass**

Run: `npx jest tests/domain/operations-inventory-warehouse --runInBand`
Expected: PASS (20 tests)

- [ ] **Step 5: Commit**

```bash
git add tests/domain/operations-inventory-warehouse/warehouse.test.js src/controllers/operations/inventory/warehouse.controller.js
git commit -m "test+fix: getStockProduct responde 404 en vez de crashear sobre stock inexistente"
```

---

### Task 6: Verificación final del dominio y de la suite completa

**Files:** none (verification only), plus the spec status line.

**Interfaces:** none.

- [ ] **Step 1: Run the domain suite three times in isolation to rule out flakiness**

Run: `npx jest tests/domain/operations-inventory-warehouse --runInBand` (three times)
Expected: PASS (20 tests) all three times, matching the verification bar
used by `products`/`transactions`.

- [ ] **Step 2: Run the full repo test suite to confirm no cross-domain regressions**

Run: `npx jest --runInBand --roots tests`
Expected: all suites PASS. `--roots tests` is required — a bare `npx jest
--runInBand` also sweeps up `.claude/worktrees/*/tests/**/*.test.js` from
unrelated leftover worktrees (verified in the `products` and `transactions`
plans), which is not what this check is for.

Pay particular attention to `tests/domain/operations-orders` (or any
report-generation test that touches `generateTransactionsExcel`) and any
`yachtRequest` domain tests — those are the two other domains that call
into `WarehouseService` directly (see Global Constraints). If either
regresses, it means `getStockProduct`'s or `getWarehouseById`'s contract
was accidentally changed somewhere in Tasks 1-5; stop and investigate
rather than proceeding.

- [ ] **Step 3: Re-read the diff against the spec's contract table**

Manually check `git diff <first-warehouse-commit>~1..HEAD -- src/controllers/operations/inventory/warehouse.controller.js src/services/operations/inventory/warehouse.services.js` against the "Contrato HTTP" table in `docs/superpowers/specs/2026-08-21-fase-2-inventory-warehouse-design.md` — every row must have a corresponding test from Tasks 1-5.

- [ ] **Step 4: Update the spec status**

Modify `docs/superpowers/specs/2026-08-21-fase-2-inventory-warehouse-design.md:4`:

```
**Estado:** Implementado
```

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/specs/2026-08-21-fase-2-inventory-warehouse-design.md
git commit -m "docs: marcar spec de inventory/warehouse como implementado"
```

At this point the domain is done and green, and this is also the last
domain in the `operations/inventory` subtree. Merging/pushing this branch
(it was built in an isolated worktree per this plan's Architecture section)
is a separate, explicit step — confirm with the user before merging or
pushing.
