# Fase 2 — Dominio Orders — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retrofitear los cinco endpoints de `/api/orders` al patrón `AppError`/`next(error)`, corregir bugs de validación (`req.file` faltante, 404 no reportados, variable global sin declarar), y cubrir el dominio con tests de integración sin cambiar URLs ni métodos HTTP.

**Architecture:** Se añade un helper local `decodeId` en el controller para convertir errores de hashid en `AppError(400)`. Cada handler reemplaza `res.status(400).json(error.message)` por `next(error)`. Se agregan validaciones explícitas de `req.file` en `createOrder`, checks de existencia (404) en `getOrderById`, `updateOrder` y `deleteItem`, y se declara `const action` en `createOrder` (bug de variable global). El mailer se mockea en tests con `jest.mock`.

**Tech Stack:** Node.js, Express 4, Sequelize 6/MySQL, Jest + Supertest, xlsx, `AppError` (`src/errors/AppError.js`), `errorHandler.middleware.js`.

## Restricciones globales

- Rama `refactor/fase-2-orders`, creada desde `trunk`.
- No cambiar ninguna URL ni método HTTP.
- Mantener JWT via `authJwt.verifyToken` (registrado en `src/routes/index.js`: `app.use("/api/orders", authJwt.verifyToken, ordersRoutes)`).
- No modificar `src/services/operations/orders/orders.services.js` (ya usa el patrón correcto `throw error`).
- `src/controllers/reports/generateOrderExcel.js` ya usa `AppError`/`next(error)` — fuera de scope.
- Ejecutar suite parcial con `npm test -- --testPathPattern=operations-orders`.
- Ejecutar suite completa con `npm test`.

---

## Task 1: Crear rama + scaffold test + retrofit completo del controller

**Files:**
- Create: `tests/domain/operations-orders/orders.test.js`
- Modify: `src/controllers/operations/orders/orders.controller.js`

**Interfaces:**
- Consumes: `tests/helpers/testApp.js` → `{ bootTestApp, shutdownTestApp }`
- Consumes: `tests/helpers/auth.js` → `{ createAuthenticatedUser }`
- Consumes: `tests/helpers/staffFixtures.js` → `{ createDepartment, createPosition, createCompanyWithYacht }`
- Consumes: `src/models/operations/orders/order.models.js` → `Order`
- Consumes: `src/models/operations/orders/orderItems.models.js` → `orderItems`
- Consumes: `src/models/catalogs/staff.models.js` → `Staff`
- Produces: `decodeId(value, fieldName)` — helper local en el controller (lanzará `AppError(400)` ante hashid inválido)

- [ ] **Step 1: Crear la rama**

```bash
git checkout trunk
git pull
git checkout -b refactor/fase-2-orders
```

- [ ] **Step 2: Escribir el test scaffold con los tests para `getAllOrders`**

Crear `tests/domain/operations-orders/orders.test.js`:

```js
// El mock debe ir antes de cualquier require que importe mailer
jest.mock('../../../src/mails/mailer', () => ({
    sendEmailNewOrder: jest.fn(),
    sendConfirmationEmail: jest.fn(),
    sendDispatchEmail: jest.fn(),
}));

const request = require('supertest');
const XLSX = require('xlsx');
const { bootTestApp, shutdownTestApp } = require('../../helpers/testApp');
const { createAuthenticatedUser } = require('../../helpers/auth');
const { createDepartment, createPosition, createCompanyWithYacht } = require('../../helpers/staffFixtures');
const Staff = require('../../../src/models/catalogs/staff.models');
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
        lastName: `Orders${s}`,
        email: `orders-test-${s}@example.com`,
        cellPhone: '0966666666',
        password: 'Sup3rSecret!',
        departamentId: dept.id,
        positionId: pos.id,
        contractType: 'Fijo',
        active: true,
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

// Genera un buffer .xlsx mínimo con las columnas que espera createOrder
function createExcelBuffer() {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet([
        { sku: 'SKU-001', product: 'Producto Test', quantity: 5, originalQuantity: 5 },
    ]);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

// =========================================================================
// GET /api/orders
// =========================================================================

describe('GET /api/orders — lista de órdenes', () => {
    it('devuelve 200 con la lista de órdenes', async () => {
        await createOrderFixture();

        const response = await auth(request(app).get('/api/orders'));

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
    });

    it('devuelve 401 sin JWT', async () => {
        const response = await request(app).get('/api/orders');

        expect(response.status).toBe(401);
    });
});
```

- [ ] **Step 3: Ejecutar para verificar los primeros dos tests (deben pasar sin cambios al controller)**

```bash
npm test -- --testPathPattern=operations-orders
```
Esperado: 2/2 PASS — `getAllOrders` ya devuelve 200 y el JWT ya bloquea con 401.

- [ ] **Step 4: Retrofit completo de `src/controllers/operations/orders/orders.controller.js`**

Reemplazar el contenido completo del archivo:

```js
const OrderService = require('../../../services/operations/orders/orders.services');
const Utils = require('../../../utils/Utils');
const CompanyService = require('../../../services/catalogs/company.services');
const XLSX = require('xlsx');
const { sendEmailNewOrder, sendConfirmationEmail, sendDispatchEmail } = require('../../../mails/mailer');
const Staffervice = require('../../../services/catalogs/staff.services');
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

const getAllOrders = async (req, res, next) => {
    try {
        const result = await OrderService.getAllOrders();
        if (result instanceof Array) {
            result.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
                x.dataValues.companyId = Utils.encode(x.dataValues.companyId);
            });
        }
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const getOrderById = async (req, res, next) => {
    try {
        const orderId = decodeId(req.params.order_id, 'order_id');
        const result = await OrderService.getOrderById(orderId);
        if (!result) throw new AppError('Orden no encontrada', 404);
        result.id = Utils.encode(result.id);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const createOrder = async (req, res, next) => {
    try {
        if (!req.file) throw new AppError('Archivo Excel requerido', 400);

        const data = req.body;
        data.companyId = decodeId(data.companyId, 'companyId');
        data.userId = decodeId(data.userId, 'userId');

        const fieldMapping = {
            'sku': 'sku',
            'product': 'product',
            'quantity': 'quantity',
            'originalQuantity': 'originalQuantity',
        };

        const workbook = XLSX.readFile(req.file.path);
        const sheet_name_list = workbook.SheetNames;
        const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]]);
        const mappedData = jsonData.map(row => {
            const mappedRow = {};
            for (const [excelField, modelField] of Object.entries(fieldMapping)) {
                mappedRow[modelField] = row[excelField];
            }
            return mappedRow;
        });

        await OrderService.createOrder(data, mappedData);

        const company = await CompanyService.getCompanyById(data.companyId);
        const staff = await Staffervice.getStaffById(data.userId);
        const action = 'pedido';
        sendEmailNewOrder(company.name);
        sendConfirmationEmail(action, company.name, staff);
        res.status(200).json({ data: 'resource created successfully' });
    } catch (error) {
        next(error);
    }
};

const updateOrder = async (req, res, next) => {
    try {
        const orderId = decodeId(req.params.order_id, 'order_id');
        const data = req.body;
        const [affectedRows] = await OrderService.updateOrder(data, {
            where: { id: orderId },
        });
        if (affectedRows === 0) throw new AppError('Orden no encontrada', 404);
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        next(error);
    }
};

const deleteItem = async (req, res, next) => {
    try {
        const itemId = decodeId(req.params.item_id, 'item_id');
        const result = await OrderService.deleteItem(itemId);
        if (!result) throw new AppError('Item no encontrado', 404);
        res.status(200).json({ data: result });
    } catch (error) {
        next(error);
    }
};

const OrderController = {
    getAllOrders,
    getOrderById,
    createOrder,
    updateOrder,
    deleteItem,
};
module.exports = OrderController;
```

- [ ] **Step 5: Ejecutar la suite para confirmar que los 2 tests siguen en verde**

```bash
npm test -- --testPathPattern=operations-orders
```
Esperado: 2/2 PASS.

- [ ] **Step 6: Commit**

```bash
git add tests/domain/operations-orders/orders.test.js \
        src/controllers/operations/orders/orders.controller.js
git commit -m "refactor: retrofit orders.controller a AppError/next(error) + scaffold test"
```

---

## Task 2: Tests de `getOrderById` (200, 400 hashid, 404, 401)

**Files:**
- Modify: `tests/domain/operations-orders/orders.test.js`

**Interfaces:**
- Consumes: `createOrderFixture()` de Task 1
- Consumes: `Utils.encode(id)` para generar hashids válidos
- Consumes: endpoint `GET /api/orders/:order_id`

- [ ] **Step 1: Agregar bloque describe para `getOrderById` al final del archivo de tests**

```js
// =========================================================================
// GET /api/orders/:order_id
// =========================================================================

describe('GET /api/orders/:order_id — orden por ID', () => {
    it('devuelve 200 con la orden encontrada', async () => {
        const order = await createOrderFixture();

        const response = await auth(
            request(app).get(`/api/orders/${Utils.encode(order.id)}`)
        );

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('id');
    });

    it('devuelve 400 con hashid inválido', async () => {
        const response = await auth(
            request(app).get('/api/orders/not-a-hashid')
        );

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 404 cuando la orden no existe', async () => {
        const response = await auth(
            request(app).get(`/api/orders/${Utils.encode(999999)}`)
        );

        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 401 sin JWT', async () => {
        const response = await request(app).get('/api/orders/any-id');

        expect(response.status).toBe(401);
    });
});
```

- [ ] **Step 2: Ejecutar**

```bash
npm test -- --testPathPattern=operations-orders
```
Esperado: 6/6 PASS.

- [ ] **Step 3: Commit**

```bash
git add tests/domain/operations-orders/orders.test.js
git commit -m "test: cubrir GET /api/orders/:order_id (200, 400, 404, 401)"
```

---

## Task 3: Tests de `updateOrder` (200, 400 hashid, 404, 401)

**Files:**
- Modify: `tests/domain/operations-orders/orders.test.js`

**Interfaces:**
- Consumes: `createOrderFixture()` de Task 1
- Consumes: endpoint `PUT /api/orders/:order_id`

- [ ] **Step 1: Agregar bloque describe para `updateOrder` al final del archivo de tests**

```js
// =========================================================================
// PUT /api/orders/:order_id
// =========================================================================

describe('PUT /api/orders/:order_id — actualizar orden', () => {
    it('devuelve 200 al actualizar la orden', async () => {
        const order = await createOrderFixture();

        const response = await auth(
            request(app)
                .put(`/api/orders/${Utils.encode(order.id)}`)
                .send({ status: 'procesado' })
        );

        expect(response.status).toBe(200);
        expect(response.body.data).toBe('resource updated successfully');
    });

    it('devuelve 400 con hashid inválido', async () => {
        const response = await auth(
            request(app).put('/api/orders/not-a-hashid').send({ status: 'procesado' })
        );

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 404 cuando la orden no existe', async () => {
        const response = await auth(
            request(app)
                .put(`/api/orders/${Utils.encode(999999)}`)
                .send({ status: 'procesado' })
        );

        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 401 sin JWT', async () => {
        const response = await request(app)
            .put('/api/orders/any-id')
            .send({});

        expect(response.status).toBe(401);
    });
});
```

- [ ] **Step 2: Ejecutar**

```bash
npm test -- --testPathPattern=operations-orders
```
Esperado: 10/10 PASS.

- [ ] **Step 3: Commit**

```bash
git add tests/domain/operations-orders/orders.test.js
git commit -m "test: cubrir PUT /api/orders/:order_id (200, 400, 404, 401)"
```

---

## Task 4: Tests de `deleteItem` (200, 400 hashid, 404, 401)

**Files:**
- Modify: `tests/domain/operations-orders/orders.test.js`

**Interfaces:**
- Consumes: `createOrderFixture()` + `createOrderItemFixture()` de Task 1
- Consumes: endpoint `DELETE /api/orders/deleteItem/:item_id`

- [ ] **Step 1: Agregar bloque describe para `deleteItem` al final del archivo de tests**

```js
// =========================================================================
// DELETE /api/orders/deleteItem/:item_id
// =========================================================================

describe('DELETE /api/orders/deleteItem/:item_id — eliminar item', () => {
    it('devuelve 200 al eliminar el item', async () => {
        const order = await createOrderFixture();
        const item = await createOrderItemFixture(order.id);

        const response = await auth(
            request(app).delete(`/api/orders/deleteItem/${Utils.encode(item.id)}`)
        );

        expect(response.status).toBe(200);
        expect(response.body.data).toBe('resource deleted successfully');
    });

    it('devuelve 400 con hashid inválido', async () => {
        const response = await auth(
            request(app).delete('/api/orders/deleteItem/not-a-hashid')
        );

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 404 cuando el item no existe', async () => {
        const response = await auth(
            request(app).delete(`/api/orders/deleteItem/${Utils.encode(999999)}`)
        );

        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 401 sin JWT', async () => {
        const response = await request(app).delete('/api/orders/deleteItem/any-id');

        expect(response.status).toBe(401);
    });
});
```

- [ ] **Step 2: Ejecutar**

```bash
npm test -- --testPathPattern=operations-orders
```
Esperado: 14/14 PASS.

- [ ] **Step 3: Commit**

```bash
git add tests/domain/operations-orders/orders.test.js
git commit -m "test: cubrir DELETE /api/orders/deleteItem/:item_id (200, 400, 404, 401)"
```

---

## Task 5: Tests de `createOrder` (Excel + mailer mock)

**Files:**
- Modify: `tests/domain/operations-orders/orders.test.js`

**Interfaces:**
- Consumes: `createExcelBuffer()` de Task 1 (genera un `.xlsx` real en memoria)
- Consumes: `jest.mock('../../../src/mails/mailer')` ya declarado en el tope del archivo
- Consumes: `createCompanyWithYacht()` y `createStaffFixture()` de Task 1
- Consumes: endpoint `POST /api/orders` (multer campo `file`)

- [ ] **Step 1: Agregar bloque describe para `createOrder` al final del archivo de tests**

```js
// =========================================================================
// POST /api/orders — crear orden con Excel
// =========================================================================

describe('POST /api/orders — crear orden', () => {
    it('devuelve 200 al crear una orden con Excel válido', async () => {
        const { company } = await createCompanyWithYacht(`PostCo-${suffix()}`);
        const staff = await createStaffFixture();
        const excelBuffer = createExcelBuffer();

        const response = await auth(
            request(app)
                .post('/api/orders')
                .field('companyId', Utils.encode(company.id))
                .field('userId', Utils.encode(staff.id))
                .field('name', `Pedido-${suffix()}`)
                .field('status', 'en espera')
                .field('guide', `GUIDE-${suffix()}`)
                .attach('file', excelBuffer, 'pedido.xlsx')
        );

        expect(response.status).toBe(200);
        expect(response.body.data).toBe('resource created successfully');
    });

    it('devuelve 400 sin archivo Excel', async () => {
        const { company } = await createCompanyWithYacht(`PostCo-${suffix()}`);
        const staff = await createStaffFixture();

        const response = await auth(
            request(app)
                .post('/api/orders')
                .field('companyId', Utils.encode(company.id))
                .field('userId', Utils.encode(staff.id))
                .field('status', 'en espera')
                // sin .attach — req.file queda undefined
        );

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 400 con companyId hashid inválido', async () => {
        const excelBuffer = createExcelBuffer();

        const response = await auth(
            request(app)
                .post('/api/orders')
                .field('companyId', 'not-a-hashid')
                .field('userId', 'not-a-hashid')
                .field('status', 'en espera')
                .attach('file', excelBuffer, 'pedido.xlsx')
        );

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 401 sin JWT', async () => {
        const response = await request(app).post('/api/orders');

        expect(response.status).toBe(401);
    });
});
```

- [ ] **Step 2: Ejecutar**

```bash
npm test -- --testPathPattern=operations-orders
```
Esperado: 18/18 PASS.

- [ ] **Step 3: Commit**

```bash
git add tests/domain/operations-orders/orders.test.js
git commit -m "test: cubrir POST /api/orders (200, 400 sin archivo, 400 hashid, 401)"
```

---

## Task 6: Suite completa + PR

**Files:**
- No changes.

- [ ] **Step 1: Ejecutar la suite de orders tres veces en aislamiento**

```bash
npm test -- --testPathPattern=operations-orders
npm test -- --testPathPattern=operations-orders
npm test -- --testPathPattern=operations-orders
```
Esperado: 18/18 PASS en las tres corridas.

- [ ] **Step 2: Ejecutar la suite global para verificar que no hay regresiones**

```bash
npm test
```
Esperado: todas las suites previas siguen en verde junto con la nueva.

- [ ] **Step 3: Push y crear PR**

```bash
git push -u origin refactor/fase-2-orders
gh pr create \
  --base trunk \
  --title "refactor: fase-2-orders — AppError/next(error) + tests de integración" \
  --body "Retrofitea los cinco handlers del dominio \`orders\` al patrón \`AppError\`/\`next(error)\`.

**Cambios en el controller:**
- Añade helper local \`decodeId\` (convierte errores de hashid en AppError 400)
- \`getAllOrders\`: reemplaza \`res.status(400).json(error.message)\` → \`next(error)\`
- \`getOrderById\`: agrega \`decodeId\`, 404 cuando la orden no existe, \`next(error)\`
- \`updateOrder\`: agrega \`decodeId\`, 404 via \`affectedRows === 0\`, \`next(error)\`
- \`deleteItem\`: agrega \`decodeId\`, 404 cuando el item no existe, \`next(error)\`
- \`createOrder\`: valida \`req.file\` (AppError 400), declara \`const action\` (fix de variable global), \`next(error)\`

**Tests:** 18 tests de integración en \`tests/domain/operations-orders/orders.test.js\` — tres corridas consecutivas en verde.

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```
