# Fase 2 — Dominio Inventory/Products — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retrofit the `inventory/products` domain (`/api/products`, 10 endpoints) to the `AppError`/`next(error)` error-handling standard, fix the four verified 200-instead-of-404 bugs, fix the PK-encoding no-op in `getProduct`, and cover the domain with real-DB tests.

**Architecture:** No new files besides the test suite. `src/controllers/operations/inventory/products.controller.js` and `src/services/operations/inventory/products.services.js` are modified in place, endpoint by endpoint. Each task retrofits one or two related handlers and adds the tests that pin down their new behavior. `src/routes/operations/inventory/products.routes.js` needs no changes — Express already passes `next` to every route handler regardless of whether the handler declares it.

**Tech Stack:** Express, Sequelize (MySQL), Jest + Supertest (real DB, no mocks), existing `AppError`/`errorHandler` middleware, `hashids` via `src/utils/Utils.js`.

**Spec:** `docs/superpowers/specs/2026-08-20-fase-2-inventory-products-design.md`

## Global Constraints

- All 10 handlers end up with signature `(req, res, next)` and every `catch` block calls `next(error)` — no handler keeps `res.status(400).json(error.message)`.
- Hashid params (`product_id`, `warehouse_id`, `stock_id`, `data.userId`) are decoded through a local `decodeId(value, fieldName)` helper that throws `AppError('${fieldName} inválido', 400)` on failure. `configuration_id` is **not** hashid-encoded — do not decode it (confirmed out of scope in the spec).
- "Not found" on `updateProduct` and `switchConfirguration` is detected by fetching the row first (`findByPk`) and throwing `AppError(msg, 404)` if absent — **never** by checking `affectedRows === 0` (verified empirically: MySQL without `CLIENT_FOUND_ROWS` reports `affectedRows: 0` both for a missing row and for an idempotent no-op update; using it would produce false 404s).
- Every new/changed error path that a client can trigger gets a test asserting the exact status code and, where applicable, `response.body.error.code === 'AppError'`.
- Run `npx jest tests/domain/operations-inventory-products --runInBand` after every task; it must stay green from Task 1 onward (each task only adds tests for behavior that task itself implements).

---

### Task 1: Test scaffold, fixtures, `decodeId` helper, `getProducts` + `getProduct`

**Files:**
- Create: `tests/domain/operations-inventory-products/products.test.js`
- Modify: `src/controllers/operations/inventory/products.controller.js:1-3` (imports), `:20-32` (`getProducts`), `:72-83` (`getProduct`)

**Interfaces:**
- Produces: `decodeId(value, fieldName)` in the controller module scope — used by every later task that touches `product_id`, `warehouse_id`, `stock_id`, or `data.userId`.
- Produces fixture helpers in the test file, reused by every later task: `createStaffFixture()`, `createWarehouseFixture(yachtId, overrides)`, `createProductFixture(overrides)`, `createProductConfigFixture(productId, overrides)`, `createStockFixture(productId, warehouseId, companyId, overrides)`, plus `auth(httpRequest)` and `suffix()`.

- [ ] **Step 1: Write the test file with fixtures and the first two describe blocks**

```js
const request = require('supertest');
const { bootTestApp, shutdownTestApp } = require('../../helpers/testApp');
const { createAuthenticatedUser } = require('../../helpers/auth');
const { createDepartment, createPosition, createCompanyWithYacht } = require('../../helpers/staffFixtures');
const Staff = require('../../../src/models/catalogs/staff.models');
const Warehouse = require('../../../src/models/catalogs/wareHouse.models');
const Product = require('../../../src/models/operations/inventory/product.models');
const ProductConfiguration = require('../../../src/models/operations/inventory/productConfiguration');
const Stock = require('../../../src/models/operations/inventory/stock.models');
const Transaction = require('../../../src/models/operations/inventory/transaction.models');
const Utils = require('../../../src/utils/Utils');

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

async function createStaffFixture() {
    const dept = await createDepartment(`Dept-${suffix()}`);
    const pos = await createPosition(`Pos-${suffix()}`);
    const s = suffix();
    return Staff.create({
        firstName: 'TEST',
        lastName: `Product${s}`,
        email: `product-test-${s}@example.com`,
        cellPhone: '0966666666',
        password: 'Sup3rSecret!',
        departamentId: dept.id,
        positionId: pos.id,
        contractType: 'Fijo',
        active: true,
    });
}

async function createWarehouseFixture(yachtId, overrides = {}) {
    return Warehouse.create({
        name: `Warehouse-${suffix()}`,
        location: 'Bodega Test',
        type: 'Yate',
        yachtId,
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

async function createProductConfigFixture(productId, overrides = {}) {
    return ProductConfiguration.create({
        name: `Config-${suffix()}`,
        group: 'default',
        productId,
        sixteenPax: '1',
        eighteenPax: '1',
        twentyPax: '1',
        twentyTwoPax: '1',
        twentyFourPax: '1',
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
// GET /api/products
// =========================================================================

describe('GET /api/products — lista de productos', () => {
    it('devuelve 200 con la lista de productos', async () => {
        await createProductFixture();

        const response = await auth(request(app).get('/api/products'));

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
    });

    it('devuelve 403 sin JWT', async () => {
        const response = await request(app).get('/api/products');

        expect(response.status).toBe(403);
    });
});

// =========================================================================
// GET /api/products/:product_id
// =========================================================================

describe('GET /api/products/:product_id — producto por ID', () => {
    it('devuelve 200 con el id codificado como hashid', async () => {
        const product = await createProductFixture();

        const response = await auth(
            request(app).get(`/api/products/${Utils.encode(product.id)}`)
        );

        expect(response.status).toBe(200);
        expect(response.body.id).toBe(Utils.encode(product.id));
    });

    it('devuelve 400 con hashid inválido', async () => {
        const response = await auth(
            request(app).get('/api/products/not-a-hashid')
        );

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 404 cuando el producto no existe', async () => {
        const response = await auth(
            request(app).get(`/api/products/${Utils.encode(999999)}`)
        );

        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 403 sin JWT', async () => {
        const response = await request(app).get('/api/products/any-id');

        expect(response.status).toBe(403);
    });
});
```

- [ ] **Step 2: Run the suite and confirm it fails on the new tests**

Run: `npx jest tests/domain/operations-inventory-products --runInBand`
Expected: FAIL — `GET /api/products/:product_id` tests fail because the current
handler returns 200 with the raw numeric id (PK-encoding bug), returns 200
with `null` for a missing id instead of 404, and the hashid-decode error is
unhandled (no `AppError`/`next` wiring yet, so it 400s via the old catch but
`response.body.error` doesn't exist — assert on that shape failing is
expected here).

- [ ] **Step 3: Add the `decodeId` helper and retrofit `getProducts` / `getProduct`**

Modify `src/controllers/operations/inventory/products.controller.js:1-3`:

```js
const ProductService = require('../../../services/operations/inventory/products.services');
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
```

Modify `getProducts` (originally lines 20-32):

```js
const getProducts = async (req, res, next) => {
    try {
        const result = await ProductService.getAll();
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

Modify `getProduct` (originally lines 72-83) — fixes the PK-encoding no-op
(`.dataValues.id`, not `.id`) and the missing 404:

```js
const getProduct = async (req, res, next) => {
    try {
        const productId = decodeId(req.params.product_id, 'product_id');
        const result = await ProductService.getProductById(productId);
        if (!result) throw new AppError('Producto no encontrado', 404);
        result.dataValues.id = Utils.encode(result.dataValues.id);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}
```

- [ ] **Step 4: Run the suite and confirm the new tests pass**

Run: `npx jest tests/domain/operations-inventory-products --runInBand`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add tests/domain/operations-inventory-products/products.test.js src/controllers/operations/inventory/products.controller.js
git commit -m "test+fix: retrofit getProducts/getProduct a AppError, corregir PK-encoding y 404 de getProduct"
```

---

### Task 2: `findProduct` — 404 en vez de 400

**Files:**
- Modify: `src/controllers/operations/inventory/products.controller.js:5-18`
- Test: `tests/domain/operations-inventory-products/products.test.js`

**Interfaces:**
- Consumes: nothing new from Task 1 (uses `AppError`, already imported).

- [ ] **Step 1: Add the failing tests**

Append to the test file:

```js
// =========================================================================
// GET /api/products/findProduct/:sku
// =========================================================================

describe('GET /api/products/findProduct/:sku — buscar por SKU', () => {
    it('devuelve 200 con el producto encontrado', async () => {
        const product = await createProductFixture();

        const response = await auth(
            request(app).get(`/api/products/findProduct/${product.sku}`)
        );

        expect(response.status).toBe(200);
        expect(response.body.data.sku).toBe(product.sku);
    });

    it('devuelve 404 cuando el sku no existe', async () => {
        const response = await auth(
            request(app).get(`/api/products/findProduct/NOPE-${suffix()}`)
        );

        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 403 sin JWT', async () => {
        const response = await request(app).get('/api/products/findProduct/any-sku');

        expect(response.status).toBe(403);
    });
});
```

- [ ] **Step 2: Run and confirm the 404 test fails**

Run: `npx jest tests/domain/operations-inventory-products --runInBand -t "buscar por SKU"`
Expected: FAIL on "devuelve 404 cuando el sku no existe" — current handler returns 400.

- [ ] **Step 3: Retrofit `findProduct`**

Modify `src/controllers/operations/inventory/products.controller.js:5-18`:

```js
const findProduct = async (req, res, next) => {
    try {
        const sku = req.params.sku.replace(/^0+/, '');
        const result = await ProductService.findProduct(sku);
        if (!result) throw new AppError(`Producto no encontrado para sku: ${sku}`, 404);
        res.status(200).json({ data: result });
    } catch (error) {
        next(error);
    }
}
```

- [ ] **Step 4: Run and confirm all pass**

Run: `npx jest tests/domain/operations-inventory-products --runInBand`
Expected: PASS (9 tests)

- [ ] **Step 5: Commit**

```bash
git add tests/domain/operations-inventory-products/products.test.js src/controllers/operations/inventory/products.controller.js
git commit -m "test+fix: findProduct responde 404 en vez de 400 cuando el sku no existe"
```

---

### Task 3: `getProductsWithConfigurations` — retrofit sin cambio de comportamiento

**Files:**
- Modify: `src/controllers/operations/inventory/products.controller.js:34-48`
- Test: `tests/domain/operations-inventory-products/products.test.js`

**Interfaces:**
- Consumes: `createProductFixture`, `createProductConfigFixture` from Task 1.

- [ ] **Step 1: Add the failing test**

```js
// =========================================================================
// GET /api/products/allProductsWithConfigurations
// =========================================================================

describe('GET /api/products/allProductsWithConfigurations', () => {
    it('devuelve 200 con las configuraciones activas', async () => {
        const product = await createProductFixture();
        await createProductConfigFixture(product.id);

        const response = await auth(
            request(app).get('/api/products/allProductsWithConfigurations')
        );

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
    });

    it('devuelve 403 sin JWT', async () => {
        const response = await request(app).get('/api/products/allProductsWithConfigurations');

        expect(response.status).toBe(403);
    });
});
```

- [ ] **Step 2: Run and confirm the 403 test passes but nothing regresses**

Run: `npx jest tests/domain/operations-inventory-products --runInBand -t "allProductsWithConfigurations"`
Expected: PASS already (this endpoint's happy path doesn't change) — this
step is a sanity check, not a red step; skip to Step 3 directly if both
pass.

- [ ] **Step 3: Retrofit to `next(error)`**

Modify `src/controllers/operations/inventory/products.controller.js:34-48`:

```js
const getProductsWithConfigurations = async (req, res, next) => {
    try {
        const result = await ProductService.getProductsWithConfigurations();
        if (result instanceof Array) {
            result.map((x) => {
                x.product.wineries.map(warehose => {
                    warehose.dataValues.warehouseId = Utils.encode(warehose.dataValues.warehouseId);
                })
            });
        }
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}
```

- [ ] **Step 4: Run the full domain suite**

Run: `npx jest tests/domain/operations-inventory-products --runInBand`
Expected: PASS (11 tests)

- [ ] **Step 5: Commit**

```bash
git add tests/domain/operations-inventory-products/products.test.js src/controllers/operations/inventory/products.controller.js
git commit -m "test+fix: retrofit getProductsWithConfigurations a next(error)"
```

---

### Task 4: `createProduct` — sku requerido + AppError en SKU duplicado

**Files:**
- Modify: `src/controllers/operations/inventory/products.controller.js:85-97`
- Modify: `src/services/operations/inventory/products.services.js:1-10` (imports), `:151-181` (`createProduct`)
- Test: `tests/domain/operations-inventory-products/products.test.js`

**Interfaces:**
- Consumes: `AppError` (controller already imports it from Task 1; service needs its own import).

- [ ] **Step 1: Add the failing tests**

```js
// =========================================================================
// POST /api/products/createProduct
// =========================================================================

describe('POST /api/products/createProduct — crear producto', () => {
    it('devuelve 200 al crear un producto', async () => {
        const s = suffix();
        const response = await auth(
            request(app)
                .post('/api/products/createProduct')
                .send({ name: `Nuevo-${s}`, sku: `NEW-${s}`, type: 'DISCRETE', unit: 'unidad' })
        );

        expect(response.status).toBe(200);
        expect(response.body.data).toBe('resource created successfully');
    });

    it('devuelve 400 cuando falta sku', async () => {
        const response = await auth(
            request(app)
                .post('/api/products/createProduct')
                .send({ name: `SinSku-${suffix()}`, type: 'DISCRETE', unit: 'unidad' })
        );

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 400 cuando el sku ya existe', async () => {
        const existing = await createProductFixture();

        const response = await auth(
            request(app)
                .post('/api/products/createProduct')
                .send({ name: `Dup-${suffix()}`, sku: existing.sku, type: 'DISCRETE', unit: 'unidad' })
        );

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 403 sin JWT', async () => {
        const response = await request(app).post('/api/products/createProduct').send({});

        expect(response.status).toBe(403);
    });
});
```

- [ ] **Step 2: Run and confirm the sku-related tests fail**

Run: `npx jest tests/domain/operations-inventory-products --runInBand -t "crear producto"`
Expected: FAIL on "falta sku" (currently throws an uncaught `TypeError` from
`.replace()` on `undefined`, still surfaces as 400 via the old catch-all but
without `response.body.error.code`) and on "sku ya existe" (currently a
generic `Error`, same issue).

- [ ] **Step 3: Add `AppError` import and duplicate-sku fix in the service**

Modify `src/services/operations/inventory/products.services.js:1-10`:

```js
const Product = require('../../../models/operations/inventory/product.models');
const LaundryYacht = require('../../../models/operations/yachtRequest/laundryYacht');
const db = require('../../../utils/database');
const ProductConfiguration = require('../../../models/operations/inventory/productConfiguration');
const Stock = require('../../../models/operations/inventory/stock.models');
const Company = require('../../../models/catalogs/company.models');
const { Sequelize, Op } = require('sequelize');
const StockHistory = require('../../../models/operations/inventory/stockHistory.models');
const Transaction = require('../../../models/operations/inventory/transaction.models');
const Quantity = require('../../../utils/quantity');
const AppError = require('../../../errors/AppError');
```

Modify `createProduct` (originally lines 151-181), only the duplicate-sku
branch changes:

```js
    static async createProduct(data) {
        const transaction = await db.transaction();
        try {

            const product = await Product.findOne({
                where: { sku: data.sku },
                transaction
            });

            if (product) {
                throw new AppError(`El producto con el SKU: ${product.sku} ya existe`, 400);
            }

            const result = await Product.create(data, { transaction });

            if (Array.isArray(data.configurations) && data.configurations.length > 0) {
                const configurations = data.configurations.map(config => ({
                    ...config,
                    productId: result.id,
                }));

                await ProductConfiguration.bulkCreate(configurations, { transaction });
            }

            await transaction.commit();
            return result;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
```

- [ ] **Step 4: Add the sku-required guard and `next(error)` wiring in the controller**

Modify `src/controllers/operations/inventory/products.controller.js:85-97`:

```js
const createProduct = async (req, res, next) => {
    try {
        const product = req.body;
        if (!product.sku) {
            throw new AppError('sku es requerido', 400);
        }
        product.sku = product.sku.replace(/^0+/, '');
        const result = await ProductService.createProduct(product);
        if (result) {
            res.status(200).json({ data: 'resource created successfully' });
        }
    } catch (error) {
        next(error);
    }
}
```

- [ ] **Step 5: Run and confirm all pass**

Run: `npx jest tests/domain/operations-inventory-products --runInBand`
Expected: PASS (15 tests)

- [ ] **Step 6: Commit**

```bash
git add tests/domain/operations-inventory-products/products.test.js src/controllers/operations/inventory/products.controller.js src/services/operations/inventory/products.services.js
git commit -m "test+fix: createProduct exige sku y clasifica SKU duplicado como AppError 400"
```

---

### Task 5: `updateProduct` — sku requerido + decodeId + 404 "buscar primero"

**Files:**
- Modify: `src/controllers/operations/inventory/products.controller.js:99-109`
- Modify: `src/services/operations/inventory/products.services.js:184-252`
- Test: `tests/domain/operations-inventory-products/products.test.js`

**Interfaces:**
- Consumes: `decodeId` (controller, Task 1), `AppError` (service, Task 4).
- Produces: `ProductService.updateProduct` now throws `AppError('Producto no encontrado', 404)` when `id` doesn't exist — no other caller depends on its previous silent-success behavior (only this controller calls it).

- [ ] **Step 1: Add the failing tests**

```js
// =========================================================================
// PUT /api/products/updateProduct/:product_id
// =========================================================================

describe('PUT /api/products/updateProduct/:product_id — actualizar producto', () => {
    it('devuelve 200 al actualizar el producto', async () => {
        const product = await createProductFixture();

        const response = await auth(
            request(app)
                .put(`/api/products/updateProduct/${Utils.encode(product.id)}`)
                .send({ name: 'Actualizado', sku: product.sku, type: 'DISCRETE', unit: 'unidad' })
        );

        expect(response.status).toBe(200);
        expect(response.body.data).toBe('resource updated successfully');
    });

    it('devuelve 200 al reenviar los mismos valores (update idempotente)', async () => {
        const product = await createProductFixture();

        const response = await auth(
            request(app)
                .put(`/api/products/updateProduct/${Utils.encode(product.id)}`)
                .send({ name: product.name, sku: product.sku, type: 'DISCRETE', unit: 'unidad' })
        );

        expect(response.status).toBe(200);
    });

    it('devuelve 400 con hashid inválido', async () => {
        const response = await auth(
            request(app)
                .put('/api/products/updateProduct/not-a-hashid')
                .send({ name: 'X', sku: 'X', type: 'DISCRETE' })
        );

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 400 cuando falta sku', async () => {
        const product = await createProductFixture();

        const response = await auth(
            request(app)
                .put(`/api/products/updateProduct/${Utils.encode(product.id)}`)
                .send({ name: 'X', type: 'DISCRETE' })
        );

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 404 cuando el producto no existe', async () => {
        const response = await auth(
            request(app)
                .put(`/api/products/updateProduct/${Utils.encode(999999)}`)
                .send({ name: 'X', sku: `X-${suffix()}`, type: 'DISCRETE' })
        );

        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 403 sin JWT', async () => {
        const response = await request(app).put('/api/products/updateProduct/any-id').send({});

        expect(response.status).toBe(403);
    });
});
```

The idempotent-update test is the regression guard for the `affectedRows`
pitfall documented in the spec: it must return 200, not 404.

- [ ] **Step 2: Run and confirm the new failure modes**

Run: `npx jest tests/domain/operations-inventory-products --runInBand -t "actualizar producto"`
Expected: FAIL on "hashid inválido" (500/undefined behavior today), "falta
sku" (uncaught `TypeError`), and "no existe" (currently 200, not 404).

- [ ] **Step 3: Add the "buscar primero" existence check in the service**

Modify `src/services/operations/inventory/products.services.js:184-252`,
only the opening lines change:

```js
    static async updateProduct(product, id) {
        const transaction = await db.transaction();

        try {
            const existing = await Product.findByPk(id, { transaction });
            if (!existing) {
                throw new AppError('Producto no encontrado', 404);
            }

            const result = await Product.update(
                {
                    name: product.name,
                    sku: product.sku,
                    type: product.type,
                    unit: product.unit,
                    presentationQuantity: product.presentationQuantity
                },
                {
                    where: { id },
                    transaction
                }
            );

            if (Array.isArray(product.configurations)) {

                const incomingConfigs = product.configurations;
                const incomingIds = incomingConfigs
                    .filter(cfg => cfg.id)
                    .map(cfg => cfg.id);

                await ProductConfiguration.destroy({
                    where: {
                        productId: id,
                        ...(incomingIds.length && { id: { [Op.notIn]: incomingIds } })
                    },
                    transaction
                });

                for (const config of incomingConfigs) {
                    if (config.id) {
                        await ProductConfiguration.update(
                            {
                                name: config.name,
                                group: config.group,
                                sixteenPax: config.sixteenPax,
                                eighteenPax: config.eighteenPax,
                                twentyPax: config.twentyPax,
                                twentyTwoPax: config.twentyTwoPax,
                                twentyFourPax: config.twentyFourPax,
                            },
                            {
                                where: { id: config.id },
                                transaction
                            }
                        );
                    } else {
                        await ProductConfiguration.create(
                            {
                                ...config,
                                productId: id
                            },
                            { transaction }
                        );
                    }
                }
            }

            await transaction.commit();
            return result
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
```

- [ ] **Step 4: Add sku-required guard, `decodeId`, and `next(error)` in the controller**

Modify `src/controllers/operations/inventory/products.controller.js:99-109`:

```js
const updateProduct = async (req, res, next) => {
    try {
        const productId = decodeId(req.params.product_id, 'product_id');
        const product = req.body;
        if (!product.sku) {
            throw new AppError('sku es requerido', 400);
        }
        product.sku = product.sku.replace(/^0+/, '');
        await ProductService.updateProduct(product, productId);
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        next(error);
    }
}
```

- [ ] **Step 5: Run and confirm all pass**

Run: `npx jest tests/domain/operations-inventory-products --runInBand`
Expected: PASS (21 tests)

- [ ] **Step 6: Commit**

```bash
git add tests/domain/operations-inventory-products/products.test.js src/controllers/operations/inventory/products.controller.js src/services/operations/inventory/products.services.js
git commit -m "test+fix: updateProduct valida sku/hashid y responde 404 real via buscar-primero (no affectedRows)"
```

---

### Task 6: `deleteProduct` — decodeId + 404

**Files:**
- Modify: `src/controllers/operations/inventory/products.controller.js:111-120`
- Modify: `src/services/operations/inventory/products.services.js:255-266`
- Test: `tests/domain/operations-inventory-products/products.test.js`

**Interfaces:**
- Consumes: `decodeId` (controller, Task 1), `AppError` (service, Task 4).

- [ ] **Step 1: Add the failing tests**

```js
// =========================================================================
// DELETE /api/products/:product_id
// =========================================================================

describe('DELETE /api/products/:product_id — eliminar producto', () => {
    it('devuelve 200 al eliminar el producto', async () => {
        const product = await createProductFixture();

        const response = await auth(
            request(app).delete(`/api/products/${Utils.encode(product.id)}`)
        );

        expect(response.status).toBe(200);
        expect(response.body.data).toBe('resource deleted successfully');
    });

    it('devuelve 400 con hashid inválido', async () => {
        const response = await auth(request(app).delete('/api/products/not-a-hashid'));

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 404 cuando el producto no existe', async () => {
        const response = await auth(
            request(app).delete(`/api/products/${Utils.encode(999999)}`)
        );

        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 403 sin JWT', async () => {
        const response = await request(app).delete('/api/products/any-id');

        expect(response.status).toBe(403);
    });
});
```

- [ ] **Step 2: Run and confirm "no existe" fails**

Run: `npx jest tests/domain/operations-inventory-products --runInBand -t "eliminar producto"`
Expected: FAIL on "no existe" (today: 200 with `data: undefined`) and on
"hashid inválido" (`response.body.error` doesn't exist today).

- [ ] **Step 3: Retrofit the service's `delete`**

Modify `src/services/operations/inventory/products.services.js:255-266`:

```js
    static async delete(productId) {
        try {
            const result = await Product.destroy({
                where: { id: productId }
            });
            if (!result) {
                throw new AppError('Producto no encontrado', 404);
            }
            return 'resource deleted successfully'
        } catch (error) {
            throw error;
        }
    }
```

- [ ] **Step 4: Retrofit the controller**

Modify `src/controllers/operations/inventory/products.controller.js:111-120`:

```js
const deleteProduct = async (req, res, next) => {
    try {
        const productId = decodeId(req.params.product_id, 'product_id');
        const result = await ProductService.delete(productId);
        res.status(200).json({ data: result })
    } catch (error) {
        next(error);
    }
}
```

- [ ] **Step 5: Run and confirm all pass**

Run: `npx jest tests/domain/operations-inventory-products --runInBand`
Expected: PASS (25 tests)

- [ ] **Step 6: Commit**

```bash
git add tests/domain/operations-inventory-products/products.test.js src/controllers/operations/inventory/products.controller.js src/services/operations/inventory/products.services.js
git commit -m "test+fix: deleteProduct valida hashid y responde 404 cuando el producto no existe"
```

---

### Task 7: `switchConfirguration` — 404 "buscar primero"

**Files:**
- Modify: `src/controllers/operations/inventory/products.controller.js:123-137`
- Modify: `src/services/operations/inventory/products.services.js:268-275`
- Test: `tests/domain/operations-inventory-products/products.test.js`

**Interfaces:**
- Consumes: `AppError` (service, Task 4).
- Produces: `ProductService.switchConfirguration(data, configurationId)` — signature change from `(data, options)` to `(data, configurationId)`; the only caller is this controller, updated in the same task.

- [ ] **Step 1: Add the failing tests**

```js
// =========================================================================
// PUT /api/products/configurations/switchConfiguration/:configuration_id
// =========================================================================

describe('PUT /api/products/configurations/switchConfiguration/:configuration_id', () => {
    it('devuelve 200 al actualizar la configuración', async () => {
        const product = await createProductFixture();
        const config = await createProductConfigFixture(product.id);

        const response = await auth(
            request(app)
                .put(`/api/products/configurations/switchConfiguration/${config.id}`)
                .send({ active: false })
        );

        expect(response.status).toBe(200);
        expect(response.body.data).toBe('resource updated successfully');
    });

    it('devuelve 404 cuando la configuración no existe', async () => {
        const response = await auth(
            request(app)
                .put('/api/products/configurations/switchConfiguration/999999')
                .send({ active: false })
        );

        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 403 sin JWT', async () => {
        const response = await request(app)
            .put('/api/products/configurations/switchConfiguration/1')
            .send({});

        expect(response.status).toBe(403);
    });
});
```

- [ ] **Step 2: Run and confirm "no existe" fails**

Run: `npx jest tests/domain/operations-inventory-products --runInBand -t "switchConfiguration"`
Expected: FAIL on "no existe" — today it returns 200 (the `[0]`
affected-rows array is truthy).

- [ ] **Step 3: Retrofit the service**

Modify `src/services/operations/inventory/products.services.js:268-275`:

```js
    static async switchConfirguration(data, configurationId) {
        try {
            const existing = await ProductConfiguration.findByPk(configurationId);
            if (!existing) {
                throw new AppError('Configuración no encontrada', 404);
            }
            await ProductConfiguration.update(data, { where: { id: configurationId } });
            return true;
        } catch (error) {
            throw error;
        }
    }
```

- [ ] **Step 4: Retrofit the controller**

Modify `src/controllers/operations/inventory/products.controller.js:123-137`:

```js
const switchConfirguration = async (req, res, next) => {
    try {
        const configurationId = req.params.configuration_id;
        const data = req.body
        await ProductService.switchConfirguration(data, configurationId);
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        next(error);
    }
}
```

- [ ] **Step 5: Run and confirm all pass**

Run: `npx jest tests/domain/operations-inventory-products --runInBand`
Expected: PASS (28 tests)

- [ ] **Step 6: Commit**

```bash
git add tests/domain/operations-inventory-products/products.test.js src/controllers/operations/inventory/products.controller.js src/services/operations/inventory/products.services.js
git commit -m "test+fix: switchConfirguration responde 404 real via buscar-primero (no affectedRows)"
```

---

### Task 8: `getProductsByWarehouse` — decodeId

**Files:**
- Modify: `src/controllers/operations/inventory/products.controller.js:50-70`
- Test: `tests/domain/operations-inventory-products/products.test.js`

**Interfaces:**
- Consumes: `decodeId` (Task 1), `createCompanyWithYacht` (`tests/helpers/staffFixtures.js`, already imported in Task 1), `createWarehouseFixture`, `createProductFixture`, `createStockFixture` (Task 1).

- [ ] **Step 1: Add the failing tests**

```js
// =========================================================================
// GET /api/products/:warehouse_id/stocks
// =========================================================================

describe('GET /api/products/:warehouse_id/stocks — stock por warehouse', () => {
    it('devuelve 200 con el stock del warehouse', async () => {
        const { company, yacht } = await createCompanyWithYacht(`StockCo-${suffix()}`);
        const warehouse = await createWarehouseFixture(yacht.id);
        const product = await createProductFixture();
        await createStockFixture(product.id, warehouse.id, company.id);

        const response = await auth(
            request(app).get(`/api/products/${Utils.encode(warehouse.id)}/stocks`)
        );

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body).toHaveLength(1);
        expect(response.body[0].product.sku).toBe(product.sku);
    });

    it('devuelve 400 con hashid inválido', async () => {
        const response = await auth(
            request(app).get('/api/products/not-a-hashid/stocks')
        );

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 403 sin JWT', async () => {
        const response = await request(app).get('/api/products/any-id/stocks');

        expect(response.status).toBe(403);
    });
});
```

- [ ] **Step 2: Run and confirm "hashid inválido" fails**

Run: `npx jest tests/domain/operations-inventory-products --runInBand -t "stock por warehouse"`
Expected: FAIL on "hashid inválido" — today `Utils.decode` returns
`undefined`, which is interpolated into the raw `Sequelize.literal` SQL and
either produces a SQL error (500-ish) or silently misbehaves, not a clean
`AppError` 400.

- [ ] **Step 3: Retrofit the controller**

Modify `src/controllers/operations/inventory/products.controller.js:50-70`:

```js
const getProductsByWarehouse = async (req, res, next) => {
    try {
        const warehouseId = decodeId(req.params.warehouse_id, 'warehouse_id');
        const result = await ProductService.getProductsByWarehouse(warehouseId);

        if (result instanceof Array) {
            result.map((x) => {
                x.id = Utils.encode(x.id);
                x.companyId = Utils.encode(x.companyId);
                x.productId = Utils.encode(x.productId);
                x.quantity = Quantity.viewCorrectQuantity(x.product, x.quantity)
                x.totalBarConsumption = Quantity.viewCorrectQuantity(x.product, x.totalBarConsumption)

            });
        }
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}
```

- [ ] **Step 4: Run and confirm all pass**

Run: `npx jest tests/domain/operations-inventory-products --runInBand`
Expected: PASS (31 tests)

- [ ] **Step 5: Commit**

```bash
git add tests/domain/operations-inventory-products/products.test.js src/controllers/operations/inventory/products.controller.js
git commit -m "test+fix: getProductsByWarehouse valida el hashid antes de usarlo en SQL crudo"
```

---

### Task 9: `updateStock` — decodeId, validación explícita, 404 con AppError

**Files:**
- Modify: `src/controllers/operations/inventory/products.controller.js:139-150`
- Modify: `src/services/operations/inventory/products.services.js:277-358`
- Test: `tests/domain/operations-inventory-products/products.test.js`

**Interfaces:**
- Consumes: `decodeId` (Task 1), `AppError` (service, Task 4), `createStaffFixture`, `createCompanyWithYacht`, `createWarehouseFixture`, `createProductFixture`, `createStockFixture` (Task 1), `Transaction` model (already imported in Task 1's test file for assertions).

- [ ] **Step 1: Add the failing tests**

```js
// =========================================================================
// PUT /api/products/upadate/stock/:stock_id
// =========================================================================

describe('PUT /api/products/upadate/stock/:stock_id — actualizar stock', () => {
    async function buildStockScenario(productOverrides = {}) {
        const { company, yacht } = await createCompanyWithYacht(`StockUpCo-${suffix()}`);
        const warehouse = await createWarehouseFixture(yacht.id);
        const product = await createProductFixture(productOverrides);
        const staff = await createStaffFixture();
        const stock = await createStockFixture(product.id, warehouse.id, company.id);
        return { company, yacht, warehouse, product, staff, stock };
    }

    it('devuelve 200 y crea una Transaction al aumentar la cantidad', async () => {
        const { stock, staff } = await buildStockScenario();

        const response = await auth(
            request(app)
                .put(`/api/products/upadate/stock/${Utils.encode(stock.id)}`)
                .send({ quantity: 15, min: stock.min, max: stock.max, responsable: 'Tester', userId: Utils.encode(staff.id) })
        );

        expect(response.status).toBe(200);

        const transactions = await Transaction.findAll({ where: { productId: stock.productId } });
        expect(transactions).toHaveLength(1);
        expect(transactions[0].type).toBe('IN');
    });

    it('devuelve 400 con hashid inválido en stock_id', async () => {
        const { staff } = await buildStockScenario();

        const response = await auth(
            request(app)
                .put('/api/products/upadate/stock/not-a-hashid')
                .send({ quantity: 15, responsable: 'Tester', userId: Utils.encode(staff.id) })
        );

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 404 cuando el stock no existe', async () => {
        const { staff } = await buildStockScenario();

        const response = await auth(
            request(app)
                .put(`/api/products/upadate/stock/${Utils.encode(999999)}`)
                .send({ quantity: 15, responsable: 'Tester', userId: Utils.encode(staff.id) })
        );

        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 400 cuando falta quantity, sin corromper el stock existente', async () => {
        const { stock, staff } = await buildStockScenario();

        const response = await auth(
            request(app)
                .put(`/api/products/upadate/stock/${Utils.encode(stock.id)}`)
                .send({ min: 9, responsable: 'Tester', userId: Utils.encode(staff.id) })
        );

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('AppError');

        const refreshed = await Stock.findByPk(stock.id);
        expect(Number(refreshed.quantity)).toBe(Number(stock.quantity));

        const transactions = await Transaction.findAll({ where: { productId: stock.productId } });
        expect(transactions).toHaveLength(0);
    });

    it('devuelve 400 cuando quantity no es numérico', async () => {
        const { stock, staff } = await buildStockScenario();

        const response = await auth(
            request(app)
                .put(`/api/products/upadate/stock/${Utils.encode(stock.id)}`)
                .send({ quantity: 'abc', responsable: 'Tester', userId: Utils.encode(staff.id) })
        );

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 400 cuando falta responsable', async () => {
        const { stock, staff } = await buildStockScenario();

        const response = await auth(
            request(app)
                .put(`/api/products/upadate/stock/${Utils.encode(stock.id)}`)
                .send({ quantity: 15, userId: Utils.encode(staff.id) })
        );

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 403 sin JWT', async () => {
        const response = await request(app).put('/api/products/upadate/stock/any-id').send({});

        expect(response.status).toBe(403);
    });
});
```

- [ ] **Step 2: Run and confirm the new failure modes**

Run: `npx jest tests/domain/operations-inventory-products --runInBand -t "actualizar stock"`
Expected: FAIL on "hashid inválido" (`data.userId`/`stock_id` decode
unguarded today), "no existe" (`response.body.error` shape doesn't exist —
today it's a generic `Error` message string, not `{error:{code:...}}`),
"falta quantity" / "no es numérico" / "falta responsable" (today these throw
raw Sequelize/MySQL errors without `response.body.error.code`).

- [ ] **Step 3: Add explicit validation and `AppError` 404 in the service**

Modify `src/services/operations/inventory/products.services.js:277-358`,
only the opening validation and the not-found throw change:

```js
    static async updateStock(id, data) {
        if (data.quantity === undefined || data.quantity === null || !Number.isFinite(Number(data.quantity))) {
            throw new AppError('quantity inválida', 400);
        }
        if (!data.responsable) {
            throw new AppError('responsable es requerido', 400);
        }

        const t = await db.transaction();

        try {
            const current = await Stock.findByPk(id, { transaction: t });

            if (!current) {
                throw new AppError('Stock no encontrado', 404);
            }

            const currentPlain = current.get({ plain: true });

            const hasChanges = Object.keys(data).some(key => {
                return data[key] !== currentPlain[key];
            });

            if (!hasChanges) {
                await t.rollback();
                return;
            }

            const product = await Product.findOne({
                where: { id: currentPlain.productId },
                transaction: t,
                lock: t.LOCK.UPDATE
            });

            const normalizedQty = Quantity.normalizeQuantity(product, data.quantity);

            const hasQuantityChange =
                normalizedQty !== undefined &&
                normalizedQty !== currentPlain.quantity;

            let diff = 0;
            let diffNormal = 0;
            let newQuantity = currentPlain.quantity;

            if (hasQuantityChange) {
                diff = normalizedQty - currentPlain.quantity;
                newQuantity = normalizedQty;

                diffNormal = Quantity.viewCorrectQuantity(product, diff)
            }

            await Stock.update({
                ...data,
                quantity: normalizedQty
            }, {
                where: { id },
                transaction: t
            });

            await StockHistory.create({
                stockId: id,
                ...data
            }, { transaction: t });

            if (hasQuantityChange) {

                const isIncrease = diff > 0;

                await Transaction.create({
                    productId: currentPlain.productId,
                    userId: data.userId,
                    warehouseFromId: isIncrease ? null : currentPlain.warehouseId,
                    warehouseToId: isIncrease ? currentPlain.warehouseId : null,

                    quantity: Math.abs(diffNormal),
                    type: isIncrease ? 'IN' : 'OUT',

                }, { transaction: t });
            }

            await t.commit();

            return { message: 'Actualizado correctamente' };

        } catch (error) {
            await t.rollback();
            throw error;
        }
    }
```

- [ ] **Step 4: Add `decodeId` and `next(error)` in the controller**

Modify `src/controllers/operations/inventory/products.controller.js:139-150`:

```js
const updateStock = async (req, res, next) => {
    try {
        const stockId = decodeId(req.params.stock_id, 'stock_id');
        const data = req.body
        data.userId = decodeId(data.userId, 'userId');
        await ProductService.updateStock(stockId, data);
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        next(error);
    }
}
```

- [ ] **Step 5: Run and confirm all pass**

Run: `npx jest tests/domain/operations-inventory-products --runInBand`
Expected: PASS (38 tests)

- [ ] **Step 6: Commit**

```bash
git add tests/domain/operations-inventory-products/products.test.js src/controllers/operations/inventory/products.controller.js src/services/operations/inventory/products.services.js
git commit -m "test+fix: updateStock valida hashids, quantity/responsable, y responde 404 explícito"
```

---

### Task 10: Verificación final del dominio y de la suite completa

**Files:** none (verification only).

**Interfaces:** none.

- [ ] **Step 1: Run the domain suite three times in isolation to rule out flakiness**

Run: `npx jest tests/domain/operations-inventory-products --runInBand` (three times)
Expected: PASS (38 tests) all three times, matching the verification bar
used by `downloads`/`yachtRequest`.

- [ ] **Step 2: Run the full repo test suite to confirm no cross-domain regressions**

Run: `npx jest --runInBand --roots tests`
Expected: all suites PASS, including `tests/domain/operations-orders`,
`tests/domain/operations-yacht-request`, and `tests/smoke/orders.smoke.test.js`.
`--roots tests` is required — a bare `npx jest --runInBand` also sweeps up
`.claude/worktrees/*/tests/**/*.test.js` from unrelated leftover worktrees
(the repo's `testMatch` is `**/tests/**/*.test.js`), which can fail for
reasons that have nothing to do with this domain. A positional path argument
like `npx jest ./tests` does **not** exclude it either — Jest treats
positional args as a substring/regex filter over the full resolved paths,
and `.claude/worktrees/.../tests/...` still contains `/tests/`, so it still
matches. `--testPathIgnorePatterns` was also tried and did not exclude it in
this environment. `--roots tests` restricts Jest's file-search root instead
of filtering after the fact, and was verified with `npx jest --listTests
--roots tests | grep -c '\.claude'` → `0`.

- [ ] **Step 3: Re-read the diff against the spec's contract table**

Manually check `git diff main...refactor/fase-2-inventory-products -- src/controllers/operations/inventory/products.controller.js src/services/operations/inventory/products.services.js` against the "Contrato HTTP" table in `docs/superpowers/specs/2026-08-20-fase-2-inventory-products-design.md` — every row must have a corresponding test from Tasks 1-9.

- [ ] **Step 4: Update the spec status**

Modify `docs/superpowers/specs/2026-08-20-fase-2-inventory-products-design.md:4`:

```
**Estado:** Implementado
```

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/specs/2026-08-20-fase-2-inventory-products-design.md
git commit -m "docs: marcar spec de inventory/products como implementado"
```

At this point the domain is done and green. Publishing the branch and
opening the PR against `trunk` (per `docs/CONVENTIONS.md`'s "Flujo Git por
dominio") is a separate, explicit step — confirm with the user before
pushing or opening the PR.
