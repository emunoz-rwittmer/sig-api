# Fase 2 — Dominio Inventory/Transactions — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retrofit the `inventory/transactions` domain (`/api/transactions`, 6 endpoints) to the `AppError`/`next(error)` error-handling standard, stop the service catches from re-wrapping errors (which today would silently downgrade any `AppError` to a generic 500), fix the `Consecutivo` null-crash bug, remove four debug `console.log`s, and cover the domain with real-DB integration tests.

**Architecture:** No new files besides the test suite. `src/controllers/operations/inventory/transactions.controller.js` and `src/services/operations/inventory/transactions.services.js` are modified in place, endpoint by endpoint. `src/routes/operations/inventory/transactions.routes.js` needs no changes — Express already passes `next` to every route handler regardless of whether the handler declares it.

**Tech Stack:** Express, Sequelize (MySQL), Jest + Supertest (real DB, no mocks except `axios.post` for the print integration), existing `AppError`/`errorHandler` middleware, `hashids` via `src/utils/Utils.js`.

**Spec:** `docs/superpowers/specs/2026-08-21-fase-2-inventory-transactions-design.md`

## Global Constraints

- All 6 handlers end up with signature `(req, res, next)` and every `catch` block calls `next(error)` — no handler keeps `res.status(400).json(error.message)`, **except** the non-200 print-service branch in `printRegister`, which the spec explicitly keeps as a direct `res.status(400).json({ data: ... })` (not an `AppError`) — only that handler's actual `catch` (network/unexpected failures) moves to `next(error)`.
- Every `catch` block in the service that wraps a DB transaction changes from `throw new Error(...)` (which re-wraps and destroys any `AppError` thrown further up the same `try`) to a bare `throw error;` after `rollback()` — this is what makes `AppError` instances survive from deep inside a transaction all the way to the controller's `next(error)`.
- 404 is reserved for `updateStatusItem` only, because `item_id` is the one id that travels in the URL path (`PUT /updateStatusItem/:item_id`). Every other "not found" (product/orderItem/original-transaction referenced inside a POST/PUT body) is `AppError(msg, 400)` — confirmed with the user during brainstorming.
- **`decodeId` is applied to every `Utils.decode(...)` call in this domain**, not only `item_id` — this is the spec's contract-table row "hashid inválido en cualquier parámetro → 400 explícito", read literally. Required fields (`warehouseFromId`, `warehouseToId`, `userId`, `registerId` i.e. `req.body.id`, and `user` in `productEntryInWarehouse`) use `decodeId(value, fieldName)` directly and throw if absent/invalid. `companyId` in `transactionWarehouse` is the one **optional** field (the original code falls back to `null`) — it uses the guarded form `req.body.companyId ? decodeId(req.body.companyId, 'companyId') : null`, which preserves "absent → null" but now rejects a garbage hashid instead of silently treating it as absent. `productEntryInWarehouse`'s `stockData.companyId` is **not** touched — that endpoint's request contract already passes `companyId` as a raw (non-hashid) value, out of scope.
- Two `Warehouse` rows with **fixed ids 2 and 9** must exist before any test runs, because `incomeProductsRegister` hardcodes `sourceWarehouseId = 9` (service) and `warehouseToId = 2` (controller), and `stock.warehouse_id` / `transaction.warehouse_from_id` / `transaction.warehouse_to_id` carry real FK constraints (`Stock.belongsTo(Warehouse)`, `Transaction.belongsTo(Warehouse, ...)` in `src/models/init.models.js`) — inserting a `Stock`/`Transaction` row with `warehouseId: 9` fails if no `Warehouse` with `id: 9` exists. These two rows are created explicitly by id in the file-level `beforeAll`, **before** any other fixture claims those autoincrement ids.
- Run `npx jest tests/domain/operations-inventory-transactions --runInBand` after every task; it must stay green from Task 1 onward (each task only adds tests for behavior that task itself implements).

---

### Task 1: Test scaffold, fixtures, `decodeId` helper, `updateStatusItem`

**Files:**
- Create: `tests/domain/operations-inventory-transactions/transactions.test.js`
- Modify: `src/controllers/operations/inventory/transactions.controller.js:1-5` (imports), `:117-132` (`updateStatusItem`)
- Modify: `src/services/operations/inventory/transactions.services.js:1-7` (imports), `:348-358` (`updateStatusItem`)

**Interfaces:**
- Produces: `decodeId(value, fieldName)` in the controller module scope — used by every later task.
- Produces: `AppError` imported in both the controller and the service — used by every later task.
- Produces fixture helpers in the test file, reused by every later task: `createStaffFixture()`, `createWarehouseFixture(overrides)`, `createProductFixture(overrides)`, `createStockFixture(productId, warehouseId, companyId, overrides)`, `createOrderFixture(overrides)`, `createOrderItemFixture(orderId, overrides)`, `createRegisterFixture(overrides)`, plus `auth(httpRequest)` and `suffix()`.
- Produces: `TransactionService.updateStatusItem(data, itemId)` — signature changes from `(data, options)` to `(data, itemId)`; the only caller is this controller, updated in the same task.

- [ ] **Step 1: Write the test file with fixtures and the `updateStatusItem` describe block**

```js
const request = require('supertest');
const axios = require('axios');
const { bootTestApp, shutdownTestApp } = require('../../helpers/testApp');
const { createAuthenticatedUser } = require('../../helpers/auth');
const { createDepartment, createPosition, createCompanyWithYacht } = require('../../helpers/staffFixtures');
const Staff = require('../../../src/models/catalogs/staff.models');
const Warehouse = require('../../../src/models/catalogs/wareHouse.models');
const Consecutivo = require('../../../src/models/catalogs/consecutivo.model');
const Product = require('../../../src/models/operations/inventory/product.models');
const Stock = require('../../../src/models/operations/inventory/stock.models');
const Transaction = require('../../../src/models/operations/inventory/transaction.models');
const Register = require('../../../src/models/operations/inventory/register.models');
const Order = require('../../../src/models/operations/orders/order.models');
const orderItems = require('../../../src/models/operations/orders/orderItems.models');
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

    // sourceWarehouseId=9 y warehouseToId=2 estan hardcodeados en
    // transactions.controller.js/transactions.services.js (incomeProductsRegister).
    // Se crean primero, con id explicito, para reservar esos numeros de
    // autoincremento antes de que cualquier otro fixture de warehouse los tome.
    await Warehouse.create({ id: 2, name: 'Bodega Destino Fija', location: 'Bodega Test', type: 'Yate' });
    await Warehouse.create({ id: 9, name: 'Bodega Origen Fija', location: 'Bodega Test', type: 'Yate' });
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
        lastName: `Transaction${s}`,
        email: `transaction-test-${s}@example.com`,
        cellPhone: '0966666666',
        password: 'Sup3rSecret!',
        departamentId: dept.id,
        positionId: pos.id,
        contractType: 'Fijo',
        active: true,
    });
}

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

async function createOrderFixture(overrides = {}) {
    const { company } = await createCompanyWithYacht(`Order Company ${suffix()}`);
    const staff = await createStaffFixture();
    return Order.create({
        companyId: company.id,
        userId: staff.id,
        name: `Pedido-${suffix()}`,
        status: 'en espera',
        guide: `GUIDE-${suffix()}`,
        ...overrides,
    });
}

async function createOrderItemFixture(orderId, overrides = {}) {
    return orderItems.create({
        orderId,
        product: `Producto-${suffix()}`,
        sku: `SKU-${suffix()}`,
        quantity: 10,
        originalQuantity: 10,
        status: 'en espera',
        ...overrides,
    });
}

async function createRegisterFixture(overrides = {}) {
    const { company } = await createCompanyWithYacht(`RegisterCo-${suffix()}`);
    const staff = await createStaffFixture();
    return Register.create({
        counter: `CNT-${suffix()}`,
        products: 1,
        companyId: company.id,
        userId: staff.id,
        ...overrides,
    });
}

// =========================================================================
// PUT /api/transactions/updateStatusItem/:item_id
// =========================================================================

describe('PUT /api/transactions/updateStatusItem/:item_id', () => {
    it('devuelve 200 al actualizar el estado', async () => {
        const order = await createOrderFixture();
        const item = await createOrderItemFixture(order.id);

        const response = await auth(
            request(app)
                .put(`/api/transactions/updateStatusItem/${Utils.encode(item.id)}`)
                .send({ status: 'ingresado' })
        );

        expect(response.status).toBe(200);
        expect(response.body.data).toBe('resource updated successfully');

        const refreshed = await orderItems.findByPk(item.id);
        expect(refreshed.status).toBe('ingresado');
    });

    it('devuelve 404 cuando el item no existe', async () => {
        const response = await auth(
            request(app)
                .put(`/api/transactions/updateStatusItem/${Utils.encode(999999)}`)
                .send({ status: 'ingresado' })
        );

        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 400 con hashid inválido', async () => {
        const response = await auth(
            request(app)
                .put('/api/transactions/updateStatusItem/not-a-hashid')
                .send({ status: 'ingresado' })
        );

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 403 sin JWT', async () => {
        const response = await request(app).put('/api/transactions/updateStatusItem/any-id').send({});

        expect(response.status).toBe(403);
    });
});
```

- [ ] **Step 2: Run the suite and confirm it fails on the new tests**

Run: `npx jest tests/domain/operations-inventory-transactions --runInBand`
Expected: FAIL — "no existe" fails because today `updateStatusItem` returns 200
regardless of whether the row exists (`orderItems.update(data, id)` with `id`
actually being the whole `{ where: { id } }` options object — the `if (!id)`
guard is dead code, it's never falsy). "hashid inválido" fails because
`response.body.error` doesn't exist yet (no `AppError`/`next` wiring).

- [ ] **Step 3: Add `decodeId`/`AppError` imports and retrofit `updateStatusItem` in the service**

Modify `src/services/operations/inventory/transactions.services.js:1-7`:

```js
const Product = require('../../../models/operations/inventory/product.models');
const Stock = require('../../../models/operations/inventory/stock.models');
const Transaction = require('../../../models/operations/inventory/transaction.models');
const db = require('../../../utils/database');
const orderItems = require('../../../models/operations/orders/orderItems.models');
const Register = require('../../../models/operations/inventory/register.models');
const Quantity = require('../../../utils/quantity');
const AppError = require('../../../errors/AppError');
```

Modify `updateStatusItem` (originally lines 348-358):

```js
    static async updateStatusItem(data, itemId) {
        const existing = await orderItems.findByPk(itemId);
        if (!existing) {
            throw new AppError('Elemento no encontrado', 404);
        }
        return orderItems.update(data, { where: { id: itemId } });
    }
```

- [ ] **Step 4: Add `decodeId`/`AppError` imports and retrofit `updateStatusItem` in the controller**

Modify `src/controllers/operations/inventory/transactions.controller.js:1-5`:

```js
const axios = require('axios');
const TransactionService = require('../../../services/operations/inventory/transactions.services');
const Utils = require('../../../utils/Utils');
const CompanyService = require('../../../services/catalogs/company.services');
const Consecutivo = require('../../../models/catalogs/consecutivo.model');
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

Modify `updateStatusItem` (originally lines 117-132):

```js
const updateStatusItem = async (req, res, next) => {
    try {
        const itemId = decodeId(req.params.item_id, 'item_id');
        const data = req.body;
        await TransactionService.updateStatusItem(data, itemId);
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        next(error);
    }
}
```

- [ ] **Step 5: Run the suite and confirm all pass**

Run: `npx jest tests/domain/operations-inventory-transactions --runInBand`
Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add tests/domain/operations-inventory-transactions/transactions.test.js src/controllers/operations/inventory/transactions.controller.js src/services/operations/inventory/transactions.services.js
git commit -m "test+fix: retrofit updateStatusItem a AppError/next(error), buscar-primero para 404 real"
```

---

### Task 2: `productEntryInWarehouse`

**Files:**
- Modify: `src/controllers/operations/inventory/transactions.controller.js:7-52`
- Modify: `src/services/operations/inventory/transactions.services.js:11-130`
- Test: `tests/domain/operations-inventory-transactions/transactions.test.js`

**Interfaces:**
- Consumes: `decodeId`, `AppError` (Task 1), `createWarehouseFixture`, `createOrderFixture`, `createOrderItemFixture` (Task 1).

- [ ] **Step 1: Add the failing tests**

```js
// =========================================================================
// POST /api/transactions/productEntryInWarehouse/:warehouse_id
// =========================================================================

describe('POST /api/transactions/productEntryInWarehouse/:warehouse_id', () => {
    it('devuelve 200 creando producto, stock y transacción nuevos', async () => {
        const warehouse = await createWarehouseFixture();
        const order = await createOrderFixture();
        const item = await createOrderItemFixture(order.id);
        const staff = await createStaffFixture();
        const s = suffix();

        const response = await auth(
            request(app)
                .post(`/api/transactions/productEntryInWarehouse/${warehouse.id}`)
                .send({ id: item.id, product: `Producto-${s}`, sku: `NEW-${s}`, quantity: 5, user: Utils.encode(staff.id) })
        );

        expect(response.status).toBe(200);

        const transactions = await Transaction.findAll({ where: { referenceId: `ORDER_ITEM_${item.id}` } });
        expect(transactions).toHaveLength(1);
        expect(transactions[0].type).toBe('IN');

        const refreshedItem = await orderItems.findByPk(item.id);
        expect(refreshedItem.status).toBe('ingresado');
    });

    it('devuelve 200 sumando a un stock existente', async () => {
        const warehouse = await createWarehouseFixture();
        const product = await createProductFixture();
        await createStockFixture(product.id, warehouse.id, null, { quantity: 10 });
        const order = await createOrderFixture();
        const item = await createOrderItemFixture(order.id);
        const staff = await createStaffFixture();

        const response = await auth(
            request(app)
                .post(`/api/transactions/productEntryInWarehouse/${warehouse.id}`)
                .send({ id: item.id, product: product.name, sku: product.sku, quantity: 5, user: Utils.encode(staff.id) })
        );

        expect(response.status).toBe(200);

        const stock = await Stock.findOne({ where: { productId: product.id, warehouseId: warehouse.id } });
        expect(Number(stock.quantity)).toBe(15);
    });

    it('devuelve 400 sin warehouseId/orderItemId', async () => {
        const warehouse = await createWarehouseFixture();

        const response = await auth(
            request(app)
                .post(`/api/transactions/productEntryInWarehouse/${warehouse.id}`)
                .send({ product: 'X', sku: `X-${suffix()}`, quantity: 5 })
        );

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 400 con cantidad inválida', async () => {
        const warehouse = await createWarehouseFixture();
        const order = await createOrderFixture();
        const item = await createOrderItemFixture(order.id);

        const response = await auth(
            request(app)
                .post(`/api/transactions/productEntryInWarehouse/${warehouse.id}`)
                .send({ id: item.id, product: 'X', sku: `X-${suffix()}`, quantity: 0 })
        );

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 400 sin sku', async () => {
        const warehouse = await createWarehouseFixture();
        const order = await createOrderFixture();
        const item = await createOrderItemFixture(order.id);

        const response = await auth(
            request(app)
                .post(`/api/transactions/productEntryInWarehouse/${warehouse.id}`)
                .send({ id: item.id, product: 'X', quantity: 5 })
        );

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 400 cuando el orderItem no existe', async () => {
        const warehouse = await createWarehouseFixture();
        const staff = await createStaffFixture();
        const s = suffix();

        const response = await auth(
            request(app)
                .post(`/api/transactions/productEntryInWarehouse/${warehouse.id}`)
                .send({ id: 999999, product: `Producto-${s}`, sku: `NEW-${s}`, quantity: 5, user: Utils.encode(staff.id) })
        );

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 400 con referenceId duplicado, sin corromper el stock', async () => {
        const warehouse = await createWarehouseFixture();
        const order = await createOrderFixture();
        const item = await createOrderItemFixture(order.id);
        const staff = await createStaffFixture();
        const s = suffix();
        const body = { id: item.id, product: `Producto-${s}`, sku: `NEW-${s}`, quantity: 5, user: Utils.encode(staff.id) };

        const first = await auth(
            request(app).post(`/api/transactions/productEntryInWarehouse/${warehouse.id}`).send(body)
        );
        expect(first.status).toBe(200);

        const stockAfterFirst = await Stock.findOne({ where: { warehouseId: warehouse.id } });

        const second = await auth(
            request(app).post(`/api/transactions/productEntryInWarehouse/${warehouse.id}`).send(body)
        );

        expect(second.status).toBe(400);
        expect(second.body.error.code).toBe('AppError');

        const stockAfterSecond = await Stock.findByPk(stockAfterFirst.id);
        expect(Number(stockAfterSecond.quantity)).toBe(Number(stockAfterFirst.quantity));
    });

    it('devuelve 403 sin JWT', async () => {
        const response = await request(app).post('/api/transactions/productEntryInWarehouse/1').send({});

        expect(response.status).toBe(403);
    });
});
```

- [ ] **Step 2: Run and confirm the new failure modes**

Run: `npx jest tests/domain/operations-inventory-transactions --runInBand -t "productEntryInWarehouse"`
Expected: FAIL on "sin sku" (today an uncaught `TypeError` from `.replace()` on
`undefined`, still 400 via the old catch-all but without `response.body.error.code`)
and on every other case that asserts `response.body.error.code` (today the
catch-all returns a raw string body, not `{error:{code:...}}`).

- [ ] **Step 3: Retrofit the service**

Modify `src/services/operations/inventory/transactions.services.js:11-130`:

```js
    static async productEntryInWarehouse(productData, stockData, transactionData, orderItemId) {
        const t = await db.transaction();

        try {
            // Validar producto
            if (!productData || !productData.sku) {
                throw new AppError('Datos de producto inválidos', 400);
            }

            // Validar almacén
            if (!stockData || !stockData.warehouseId) {
                throw new AppError('Almacén no especificado', 400);
            }

            const quantity = Number(stockData.quantity);

            // Validar cantidad válida y mayor a 0
            if (!Number.isFinite(quantity) || quantity <= 0) {
                throw new AppError('Cantidad debe ser un número mayor a 0', 400);
            }

            const productAttributes = {
                ...productData,
                type: 'DISCRETE'
            };

            let product = await Product.findOne({
                where: { sku: productData.sku },
                transaction: t,
                lock: t.LOCK.UPDATE
            });

            if (!product) {
                product = await Product.create(productAttributes, { transaction: t });
            }

            const whereStock = {
                productId: product.id,
                warehouseId: stockData.warehouseId,
                ...(stockData.companyId && { companyId: stockData.companyId })
            };

            let stock = await Stock.findOne({
                where: whereStock,
                transaction: t,
                lock: t.LOCK.UPDATE
            });

            const normalizedQty = Quantity.normalizeQuantity(product, quantity);

            // Usar Math.round para evitar problemas de precisión al sumar decimales
            const currentQty = Number(stock?.quantity) || 0;
            const newQty = Math.round((currentQty + normalizedQty) * 100) / 100;

            if (stock) {
                stock.quantity = newQty;
                await stock.save({ transaction: t });
            } else {
                stock = await Stock.create(
                    {
                        ...stockData,
                        normalizedQty,
                        productId: product.id
                    },
                    { transaction: t }
                );
            }

            // Validar transacción duplicada
            const existsTransaction = await Transaction.findOne({
                where: { referenceId: transactionData.referenceId },
                transaction: t
            });

            if (existsTransaction) {
                throw new AppError('Transacción duplicada: referenceId ya existe', 400);
            }

            const newTransaction = await Transaction.create(
                {
                    ...transactionData,
                    productId: product.id,
                    normalizedQty
                },
                { transaction: t }
            );

            const orderItem = await orderItems.findOne({
                where: { id: orderItemId },
                transaction: t,
                lock: t.LOCK.UPDATE
            });

            if (!orderItem) {
                throw new AppError('Elemento de orden no encontrado', 400);
            }

            await orderItem.update(
                {
                    status: 'ingresado',
                    normalizedQty
                },
                { transaction: t }
            );

            await t.commit();

            return {
                success: true,
                message: stock ? 'Stock actualizado y transacción registrada' : 'Producto, stock y transacción creados',
                orderItemId,
                productId: product.id,
                transactionId: newTransaction.id
            };

        } catch (error) {
            await t.rollback();
            throw error;
        }
    }
```

(Only the four `throw new Error(...)` calls became `throw new AppError(msg, 400)`;
the final `catch` already did a bare `throw error;`, no change needed there.)

- [ ] **Step 4: Retrofit the controller**

Modify `src/controllers/operations/inventory/transactions.controller.js:7-52`:

```js
const productEntryInWarehouse = async (req, res, next) => {
    try {
        const warehouseId = Number(req.params.warehouse_id);
        const { id: orderItemId, product, sku, quantity, companyId, user } = req.body;

        if (!warehouseId || !orderItemId) {
            throw new AppError('Invalid warehouse or order item', 400);
        }

        const parsedQuantity = Number(quantity);
        if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
            throw new AppError('Invalid quantity', 400);
        }

        if (!sku) {
            throw new AppError('sku es requerido', 400);
        }

        const productData = {
            name: product,
            sku: sku.replace(/^0+/, '')
        };

        const stockData = {
            warehouseId,
            quantity: parsedQuantity,
            companyId
        };

        const transactionData = {
            type: 'IN',
            warehouseToId: warehouseId,
            quantity: parsedQuantity,
            userId: user ? decodeId(user, 'user') : undefined,
            referenceId: `ORDER_ITEM_${orderItemId}`
        };

        const result = await TransactionService.productEntryInWarehouse(
            productData,
            stockData,
            transactionData,
            orderItemId
        );

        res.status(200).json({ data: result.message });

    } catch (error) {
        next(error);
    }
};
```

Note: `userId: user ? decodeId(user, 'user') : undefined` preserves today's
behavior when `user` is absent (`Utils.decode(undefined)` today returns
`undefined`, which is what `Transaction.create` already receives and rejects
at the DB level as a `NOT NULL` violation — same outcome, now surfaced through
`decodeId`'s explicit validation when `user` **is** present but malformed,
instead of silently becoming `undefined`).

- [ ] **Step 5: Run and confirm all pass**

Run: `npx jest tests/domain/operations-inventory-transactions --runInBand`
Expected: PASS (12 tests)

- [ ] **Step 6: Commit**

```bash
git add tests/domain/operations-inventory-transactions/transactions.test.js src/controllers/operations/inventory/transactions.controller.js src/services/operations/inventory/transactions.services.js
git commit -m "test+fix: retrofit productEntryInWarehouse a AppError, exigir sku"
```

---

### Task 3: `transactionWarehouse` — incluye el fix del bug de `consecutivo`

**Files:**
- Modify: `src/controllers/operations/inventory/transactions.controller.js:54-94`
- Modify: `src/services/operations/inventory/transactions.services.js:132-275`
- Test: `tests/domain/operations-inventory-transactions/transactions.test.js`

**Interfaces:**
- Consumes: `decodeId`, `AppError` (Task 1), `createWarehouseFixture`, `createProductFixture`, `createStockFixture`, `createCompanyWithYacht` (already imported in Task 1's test file).

- [ ] **Step 1: Add the failing tests**

```js
// =========================================================================
// POST /api/transactions/transactionBetweenWarehouse
// =========================================================================

describe('POST /api/transactions/transactionBetweenWarehouse', () => {
    it('devuelve 200 moviendo stock entre bodegas y crea Register+Transaction', async () => {
        await Consecutivo.destroy({ where: {} });
        await Consecutivo.create({ valor: 1 });

        const { company } = await createCompanyWithYacht(`TW-Co-${suffix()}`);
        const from = await createWarehouseFixture();
        const to = await createWarehouseFixture();
        const product = await createProductFixture();
        await createStockFixture(product.id, from.id, company.id, { quantity: 10 });
        const staff = await createStaffFixture();

        const response = await auth(
            request(app)
                .post('/api/transactions/transactionBetweenWarehouse')
                .send({
                    products: [{ id: product.id, name: product.name, quantity: 4 }],
                    userName: 'Tester',
                    location: 'GPS',
                    companyId: Utils.encode(company.id),
                    warehouseFromId: Utils.encode(from.id),
                    warehouseToId: Utils.encode(to.id),
                    userId: Utils.encode(staff.id),
                })
        );

        expect(response.status).toBe(200);

        const stockFrom = await Stock.findOne({ where: { productId: product.id, warehouseId: from.id } });
        const stockTo = await Stock.findOne({ where: { productId: product.id, warehouseId: to.id } });
        expect(Number(stockFrom.quantity)).toBe(6);
        expect(Number(stockTo.quantity)).toBe(4);

        const registers = await Register.findAll({ where: { companyId: company.id } });
        expect(registers).toHaveLength(1);

        const transactions = await Transaction.findAll({ where: { registerId: registers[0].id } });
        expect(transactions).toHaveLength(1);
        expect(transactions[0].type).toBe('OUT');
    });

    it('devuelve 200 cuando la tabla Consecutivo está vacía (fix del bug de crash)', async () => {
        await Consecutivo.destroy({ where: {} });

        const { company } = await createCompanyWithYacht(`TW-Empty-${suffix()}`);
        const from = await createWarehouseFixture();
        const to = await createWarehouseFixture();
        const product = await createProductFixture();
        await createStockFixture(product.id, from.id, company.id, { quantity: 10 });
        const staff = await createStaffFixture();

        const response = await auth(
            request(app)
                .post('/api/transactions/transactionBetweenWarehouse')
                .send({
                    products: [{ id: product.id, name: product.name, quantity: 2 }],
                    userName: 'Tester',
                    location: 'GPS',
                    companyId: Utils.encode(company.id),
                    warehouseFromId: Utils.encode(from.id),
                    warehouseToId: Utils.encode(to.id),
                    userId: Utils.encode(staff.id),
                })
        );

        expect(response.status).toBe(200);

        const consecutivo = await Consecutivo.findOne({ where: {} });
        expect(consecutivo).not.toBeNull();
        expect(consecutivo.valor).toBe(2);
    });

    it('devuelve 200 e imprime cuando location es UIO (axios mockeado)', async () => {
        const { company } = await createCompanyWithYacht(`TW-UIO-${suffix()}`);
        const from = await createWarehouseFixture();
        const to = await createWarehouseFixture();
        const product = await createProductFixture();
        await createStockFixture(product.id, from.id, company.id, { quantity: 10 });
        const staff = await createStaffFixture();
        const printSpy = jest.spyOn(axios, 'post').mockResolvedValueOnce({ status: 200 });

        const response = await auth(
            request(app)
                .post('/api/transactions/transactionBetweenWarehouse')
                .send({
                    products: [{ id: product.id, name: product.name, quantity: 1 }],
                    userName: 'Tester',
                    location: 'UIO',
                    companyId: Utils.encode(company.id),
                    warehouseFromId: Utils.encode(from.id),
                    warehouseToId: Utils.encode(to.id),
                    userId: Utils.encode(staff.id),
                })
        );

        expect(response.status).toBe(200);
        expect(printSpy).toHaveBeenCalledTimes(1);
        printSpy.mockRestore();
    });

    it('devuelve 400 cuando origen y destino son iguales', async () => {
        const { company } = await createCompanyWithYacht(`TW-Same-${suffix()}`);
        const warehouse = await createWarehouseFixture();
        const product = await createProductFixture();
        const staff = await createStaffFixture();

        const response = await auth(
            request(app)
                .post('/api/transactions/transactionBetweenWarehouse')
                .send({
                    products: [{ id: product.id, name: product.name, quantity: 1 }],
                    userName: 'Tester',
                    location: 'GPS',
                    companyId: Utils.encode(company.id),
                    warehouseFromId: Utils.encode(warehouse.id),
                    warehouseToId: Utils.encode(warehouse.id),
                    userId: Utils.encode(staff.id),
                })
        );

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 400 cuando el stock de origen es insuficiente', async () => {
        const { company } = await createCompanyWithYacht(`TW-Insuf-${suffix()}`);
        const from = await createWarehouseFixture();
        const to = await createWarehouseFixture();
        const product = await createProductFixture();
        await createStockFixture(product.id, from.id, company.id, { quantity: 1 });
        const staff = await createStaffFixture();

        const response = await auth(
            request(app)
                .post('/api/transactions/transactionBetweenWarehouse')
                .send({
                    products: [{ id: product.id, name: product.name, quantity: 5 }],
                    userName: 'Tester',
                    location: 'GPS',
                    companyId: Utils.encode(company.id),
                    warehouseFromId: Utils.encode(from.id),
                    warehouseToId: Utils.encode(to.id),
                    userId: Utils.encode(staff.id),
                })
        );

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 400 sin productos válidos', async () => {
        const { company } = await createCompanyWithYacht(`TW-Empty2-${suffix()}`);
        const from = await createWarehouseFixture();
        const to = await createWarehouseFixture();
        const staff = await createStaffFixture();

        const response = await auth(
            request(app)
                .post('/api/transactions/transactionBetweenWarehouse')
                .send({
                    products: [],
                    userName: 'Tester',
                    location: 'GPS',
                    companyId: Utils.encode(company.id),
                    warehouseFromId: Utils.encode(from.id),
                    warehouseToId: Utils.encode(to.id),
                    userId: Utils.encode(staff.id),
                })
        );

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 403 sin JWT', async () => {
        const response = await request(app).post('/api/transactions/transactionBetweenWarehouse').send({});

        expect(response.status).toBe(403);
    });
});
```

- [ ] **Step 2: Run and confirm the new failure modes**

Run: `npx jest tests/domain/operations-inventory-transactions --runInBand -t "transactionBetweenWarehouse"`
Expected: FAIL on "Consecutivo está vacía" with an unhandled `TypeError` (not
a clean 400/500 assertion — this is the bug), and on every other case that
asserts `response.body.error.code` (today's catch-all wraps everything as a
plain string with the `"Error en la transacción: "` prefix, not
`{error:{code:...}}`).

- [ ] **Step 3: Retrofit the service**

Modify `src/services/operations/inventory/transactions.services.js:132-275`:

```js
    static async transactionWarehouse(transactionData) {
        const { products, warehouseFromId, warehouseToId, userId, companyId, formattedCounter } = transactionData;

        const transaction = await db.transaction();

        try {
            // Validaciones previas
            if (!Array.isArray(products) || products.length === 0) {
                throw new AppError('Productos no válidos', 400);
            }

            if (warehouseFromId === warehouseToId) {
                throw new AppError('El almacén de origen y destino no pueden ser iguales', 400);
            }

            // Consolidar productos y validar cantidades
            const validProducts = products.filter(p => Number(p.quantity) > 0);

            const consolidatedProducts = Object.values(
                validProducts.reduce((acc, product) => {
                    const quantity = Number(product.quantity);

                    if (!acc[product.id]) {
                        acc[product.id] = {
                            ...product,
                            quantity: 0
                        };
                    }

                    acc[product.id].quantity += quantity;
                    return acc;
                }, {})
            );
            // Validar que haya productos válidos después de consolidación
            if (consolidatedProducts.length === 0) {
                throw new AppError('No hay productos válidos para procesar', 400);
            }

            const totalProducts = consolidatedProducts.reduce(
                (sum, p) => sum + p.quantity,
                0
            );

            const register = await Register.create({
                counter: formattedCounter,
                userId,
                companyId,
                products: totalProducts
            }, { transaction });

            // Validar disponibilidad de stock antes de crear transacciones
            for (const product of consolidatedProducts) {
                const { id: productId, name, quantity } = product;

                const infoProduct = await Product.findOne({
                    where: { id: productId },
                    transaction,
                    lock: transaction.LOCK.UPDATE
                });

                const stockFrom = await Stock.findOne({
                    where: {
                        productId,
                        warehouseId: warehouseFromId,
                        ...(companyId && { companyId })
                    },
                    transaction,
                    lock: transaction.LOCK.UPDATE
                });

                const normalizedQty = Quantity.normalizeQuantity(infoProduct, quantity);

                if (!stockFrom || stockFrom.quantity < normalizedQty) {
                    throw new AppError(`Stock insuficiente para ${name}. Disponible: ${stockFrom?.quantity || 0}, Solicitado: ${normalizedQty}`, 400);
                }
            }

            // Procesar transacciones de stock y registros
            for (const product of consolidatedProducts) {
                const { id: productId, name, quantity } = product;

                const infoProduct = await Product.findOne({
                    where: { id: productId },
                    transaction,
                    lock: transaction.LOCK.UPDATE
                });

                const stockFrom = await Stock.findOne({
                    where: {
                        productId,
                        warehouseId: warehouseFromId,
                        ...(companyId && { companyId })
                    },
                    transaction,
                    lock: transaction.LOCK.UPDATE
                });

                const normalizedQty = Quantity.normalizeQuantity(infoProduct, quantity);

                // Restar del almacén origen
                stockFrom.quantity -= normalizedQty;
                await stockFrom.save({ transaction });

                // Sumar al almacén destino
                const [stockTo] = await Stock.findOrCreate({
                    where: {
                        productId,
                        warehouseId: warehouseToId,
                        ...(companyId && { companyId })
                    },
                    defaults: { quantity: 0 },
                    transaction,
                    lock: transaction.LOCK.UPDATE
                });

                // Usar Math.round para evitar problemas de precisión al sumar decimales
                const currentQty = Number(stockTo.quantity) || 0;
                const newQty = Math.round((currentQty + normalizedQty) * 100) / 100;

                stockTo.quantity = newQty;
                await stockTo.save({ transaction });

                await Transaction.create({
                    productId,
                    userId,
                    warehouseFromId,
                    warehouseToId,
                    quantity,
                    type: 'OUT',
                    registerId: register.id
                }, { transaction });
            }

            await transaction.commit();
            return {
                success: true,
                message: 'Transacción completada correctamente.'
            };

        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
```

(Three `throw new Error(...)` became `throw new AppError(msg, 400)`; the final
`catch` dropped `throw new Error(\`Error en la transacción: ${error.message}\`)`
in favor of a bare `throw error;` — this is the change that stops any
`AppError` thrown above from being downgraded to a generic 500.)

- [ ] **Step 4: Retrofit the controller, including the `consecutivo` bug fix**

Modify `src/controllers/operations/inventory/transactions.controller.js:54-94`:

```js
const transactionWarehouse = async (req, res, next) => {
    try {
        const { products, userName, location } = req.body;
        const companyId = req.body.companyId ? decodeId(req.body.companyId, 'companyId') : null;
        const warehouseFromId = decodeId(req.body.warehouseFromId, 'warehouseFromId');
        const warehouseToId = decodeId(req.body.warehouseToId, 'warehouseToId');
        const userId = decodeId(req.body.userId, 'userId');

        const consecutivo = await Consecutivo.findOne({ where: {} }) ?? await Consecutivo.create({ valor: 1 });

        const formattedCounter = `000-${consecutivo.valor.toString().padStart(3, '0')}`;
        await Consecutivo.update({ valor: consecutivo.valor + 1 }, { where: {} });

        const transactions = await TransactionService.transactionWarehouse({
            products,
            warehouseFromId,
            warehouseToId,
            userId,
            companyId,
            formattedCounter
        });

        if (transactions.success) {
            if (location === 'UIO') {
                const result = await CompanyService.getCompanyById(companyId);
                axios.post('http://190.12.15.164:5859/print/transactions', { products, userName, company: result?.name, formattedCounter })
            }
            // if (location === 'GPS') {
            //     console.log('imprimiendo en galapagos')
            //     //axios.post('http://localhost:3000/print/transactions', { products, userName, company })
            // }
            res.status(200).json({ data: transactions.message });
        }
    } catch (error) {
        console.log(error)
        next(error);
    }
}
```

- [ ] **Step 5: Run and confirm all pass**

Run: `npx jest tests/domain/operations-inventory-transactions --runInBand`
Expected: PASS (19 tests)

- [ ] **Step 6: Commit**

```bash
git add tests/domain/operations-inventory-transactions/transactions.test.js src/controllers/operations/inventory/transactions.controller.js src/services/operations/inventory/transactions.services.js
git commit -m "test+fix: retrofit transactionWarehouse a AppError, corregir crash de Consecutivo vacío"
```

---

### Task 4: `incomeProductsInWarehouse`

**Files:**
- Modify: `src/controllers/operations/inventory/transactions.controller.js:96-115`
- Modify: `src/services/operations/inventory/transactions.services.js:277-346`
- Test: `tests/domain/operations-inventory-transactions/transactions.test.js`

**Interfaces:**
- Consumes: `decodeId`, `AppError` (Task 1), `createWarehouseFixture`, `createProductFixture`, `createCompanyWithYacht`.

- [ ] **Step 1: Add the failing tests**

```js
// =========================================================================
// POST /api/transactions/incomeProductsInWarehouse
// =========================================================================

describe('POST /api/transactions/incomeProductsInWarehouse', () => {
    it('devuelve 200 creando/sumando stock', async () => {
        const { company } = await createCompanyWithYacht(`IPW-Co-${suffix()}`);
        const warehouse = await createWarehouseFixture();
        const product = await createProductFixture();
        const staff = await createStaffFixture();

        const response = await auth(
            request(app)
                .post('/api/transactions/incomeProductsInWarehouse')
                .send({
                    products: [{ id: product.id, quantity: 8 }],
                    warehouseToId: Utils.encode(warehouse.id),
                    companyId: Utils.encode(company.id),
                    userId: Utils.encode(staff.id),
                })
        );

        expect(response.status).toBe(200);

        const stock = await Stock.findOne({ where: { productId: product.id, warehouseId: warehouse.id } });
        expect(Number(stock.quantity)).toBe(8);

        const transactions = await Transaction.findAll({ where: { productId: product.id, warehouseToId: warehouse.id } });
        expect(transactions).toHaveLength(1);
        expect(transactions[0].type).toBe('IN');
    });

    it('devuelve 400 sin productos válidos', async () => {
        const { company } = await createCompanyWithYacht(`IPW-Empty-${suffix()}`);
        const warehouse = await createWarehouseFixture();
        const staff = await createStaffFixture();

        const response = await auth(
            request(app)
                .post('/api/transactions/incomeProductsInWarehouse')
                .send({
                    products: [],
                    warehouseToId: Utils.encode(warehouse.id),
                    companyId: Utils.encode(company.id),
                    userId: Utils.encode(staff.id),
                })
        );

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 403 sin JWT', async () => {
        const response = await request(app).post('/api/transactions/incomeProductsInWarehouse').send({});

        expect(response.status).toBe(403);
    });
});
```

- [ ] **Step 2: Run and confirm the failure mode**

Run: `npx jest tests/domain/operations-inventory-transactions --runInBand -t "incomeProductsInWarehouse"`
Expected: FAIL on "sin productos válidos" — today's response body is a raw
string, not `{error:{code:'AppError'}}`.

- [ ] **Step 3: Retrofit the service**

Modify `src/services/operations/inventory/transactions.services.js:277-346`:

```js
    static async incomeProductsInWarehouse(transactionData) {
        const { products, warehouseToId, companyId, userId } = transactionData;

        const transaction = await db.transaction();

        try {
            // Validar que haya productos
            if (!Array.isArray(products) || products.length === 0) {
                throw new AppError('No hay productos para procesar', 400);
            }

            // Filtrar productos con cantidad válida (> 0)
            const validProducts = products.filter(product => {
                const quantity = Number(product.quantity);
                return Number.isFinite(quantity) && quantity > 0;
            });

            if (validProducts.length === 0) {
                throw new AppError('No hay productos válidos con cantidad mayor a 0', 400);
            }

            const transactionResults = await Promise.all(
                validProducts.map(async (product) => {
                    const quantity = Number(product.quantity);

                    const infoProduct = await Product.findOne({
                        where: { id: product.id },
                        transaction,
                        lock: transaction.LOCK.UPDATE
                    });

                    const whereCondition = {
                        productId: product.id,
                        warehouseId: warehouseToId,
                        ...(companyId && { companyId: companyId })
                    };

                    const [stockToInstance] = await Stock.findOrCreate({
                        where: whereCondition,
                        defaults: { quantity: 0 },
                        transaction,
                        lock: transaction.LOCK.UPDATE
                    });

                    const normalizedQty = Quantity.normalizeQuantity(infoProduct, quantity);

                    // Usar Math.round para evitar problemas de precisión al sumar decimales
                    const currentQty = Number(stockToInstance.quantity) || 0;
                    const newQty = Math.round((currentQty + normalizedQty) * 100) / 100;

                    stockToInstance.quantity = newQty;
                    await stockToInstance.save({ transaction });

                    return Transaction.create({
                        productId: product.id,
                        userId,
                        warehouseToId,
                        quantity,  // Usar cantidad normalizada en la transacción
                        type: 'IN'
                    }, { transaction });
                })
            );

            await transaction.commit();
            return transactionResults;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
```

- [ ] **Step 4: Retrofit the controller**

Modify `src/controllers/operations/inventory/transactions.controller.js:96-115`:

```js
const incomeProductsInWarehouse = async (req, res, next) => {
    try {
        const { products } = req.body;
        const warehouseToId = decodeId(req.body.warehouseToId, 'warehouseToId')
        const companyId = decodeId(req.body.companyId, 'companyId')
        const userId = decodeId(req.body.userId, 'userId')

        const transactions = await TransactionService.incomeProductsInWarehouse({
            products,
            warehouseToId,
            companyId,
            userId
        });
        if (transactions) {
            res.status(200).json({ data: 'Transacción completada correctamente.' });
        }
    } catch (error) {
        next(error);
    }
}
```

- [ ] **Step 5: Run and confirm all pass**

Run: `npx jest tests/domain/operations-inventory-transactions --runInBand`
Expected: PASS (22 tests)

- [ ] **Step 6: Commit**

```bash
git add tests/domain/operations-inventory-transactions/transactions.test.js src/controllers/operations/inventory/transactions.controller.js src/services/operations/inventory/transactions.services.js
git commit -m "test+fix: retrofit incomeProductsInWarehouse a AppError/decodeId"
```

---

### Task 5: `incomeProductsRegister` — incluye limpieza de `console.log`

**Files:**
- Modify: `src/controllers/operations/inventory/transactions.controller.js:134-156`
- Modify: `src/services/operations/inventory/transactions.services.js:370-533`
- Test: `tests/domain/operations-inventory-transactions/transactions.test.js`

**Interfaces:**
- Consumes: `decodeId`, `AppError` (Task 1), `createRegisterFixture`, `createProductFixture`, `createCompanyWithYacht`. Relies on the fixed `Warehouse` rows with `id: 2` and `id: 9` created in Task 1's `beforeAll`.

- [ ] **Step 1: Add the failing tests**

```js
// =========================================================================
// POST /api/transactions/incomeProductsRegister
// =========================================================================

describe('POST /api/transactions/incomeProductsRegister', () => {
    it('devuelve 200 en el flujo normal', async () => {
        const { company } = await createCompanyWithYacht(`IPR-Co-${suffix()}`);
        const register = await createRegisterFixture({ companyId: company.id });
        const product = await createProductFixture();
        await createStockFixture(product.id, 9, company.id, { quantity: 20 });
        const staff = await createStaffFixture();

        const response = await auth(
            request(app)
                .post('/api/transactions/incomeProductsRegister')
                .send({
                    id: Utils.encode(register.id),
                    companyId: Utils.encode(company.id),
                    userId: Utils.encode(staff.id),
                    transactiones: [{ quantity: 6, product: { id: product.id, name: product.name } }],
                })
        );

        expect(response.status).toBe(200);

        const stockFrom = await Stock.findOne({ where: { productId: product.id, warehouseId: 9, companyId: company.id } });
        const stockTo = await Stock.findOne({ where: { productId: product.id, warehouseId: 2 } });
        expect(Number(stockFrom.quantity)).toBe(14);
        expect(Number(stockTo.quantity)).toBe(6);

        const refreshedRegister = await Register.findByPk(register.id);
        expect(refreshedRegister.isResived).toBe(true);
    });

    it('devuelve 400 cuando la cantidad cambió sin observations', async () => {
        const { company } = await createCompanyWithYacht(`IPR-NoObs-${suffix()}`);
        const register = await createRegisterFixture({ companyId: company.id });
        const product = await createProductFixture();
        const staff = await createStaffFixture();
        const original = await Transaction.create({
            productId: product.id,
            userId: staff.id,
            warehouseFromId: 9,
            warehouseToId: 2,
            quantity: 5,
            type: 'OUT',
        });

        const response = await auth(
            request(app)
                .post('/api/transactions/incomeProductsRegister')
                .send({
                    id: Utils.encode(register.id),
                    companyId: Utils.encode(company.id),
                    userId: Utils.encode(staff.id),
                    transactiones: [{ id: original.id, quantity: 9, product: { id: product.id, name: product.name } }],
                })
        );

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 400 cuando la transacción original no existe', async () => {
        const { company } = await createCompanyWithYacht(`IPR-NoOrig-${suffix()}`);
        const register = await createRegisterFixture({ companyId: company.id });
        const product = await createProductFixture();
        const staff = await createStaffFixture();

        const response = await auth(
            request(app)
                .post('/api/transactions/incomeProductsRegister')
                .send({
                    id: Utils.encode(register.id),
                    companyId: Utils.encode(company.id),
                    userId: Utils.encode(staff.id),
                    transactiones: [{ id: 999999, quantity: 3, product: { id: product.id, name: product.name } }],
                })
        );

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 400 cuando el stock de origen es insuficiente', async () => {
        const { company } = await createCompanyWithYacht(`IPR-Insuf-${suffix()}`);
        const register = await createRegisterFixture({ companyId: company.id });
        const product = await createProductFixture();
        await createStockFixture(product.id, 9, company.id, { quantity: 1 });
        const staff = await createStaffFixture();

        const response = await auth(
            request(app)
                .post('/api/transactions/incomeProductsRegister')
                .send({
                    id: Utils.encode(register.id),
                    companyId: Utils.encode(company.id),
                    userId: Utils.encode(staff.id),
                    transactiones: [{ quantity: 5, product: { id: product.id, name: product.name } }],
                })
        );

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 403 sin JWT', async () => {
        const response = await request(app).post('/api/transactions/incomeProductsRegister').send({});

        expect(response.status).toBe(403);
    });
});
```

- [ ] **Step 2: Run and confirm the new failure modes**

Run: `npx jest tests/domain/operations-inventory-transactions --runInBand -t "incomeProductsRegister"`
Expected: FAIL on every case asserting `response.body.error.code` — today's
catch-all returns a raw string body.

- [ ] **Step 3: Retrofit the service, removing the four debug `console.log`s**

Modify `src/services/operations/inventory/transactions.services.js:370-533`:

```js
    static async incomeProductsRegister(transactionData) {

        const transaction = await db.transaction();
        const { transactiones, warehouseToId, companyId, userId, registerId, observations } = transactionData;

        try {
            // Validar que haya productos
            if (!Array.isArray(transactiones) || transactiones.length === 0) {
                throw new AppError('No hay productos para procesar', 400);
            }

            // Filtrar productos con cantidad válida (> 0)
            const validProducts = transactiones.filter(product => {
                const quantity = Number(product.quantity);
                return Number.isFinite(quantity) && quantity > 0;
            });

            if (validProducts.length === 0) {
                throw new AppError('No hay productos válidos con cantidad mayor a 0', 400);
            }

            const transactionResults = await Promise.all(validProducts.map(async (transac) => {
                const quantity = Number(transac.quantity);
                let originalTransaction = null;
                let quantityDifference = 0;

                if (transac.id) {
                    originalTransaction = await Transaction.findOne({
                        where: { id: transac.id },
                        transaction,
                        lock: transaction.LOCK.UPDATE
                    });

                    if (!originalTransaction) {
                        throw new AppError(`Transacción original no encontrada para el producto ${transac.product.name}`, 400);
                    }

                    quantityDifference = quantity - originalTransaction.quantity;
                }

                const sourceWarehouseId = 9;
                const productId = transac.product.id;

                if (quantityDifference !== 0 && !observations) {
                    throw new AppError(`La cantidad del producto ${transac.product.name} ha cambiado, debe ingresar observaciones`, 400);
                }

                if (originalTransaction && observations && observations.trim() !== '' && quantityDifference !== 0) {

                    originalTransaction.quantity = quantity;
                    await originalTransaction.save({ transaction });

                    const stockFromSource = await Stock.findOne({
                        where: {
                            productId,
                            warehouseId: originalTransaction.warehouseFromId,
                            companyId
                        },
                        transaction,
                        lock: transaction.LOCK.UPDATE
                    });

                    if (!stockFromSource) {
                        throw new AppError(`Stock no encontrado para el producto ${transac.product.name} en bodega origen`, 400);
                    }

                    stockFromSource.quantity -= quantityDifference;
                    if (stockFromSource.quantity < 0) {
                        throw new AppError(`Stock insuficiente en bodega origen para el producto ${transac.product.name}: No se puede restar diferencia de ${quantityDifference}`, 400);
                    }

                    await stockFromSource.save({ transaction });

                    const [stockWarehouse9] = await Stock.findOrCreate({
                        where: {
                            productId,
                            warehouseId: sourceWarehouseId,
                            companyId
                        },
                        defaults: { quantity: 0 },
                        transaction,
                        lock: transaction.LOCK.UPDATE
                    });

                    const currentQty = Number(stockWarehouse9.quantity) || 0;
                    const newQty = Math.round((currentQty + quantityDifference) * 100) / 100;

                    stockWarehouse9.quantity = newQty;
                    await stockWarehouse9.save({ transaction });
                }

                const stockFrom = await Stock.findOne({
                    where: {
                        productId,
                        warehouseId: sourceWarehouseId,
                        companyId
                    },
                    transaction,
                    lock: transaction.LOCK.UPDATE
                });

                if (!stockFrom) {
                    throw new AppError(`Stock no encontrado para el producto ${transac.product.name} en almacén origen`, 400);
                }
                if (stockFrom.quantity < quantity) {
                    throw new AppError(`Stock insuficiente para el producto ${transac.product.name}: Disponible: ${stockFrom.quantity}, Solicitado: ${quantity}`, 400);
                }

                stockFrom.quantity -= quantity;
                await stockFrom.save({ transaction });

                const whereToCondition = {
                    productId,
                    warehouseId: warehouseToId,
                };

                const [stockToInstance] = await Stock.findOrCreate({
                    where: whereToCondition,
                    defaults: { quantity: 0 },
                    transaction,
                    lock: transaction.LOCK.UPDATE
                });

                const currentQty = Number(stockToInstance.quantity) || 0;
                const newQty = Math.round((currentQty + quantity) * 100) / 100;

                stockToInstance.quantity = newQty;
                await stockToInstance.save({ transaction });

                return await Transaction.create({
                    productId,
                    userId,
                    warehouseFromId: sourceWarehouseId,
                    warehouseToId,
                    quantity,
                    type: 'OUT'
                }, { transaction });
            }));

            // Actualizar registro una sola vez al final
            await Register.update(
                {
                    isResived: true,
                    observations
                },
                {
                    where: { id: registerId },
                    transaction
                }
            );

            await transaction.commit();
            return transactionResults;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
```

- [ ] **Step 4: Retrofit the controller**

Modify `src/controllers/operations/inventory/transactions.controller.js:134-156`:

```js
const incomeProductsRegister = async (req, res, next) => {
    try {
        const { transactiones, observations } = req.body;
        const warehouseToId = 2
        const companyId = decodeId(req.body.companyId, 'companyId');
        const userId = decodeId(req.body.userId, 'userId');
        const registerId = decodeId(req.body.id, 'id');

        await TransactionService.incomeProductsRegister({
            transactiones,
            warehouseToId,
            companyId,
            userId,
            registerId,
            observations
        });

        res.status(200).json({ data: 'Transacción completada correctamente.' });

    } catch (error) {
        next(error);
    }
}
```

- [ ] **Step 5: Run and confirm all pass**

Run: `npx jest tests/domain/operations-inventory-transactions --runInBand`
Expected: PASS (27 tests)

- [ ] **Step 6: Commit**

```bash
git add tests/domain/operations-inventory-transactions/transactions.test.js src/controllers/operations/inventory/transactions.controller.js src/services/operations/inventory/transactions.services.js
git commit -m "test+fix: retrofit incomeProductsRegister a AppError, quitar console.log de debug"
```

---

### Task 6: `printRegister`

**Files:**
- Modify: `src/controllers/operations/inventory/transactions.controller.js:158-178`
- Test: `tests/domain/operations-inventory-transactions/transactions.test.js`

**Interfaces:**
- Consumes: nothing new — no `AppError`/`decodeId` needed, this handler's
  non-200 branch stays a direct `res.status(400)` per the spec.

- [ ] **Step 1: Add the failing tests**

```js
// =========================================================================
// PUT /api/transactions/printRegister
// =========================================================================

describe('PUT /api/transactions/printRegister', () => {
    const printBody = () => ({
        counter: '000-001',
        empresa: { name: 'Empresa Test' },
        responsable: { firstName: 'Ana', lastName: 'Perez' },
        transactiones: [{ product: { name: 'Producto Test' }, quantity: 3 }],
    });

    it('devuelve 200 cuando el servicio de impresión responde 200', async () => {
        const printSpy = jest.spyOn(axios, 'post').mockResolvedValueOnce({ status: 200 });

        const response = await auth(
            request(app).put('/api/transactions/printRegister').send(printBody())
        );

        expect(response.status).toBe(200);
        expect(response.body.data).toBe('Transacción completada correctamente.');
        printSpy.mockRestore();
    });

    it('devuelve 400 cuando el servicio de impresión responde distinto de 200', async () => {
        const printSpy = jest.spyOn(axios, 'post').mockResolvedValueOnce({ status: 500 });

        const response = await auth(
            request(app).put('/api/transactions/printRegister').send(printBody())
        );

        expect(response.status).toBe(400);
        printSpy.mockRestore();
    });

    it('devuelve 500 cuando el servicio de impresión falla (delegado al handler global)', async () => {
        const printSpy = jest.spyOn(axios, 'post').mockRejectedValueOnce(new Error('print service unreachable'));

        const response = await auth(
            request(app).put('/api/transactions/printRegister').send(printBody())
        );

        expect(response.status).toBe(500);
        expect(response.body).toEqual({
            error: {
                message: 'print service unreachable',
                code: 'INTERNAL_ERROR',
            },
        });
        printSpy.mockRestore();
    });

    it('devuelve 403 sin JWT', async () => {
        const response = await request(app).put('/api/transactions/printRegister').send({});

        expect(response.status).toBe(403);
    });
});
```

- [ ] **Step 2: Run and confirm the 500 case fails**

Run: `npx jest tests/domain/operations-inventory-transactions --runInBand -t "printRegister"`
Expected: FAIL on "delegado al handler global" — today's catch responds
`res.status(400).json(error.message)` for every error, so a rejected
`axios.post` also 400s with a plain string body instead of 500ing through
`errorHandler`.

- [ ] **Step 3: Retrofit the controller**

Modify `src/controllers/operations/inventory/transactions.controller.js:158-178`:

```js
const printRegister = async (req, res, next) => {
    try {
        const formattedCounter = req.body.counter
        const company = req.body.empresa?.name
        const userName = req.body.responsable?.firstName + ' ' + req.body.responsable?.lastName
        const products = req.body.transactiones.map(transaccion => {
            return { name: transaccion.product.name, quantity: transaccion.quantity }
        })

        const result = await axios.post('http://190.12.15.164:5859/print/transactions', { products, userName, company, formattedCounter })

        if (result.status === 200) {
            res.status(200).json({ data: 'Transacción completada correctamente.' });
        } else {
            res.status(400).json({ data: 'Error al imprimir el registro.' });
        }

    } catch (error) {
        next(error);
    }
}
```

- [ ] **Step 4: Run and confirm all pass**

Run: `npx jest tests/domain/operations-inventory-transactions --runInBand`
Expected: PASS (31 tests)

- [ ] **Step 5: Commit**

```bash
git add tests/domain/operations-inventory-transactions/transactions.test.js src/controllers/operations/inventory/transactions.controller.js
git commit -m "test+fix: retrofit printRegister a next(error), delega fallas de impresión al 500 global"
```

---

### Task 7: Verificación final del dominio y de la suite completa

**Files:** none (verification only).

**Interfaces:** none.

- [ ] **Step 1: Run the domain suite three times in isolation to rule out flakiness**

Run: `npx jest tests/domain/operations-inventory-transactions --runInBand` (three times)
Expected: PASS (31 tests) all three times, matching the verification bar used
by `products`.

- [ ] **Step 2: Run the full repo test suite to confirm no cross-domain regressions**

Run: `npx jest --runInBand --roots tests`
Expected: all suites PASS. `--roots tests` is required — a bare `npx jest
--runInBand` also sweeps up `.claude/worktrees/*/tests/**/*.test.js` from
unrelated leftover worktrees (verified previously in the `products` plan);
`--roots tests` restricts Jest's file-search root and avoids that.

- [ ] **Step 3: Re-read the diff against the spec's contract table**

Manually check `git diff <first-transactions-commit>~1..HEAD -- src/controllers/operations/inventory/transactions.controller.js src/services/operations/inventory/transactions.services.js` against the "Contrato HTTP" table in `docs/superpowers/specs/2026-08-21-fase-2-inventory-transactions-design.md` — every row must have a corresponding test from Tasks 1-6.

- [ ] **Step 4: Update the spec status**

Modify `docs/superpowers/specs/2026-08-21-fase-2-inventory-transactions-design.md:4`:

```
**Estado:** Implementado
```

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/specs/2026-08-21-fase-2-inventory-transactions-design.md
git commit -m "docs: marcar spec de inventory/transactions como implementado"
```

At this point the domain is done and green. Confirm with the user before
opening a PR or merging, per how `registers` was handled (direct commits to
`trunk`, no branch/PR) versus how `products` was handled (feature branch +
PR #15) — ask which flow applies here before pushing anything.
