# Fase 2 — Dominio yachtRequest — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retrofitear los cuatro endpoints de `/api/requests` al patrón `AppError`/`next(error)`, corregir bugs reales (variable global `action` sin declarar, crash no controlado cuando `getRequestById` no encuentra la solicitud, validación de cantidad que lanzaba `Error` genérico en vez de `AppError`), y cubrir el dominio con tests de integración sin cambiar URLs ni métodos HTTP.

**Architecture:** Se añade un helper local `decodeId` en el controller (mismo patrón que `orders.controller.js`) para convertir errores de hashid en `AppError(400)`. Cada handler reemplaza `res.status(400).json(error.message)` por `next(error)`. En el servicio, `getRequestById` retorna `null` en vez de crashear cuando `Request.findOne` no encuentra resultados (el controller decide el 404), y `updateRequest` lanza `AppError(400)` en vez de `Error` genérico para cantidades inválidas. El import duplicado `RequestService`/`YachtRequestService` (mismo módulo, dos nombres) se consolida en uno solo.

**Tech Stack:** Node.js, Express 4, Sequelize 6/MySQL, Jest + Supertest, `AppError` (`src/errors/AppError.js`), `errorHandler.middleware.js`.

**Spec:** `docs/CONVENTIONS.md` (estándar de errores definido en Fase 1) — este dominio no tiene un design doc propio, igual que `fase-2-orders`.

## Global Constraints

- Rama `refactor/fase-2-yachtrequest`, creada desde `trunk`.
- No cambiar ninguna URL ni método HTTP (incluida la ruta duplicada `PUT /:request_id` y `PUT /updateRequest/:request_id`, que apuntan al mismo handler — ambas se quedan).
- Mantener JWT via `authJwt.verifyToken` (registrado en `src/routes/index.js`: `app.use("/api/requests", authJwt.verifyToken, yachtRequestRoutes)`).
- `createDrinkRequest` en `src/services/operations/yachtRequest/yachtRequest.services.js` está fuera de scope — no se expone en `yachtRequest.controller.js`, la usa `src/controllers/bar/cruise.controller.js`. No tocar.
- Ejecutar suite parcial con `npm test -- --testPathPattern=operations-yacht-request`.
- Ejecutar suite completa con `npm test`.

---

## Task 1: Crear rama + corregir bugs de servicio + retrofit completo del controller + scaffold de tests

**Files:**
- Create: `tests/domain/operations-yacht-request/yachtRequest.test.js`
- Modify: `src/services/operations/yachtRequest/yachtRequest.services.js`
- Modify: `src/controllers/operations/yachtRequest/yachtRequest.controller.js`

**Interfaces:**
- Consumes: `tests/helpers/testApp.js` → `{ bootTestApp, shutdownTestApp }`
- Consumes: `tests/helpers/auth.js` → `{ createAuthenticatedUser }`
- Consumes: `tests/helpers/staffFixtures.js` → `{ createDepartment, createPosition, createCompanyWithYacht }`
- Consumes: `src/models/catalogs/staff.models.js` → `Staff`
- Consumes: `src/models/catalogs/wareHouse.models.js` → `Warehouse`
- Consumes: `src/models/operations/yachtRequest/request.models.js` → `Request`
- Consumes: `src/models/operations/yachtRequest/requestItems.models.js` → `RequestItems`
- Consumes: `src/models/operations/inventory/product.models.js` → `Product`
- Consumes: `src/models/operations/inventory/productConfiguration.js` → `ProductConfiguration`
- Produces: `decodeId(value, fieldName)` — helper local en el controller (lanza `AppError(400)` ante hashid inválido)
- Produces (test fixtures, usadas por Tasks 2-4): `createStaffFixture()`, `createWarehouseFixture(yachtId, overrides)`, `createRequestFixture(overrides)`, `createProductFixture(overrides)`, `createProductConfigFixture(productId, overrides)`, `createRequestItemFixture(requestId, configurationId, overrides)`

- [ ] **Step 1: Crear la rama**

```bash
git checkout trunk
git pull
git checkout -b refactor/fase-2-yachtrequest
```

- [ ] **Step 2: Escribir el test scaffold completo (fixtures + `getAllRequests`)**

Crear `tests/domain/operations-yacht-request/yachtRequest.test.js`:

```js
// El mock debe ir antes de cualquier require que importe mailer
jest.mock('../../../src/mails/mailer', () => ({
    sendEmailNewRequest: jest.fn(),
    sendConfirmationEmail: jest.fn(),
}));

const request = require('supertest');
const { bootTestApp, shutdownTestApp } = require('../../helpers/testApp');
const { createAuthenticatedUser } = require('../../helpers/auth');
const { createDepartment, createPosition, createCompanyWithYacht } = require('../../helpers/staffFixtures');
const Staff = require('../../../src/models/catalogs/staff.models');
const Warehouse = require('../../../src/models/catalogs/wareHouse.models');
const Request = require('../../../src/models/operations/yachtRequest/request.models');
const RequestItems = require('../../../src/models/operations/yachtRequest/requestItems.models');
const Product = require('../../../src/models/operations/inventory/product.models');
const ProductConfiguration = require('../../../src/models/operations/inventory/productConfiguration');
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
        lastName: `Request${s}`,
        email: `request-test-${s}@example.com`,
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

async function createRequestFixture(overrides = {}) {
    const { yacht } = await createCompanyWithYacht(`Request Company ${suffix()}`);
    const warehouse = await createWarehouseFixture(yacht.id);
    const staff = await createStaffFixture();
    return Request.create({
        warehouseId: warehouse.id,
        userId: staff.id,
        name: `Requerimiento-${suffix()}`,
        group: 'inventory_request',
        status: 'Pendiente',
        ...overrides,
    });
}

async function createProductFixture(overrides = {}) {
    const s = suffix();
    return Product.create({
        name: `Producto-${s}`,
        sku: `SKU-${s}`,
        type: 'DISCRETE',
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

async function createRequestItemFixture(requestId, configurationId, overrides = {}) {
    return RequestItems.create({
        requestId,
        configurationId,
        stock: 10,
        order: 0,
        quantity: 5,
        ...overrides,
    });
}

// =========================================================================
// GET /api/requests
// =========================================================================

describe('GET /api/requests — lista de solicitudes', () => {
    it('devuelve 200 con la lista de solicitudes', async () => {
        await createRequestFixture();

        const response = await auth(request(app).get('/api/requests'));

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
    });

    it('devuelve 403 sin JWT', async () => {
        const response = await request(app).get('/api/requests');

        expect(response.status).toBe(403);
    });
});
```

- [ ] **Step 3: Ejecutar para verificar los primeros dos tests (deben pasar sin cambios al controller)**

```bash
npm test -- --testPathPattern=operations-yacht-request
```
Esperado: 2/2 PASS — `getAllRequests` ya devuelve 200 y el JWT ya bloquea con 403.

- [ ] **Step 4: Corregir los dos bugs de `src/services/operations/yachtRequest/yachtRequest.services.js`**

Reemplazar el contenido completo del archivo:

```js
const Staff = require('../../../models/catalogs/staff.models');
const Warehouse = require('../../../models/catalogs/wareHouse.models');
const requestItems = require('../../../models/operations/yachtRequest/requestItems.models');
const Request = require('../../../models/operations/yachtRequest/request.models');
const db = require('../../../utils/database');
const RequestItems = require('../../../models/operations/yachtRequest/requestItems.models');
const ProductConfiguration = require('../../../models/operations/inventory/productConfiguration');
const Product = require('../../../models/operations/inventory/product.models');
const Stock = require('../../../models/operations/inventory/stock.models');
const AppError = require('../../../errors/AppError');

class RequestService {
    static async getAllRequests() {
        try {
            const result = await Request.findAll({
                include: [{
                    model: Warehouse,
                    as: 'warehouse',
                }, {
                    model: requestItems,
                    as: 'requestItems',
                }, {
                    model: Staff,
                    as: 'responsible',
                    attributes: ['id', 'firstName', 'lastName']
                }],
                order: [['createdAt', 'DESC']]
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getRequestById(requestId) {
        try {
            const result = await Request.findOne({
                where: { id: requestId },
                attributes: ['id', 'name', 'group', 'warehouseId', 'status', 'pax', 'cruise', 'supplyDate'],
                include: [
                    {
                        model: RequestItems,
                        as: 'requestItems',
                        include: [{
                            model: ProductConfiguration,
                            as: 'configuracion',
                            attributes: { exclude: ['createdAt', 'updatedAt'] },
                            include: [{
                                model: Product,
                                as: 'product',
                            }]
                        }]
                    },
                    {
                        model: Warehouse,
                        as: 'warehouse',
                        attributes: ['name', 'yachtId']
                    },
                    {
                        model: Staff,
                        as: 'responsible',
                        attributes: ['id', 'firstName', 'lastName']
                    }
                ],
                order: [
                    [
                        { model: RequestItems, as: 'requestItems' },
                        { model: ProductConfiguration, as: 'configuracion' },
                        { model: Product, as: 'product' },
                        'name',
                        'ASC'
                    ]
                ]
            });

            if (!result) return null;

            const currentPlain = result.get({ plain: true });
            if (currentPlain.group === 'drink_request') {
                const warehouse = await Warehouse.findOne({
                    where: { yachtId: result.warehouse.yachtId, type: 'Bar' }
                })

                currentPlain.warehouseId = warehouse.id
            }
            return currentPlain;
        } catch (error) {
            throw error;
        }
    }

    static async createRequest(data) {
        const transaction = await db.transaction();

        try {
            const result = await Request.create(data, { transaction });

            const productsRequest = data.products.map(item => ({
                ...item,
                requestId: result.id,
            }));

            await requestItems.bulkCreate(productsRequest, { transaction });

            await transaction.commit();
            return result;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    static async createDrinkRequest(yachtId, userId) {
        const transaction = await db.transaction();

        try {

            const warehouse = await Warehouse.findOne({
                where: { type: 'Bar', yachtId },
                transaction
            });

            const stocks = await Stock.findAll({
                where: { warehouseId: warehouse.id },
                include: [{
                    model: Product,
                    as: 'product',
                    include: [{
                        model: ProductConfiguration,
                        as: 'configurations'
                    }],
                }],
                transaction,
                lock: transaction.LOCK.UPDATE
            });

            const currenStocks = stocks.map(r => r.get({ plain: true }));

            const formattedDate = new Date();
            const day = formattedDate.getDate();
            const month = formattedDate.getMonth() + 1;
            const year = formattedDate.getFullYear();

            const warehouseRequest = await Warehouse.findOne({
                where: { type: 'Yate', yachtId },
                transaction
            });


            const result = await Request.create({
                warehouseId: warehouseRequest.id,
                userId,
                group: 'drink_request',
                status: 'Pendiente',
                name: `drink_request_${day}${month}${year}`,
            }, { transaction });

            const productsRequest = stocks.map(item => ({
                requestId: result.id,
                configurationId: item.product.configurations[0]?.id,
                stock: item.quantity,
                order: 0,
                quantity: 0
            }));

            await requestItems.bulkCreate(productsRequest, { transaction });

            await transaction.commit();
            return result;
        } catch (error) {
            console.log(error)
            await transaction.rollback();
            throw error;
        }
    }

    static async updateRequest(data, id) {

        if (data.items && (Array.isArray(data.items) && data.items.length > 0)) {
            for (const item of data.items) {
                const quantity = parseInt(item.quantity, 10);
                if (isNaN(quantity) || quantity < 0) {
                    throw new AppError(`Invalid quantity for item ${item.id}`, 400);
                }
            }
        }

        const transaction = await db.transaction();

        try {
            const result = await Request.update(data,
                { where: { id }, transaction });

            // Update items if provided
            if (data.items && Array.isArray(data.items) && data.items.length > 0) {
                await Promise.all(
                    data.items.map((item) => {
                        const quantity = parseInt(item.quantity, 10);
                        return requestItems.update(
                            { quantity },
                            { where: { id: item.id }, transaction }
                        );
                    })
                );
            }

            await transaction.commit();
            return result;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
}

module.exports = RequestService;
```

Cambios respecto al original: `getRequestById` retorna `null` en vez de crashear con `TypeError` cuando `Request.findOne` no encuentra resultados; `updateRequest` lanza `AppError(400)` en vez de `Error` genérico para cantidades inválidas. `createDrinkRequest` queda byte-a-byte igual (fuera de scope).

- [ ] **Step 5: Retrofit completo de `src/controllers/operations/yachtRequest/yachtRequest.controller.js`**

Reemplazar el contenido completo del archivo:

```js
const { sendEmailNewRequest, sendConfirmationEmail } = require('../../../mails/mailer');
const Staffervice = require('../../../services/catalogs/staff.services');
const WarehouseService = require('../../../services/operations/inventory/warehouse.services');
const YachtRequestService = require('../../../services/operations/yachtRequest/yachtRequest.services');
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

const getAllRequests = async (req, res, next) => {
    try {
        const result = await YachtRequestService.getAllRequests();
        if (result instanceof Array) {
            result.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
                x.dataValues.warehouseId = Utils.encode(x.dataValues.warehouseId);
            });
        }
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}

const getRequestById = async (req, res, next) => {
    try {
        const requestId = decodeId(req.params.request_id, 'request_id');
        const result = await YachtRequestService.getRequestById(requestId);
        if (!result) throw new AppError('Solicitud no encontrada', 404);

        result.id = Utils.encode(result.id);
        result.warehouseId = Utils.encode(result.warehouseId);
        result.requestItems.map(x => (
            x.stock = Quantity.viewCorrectQuantity(x.configuracion?.product, x.stock)
        ))

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}

const createRequest = async (req, res, next) => {
    try {
        const data = req.body;
        data.warehouseId = decodeId(data.warehouseId, 'warehouseId');
        data.userId = decodeId(data.userId, 'userId');

        await YachtRequestService.createRequest(data)
        const warehouse = await WarehouseService.getWarehouseById(data.warehouseId)
        const staff = await Staffervice.getStaffById(data.userId)

        const action = 'requerimiento'
        sendEmailNewRequest(warehouse.dataValues.name);
        sendConfirmationEmail(action, warehouse.dataValues.name, staff)
        res.status(200).json({ data: 'resource created successfully' });
    } catch (error) {
        next(error);
    }
}

const updateRequest = async (req, res, next) => {
    try {
        const requestId = decodeId(req.params.request_id, 'request_id');
        const data = req.body
        const [affectedRows] = await YachtRequestService.updateRequest(data, requestId);
        if (affectedRows === 0) throw new AppError('Solicitud no encontrada', 404);

        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        next(error);
    }
}


const YachtRequestController = {
    getAllRequests,
    getRequestById,
    createRequest,
    updateRequest,
}
module.exports = YachtRequestController
```

Cambios respecto al original: elimina el import duplicado `RequestService`/`YachtRequestService` (quedan solo uno), agrega `decodeId`, reemplaza los 4 `res.status(400).json(error.message)` por `next(error)`, agrega 404 explícito en `getRequestById` y `updateRequest`, declara `const action` (fix de variable global), elimina el `console.log(error)` de depuración, y renombra la variable local `company` a `warehouse` en `createRequest` (guardaba el resultado de `WarehouseService.getWarehouseById`, no una empresa).

- [ ] **Step 6: Ejecutar la suite para confirmar que los 2 tests siguen en verde**

```bash
npm test -- --testPathPattern=operations-yacht-request
```
Esperado: 2/2 PASS.

- [ ] **Step 7: Commit**

```bash
git add tests/domain/operations-yacht-request/yachtRequest.test.js \
        src/services/operations/yachtRequest/yachtRequest.services.js \
        src/controllers/operations/yachtRequest/yachtRequest.controller.js
git commit -m "refactor: retrofit yachtRequest a AppError/next(error) + fixes de servicio + scaffold test"
```

---

## Task 2: Tests de `getRequestById` (200, 400 hashid, 404, 403)

**Files:**
- Modify: `tests/domain/operations-yacht-request/yachtRequest.test.js`

**Interfaces:**
- Consumes: `createRequestFixture()`, `createProductFixture()`, `createProductConfigFixture()`, `createRequestItemFixture()` de Task 1
- Consumes: `Utils.encode(id)` para generar hashids válidos
- Consumes: endpoint `GET /api/requests/:request_id`

- [ ] **Step 1: Agregar bloque describe para `getRequestById` al final del archivo de tests**

```js
// =========================================================================
// GET /api/requests/:request_id
// =========================================================================

describe('GET /api/requests/:request_id — solicitud por ID', () => {
    it('devuelve 200 con la solicitud encontrada', async () => {
        const req = await createRequestFixture();
        const product = await createProductFixture();
        const config = await createProductConfigFixture(product.id);
        await createRequestItemFixture(req.id, config.id);

        const response = await auth(
            request(app).get(`/api/requests/${Utils.encode(req.id)}`)
        );

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('id');
        expect(response.body.requestItems).toHaveLength(1);
    });

    it('devuelve 400 con hashid inválido', async () => {
        const response = await auth(
            request(app).get('/api/requests/not-a-hashid')
        );

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 404 cuando la solicitud no existe', async () => {
        const response = await auth(
            request(app).get(`/api/requests/${Utils.encode(999999)}`)
        );

        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 403 sin JWT', async () => {
        const response = await request(app).get('/api/requests/any-id');

        expect(response.status).toBe(403);
    });
});
```

- [ ] **Step 2: Ejecutar**

```bash
npm test -- --testPathPattern=operations-yacht-request
```
Esperado: 6/6 PASS.

- [ ] **Step 3: Commit**

```bash
git add tests/domain/operations-yacht-request/yachtRequest.test.js
git commit -m "test: cubrir GET /api/requests/:request_id (200, 400, 404, 403)"
```

---

## Task 3: Tests de `createRequest` (200, 400 hashid, 403)

**Files:**
- Modify: `tests/domain/operations-yacht-request/yachtRequest.test.js`

**Interfaces:**
- Consumes: `createCompanyWithYacht()` de `tests/helpers/staffFixtures.js`, `createWarehouseFixture()`, `createStaffFixture()`, `createProductFixture()`, `createProductConfigFixture()` de Task 1
- Consumes: endpoint `POST /api/requests`

- [ ] **Step 1: Agregar bloque describe para `createRequest` al final del archivo de tests**

```js
// =========================================================================
// POST /api/requests — crear solicitud
// =========================================================================

describe('POST /api/requests — crear solicitud', () => {
    it('devuelve 200 al crear una solicitud', async () => {
        const { yacht } = await createCompanyWithYacht(`PostYacht-${suffix()}`);
        const warehouse = await createWarehouseFixture(yacht.id);
        const staff = await createStaffFixture();
        const product = await createProductFixture();
        const config = await createProductConfigFixture(product.id);

        const response = await auth(
            request(app)
                .post('/api/requests')
                .send({
                    warehouseId: Utils.encode(warehouse.id),
                    userId: Utils.encode(staff.id),
                    name: `Requerimiento-${suffix()}`,
                    group: 'inventory_request',
                    status: 'Pendiente',
                    products: [
                        { configurationId: config.id, stock: 5, order: 0, quantity: 3 },
                    ],
                })
        );

        expect(response.status).toBe(200);
        expect(response.body.data).toBe('resource created successfully');
    });

    it('devuelve 400 con warehouseId hashid inválido', async () => {
        const response = await auth(
            request(app)
                .post('/api/requests')
                .send({
                    warehouseId: 'not-a-hashid',
                    userId: 'not-a-hashid',
                    status: 'Pendiente',
                    products: [],
                })
        );

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 403 sin JWT', async () => {
        const response = await request(app).post('/api/requests').send({});

        expect(response.status).toBe(403);
    });
});
```

- [ ] **Step 2: Ejecutar**

```bash
npm test -- --testPathPattern=operations-yacht-request
```
Esperado: 9/9 PASS.

- [ ] **Step 3: Commit**

```bash
git add tests/domain/operations-yacht-request/yachtRequest.test.js
git commit -m "test: cubrir POST /api/requests (200, 400 hashid, 403)"
```

---

## Task 4: Tests de `updateRequest` (200, 400 hashid, 404, 400 cantidad inválida, 403)

**Files:**
- Modify: `tests/domain/operations-yacht-request/yachtRequest.test.js`

**Interfaces:**
- Consumes: `createRequestFixture()`, `createProductFixture()`, `createProductConfigFixture()`, `createRequestItemFixture()` de Task 1
- Consumes: endpoint `PUT /api/requests/:request_id`

- [ ] **Step 1: Agregar bloque describe para `updateRequest` al final del archivo de tests**

```js
// =========================================================================
// PUT /api/requests/:request_id
// =========================================================================

describe('PUT /api/requests/:request_id — actualizar solicitud', () => {
    it('devuelve 200 al actualizar la solicitud', async () => {
        const req = await createRequestFixture();

        const response = await auth(
            request(app)
                .put(`/api/requests/${Utils.encode(req.id)}`)
                .send({ status: 'Procesado' })
        );

        expect(response.status).toBe(200);
        expect(response.body.data).toBe('resource updated successfully');
    });

    it('devuelve 400 con hashid inválido', async () => {
        const response = await auth(
            request(app).put('/api/requests/not-a-hashid').send({ status: 'Procesado' })
        );

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 404 cuando la solicitud no existe', async () => {
        const response = await auth(
            request(app)
                .put(`/api/requests/${Utils.encode(999999)}`)
                .send({ status: 'Procesado' })
        );

        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 400 cuando un item tiene cantidad inválida', async () => {
        const req = await createRequestFixture();
        const product = await createProductFixture();
        const config = await createProductConfigFixture(product.id);
        const item = await createRequestItemFixture(req.id, config.id);

        const response = await auth(
            request(app)
                .put(`/api/requests/${Utils.encode(req.id)}`)
                .send({ items: [{ id: item.id, quantity: -1 }] })
        );

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 403 sin JWT', async () => {
        const response = await request(app)
            .put('/api/requests/any-id')
            .send({});

        expect(response.status).toBe(403);
    });
});
```

- [ ] **Step 2: Ejecutar**

```bash
npm test -- --testPathPattern=operations-yacht-request
```
Esperado: 14/14 PASS.

- [ ] **Step 3: Commit**

```bash
git add tests/domain/operations-yacht-request/yachtRequest.test.js
git commit -m "test: cubrir PUT /api/requests/:request_id (200, 400, 404, 400 cantidad, 403)"
```

---

## Task 5: Suite completa + PR

**Files:** No changes.

- [ ] **Step 1: Ejecutar la suite de yachtRequest tres veces en aislamiento**

```bash
npm test -- --testPathPattern=operations-yacht-request
npm test -- --testPathPattern=operations-yacht-request
npm test -- --testPathPattern=operations-yacht-request
```
Esperado: 14/14 PASS en las tres corridas.

- [ ] **Step 2: Ejecutar la suite global para verificar que no hay regresiones**

```bash
npm test
```
Esperado: todas las suites previas siguen en verde junto con la nueva (incluyendo `bar/cruise.controller.js`, que sigue consumiendo `createDrinkRequest` sin cambios).

- [ ] **Step 3: Push y crear PR**

```bash
git push -u origin refactor/fase-2-yachtrequest
gh pr create \
  --base trunk \
  --title "refactor: fase-2-yachtRequest — AppError/next(error) + tests de integración" \
  --body "Retrofitea los cuatro handlers del dominio \`yachtRequest\` (\`/api/requests\`) al patrón \`AppError\`/\`next(error)\`.

**Cambios en el controller:**
- Añade helper local \`decodeId\` (convierte errores de hashid en AppError 400)
- Elimina el import duplicado \`RequestService\`/\`YachtRequestService\` (mismo módulo, dos nombres)
- \`getAllRequests\`: reemplaza \`res.status(400).json(error.message)\` → \`next(error)\`
- \`getRequestById\`: agrega \`decodeId\`, 404 explícito cuando la solicitud no existe, \`next(error)\`, quita \`console.log\` de depuración
- \`createRequest\`: declara \`const action\` (fix de variable global), renombra \`company\` → \`warehouse\`, \`next(error)\`
- \`updateRequest\`: agrega \`decodeId\`, 404 via \`affectedRows === 0\`, \`next(error)\`

**Cambios en el servicio:**
- \`getRequestById\`: retorna \`null\` en vez de crashear con \`TypeError\` cuando la solicitud no existe (bug que hacía que un 404 real se reportara como 400 con mensaje interno de Node)
- \`updateRequest\`: la validación de cantidad de items lanza \`AppError(400)\` en vez de \`Error\` genérico (antes se reportaba como 500)

**Tests:** 14 tests de integración en \`tests/domain/operations-yacht-request/yachtRequest.test.js\` — tres corridas consecutivas en verde.

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

---

## Self-Review Notes

- **Bugs reales corregidos (no solo estilo):** (1) variable global `action` sin `const` en `createRequest` — mismo patrón de bug que se corrigió en `orders`; (2) `getRequestById` crasheaba con `TypeError: Cannot read properties of null (reading 'get')` cuando la solicitud no existía, reportando 400 con un mensaje interno de Node en vez de un 404 limpio; (3) `updateRequest` lanzaba `Error` genérico para cantidad inválida, que el `errorHandler` clasifica como 500 en vez de 400.
- **Fuera de scope confirmado:** `createDrinkRequest` no tiene ruta HTTP propia — solo lo llama `src/controllers/bar/cruise.controller.js:149` (`sendCruiseReport`). No se toca.
- **Ruta duplicada:** `PUT /:request_id` y `PUT /updateRequest/:request_id` apuntan al mismo handler `updateRequest`. Los tests solo ejercitan `/:request_id`; ambas rutas quedan intactas por la restricción de "no cambiar URLs".
- **Consistencia de fixtures:** todas las fixtures (`createStaffFixture`, `createWarehouseFixture`, `createRequestFixture`, `createProductFixture`, `createProductConfigFixture`, `createRequestItemFixture`) se declaran completas en Task 1 aunque solo `createRequestFixture` se usa ahí — Tasks 2-4 las consumen sin redeclararlas, siguiendo el mismo patrón que `fase-2-orders`.
- **Placeholder scan:** sin TBD/TODO; cada step tiene contenido literal de archivo o comando exacto con output esperado.
