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
