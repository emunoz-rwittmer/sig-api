jest.mock('../../../src/mails/mailer', () => ({
    sendEmailRegisterNovelty: jest.fn(),
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const { sendEmailRegisterNovelty } = require('../../../src/mails/mailer');
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

afterEach(() => {
    jest.restoreAllMocks();
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
                    products: [{ id: Utils.encode(product.id), name: product.name, quantity: 4 }],
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

    it('despacha botellas completas de un producto en ml: descuenta y suma ml (cantidad × presentación)', async () => {
        await Consecutivo.destroy({ where: {} });
        await Consecutivo.create({ valor: 1 });

        const { company } = await createCompanyWithYacht(`TW-Ml-${suffix()}`);
        const from = await createWarehouseFixture();
        const to = await createWarehouseFixture();
        const product = await createProductFixture({ type: 'CONSUMABLE', unit: 'ml', presentationQuantity: 750 });
        await createStockFixture(product.id, from.id, company.id, { quantity: 3000 }); // 4 botellas
        const staff = await createStaffFixture();
        const send = (quantity) => auth(
            request(app)
                .post('/api/transactions/transactionBetweenWarehouse')
                .send({
                    products: [{ id: Utils.encode(product.id), name: product.name, quantity }],
                    userName: 'Tester',
                    location: 'GPS',
                    companyId: Utils.encode(company.id),
                    warehouseFromId: Utils.encode(from.id),
                    warehouseToId: Utils.encode(to.id),
                    userId: Utils.encode(staff.id),
                })
        );

        expect((await send(1)).status).toBe(200);

        const stockFrom = await Stock.findOne({ where: { productId: product.id, warehouseId: from.id } });
        const stockTo = await Stock.findOne({ where: { productId: product.id, warehouseId: to.id } });
        expect(Number(stockFrom.quantity)).toBe(2250);
        expect(Number(stockTo.quantity)).toBe(750);

        // quedan 3 botellas: pedir 4 supera el stock y no mueve nada
        const tooMany = await send(4);
        expect(tooMany.status).toBe(400);
        expect(Number((await Stock.findOne({ where: { productId: product.id, warehouseId: from.id } })).quantity)).toBe(2250);
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
                    products: [{ id: Utils.encode(product.id), name: product.name, quantity: 2 }],
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
                    products: [{ id: Utils.encode(product.id), name: product.name, quantity: 1 }],
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
                    products: [{ id: Utils.encode(product.id), name: product.name, quantity: 1 }],
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
                    products: [{ id: Utils.encode(product.id), name: product.name, quantity: 5 }],
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
                    products: [{ id: Utils.encode(product.id), quantity: 8 }],
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
// POST /api/transactions/incomeProductsRegister  (recepción libre en GPS)
// =========================================================================

// Despacho UIO -> tránsito (9) ya hecho: stock en tránsito y línea del registro.
async function createDispatchFixture({ sent = 10, originQuantity = 0, orderId } = {}) {
    const { company } = await createCompanyWithYacht(`Disp-Co-${suffix()}`);
    const origin = await createWarehouseFixture();
    const product = await createProductFixture();
    const dispatcher = await createStaffFixture();
    const register = await createRegisterFixture({ companyId: company.id, userId: dispatcher.id, orderId });
    await createStockFixture(product.id, origin.id, company.id, { quantity: originQuantity });
    await createStockFixture(product.id, 9, company.id, { quantity: sent });
    const line = await Transaction.create({
        productId: product.id,
        userId: dispatcher.id,
        warehouseFromId: origin.id,
        warehouseToId: 9,
        quantity: sent,
        type: 'OUT',
        registerId: register.id,
    });
    return { company, origin, product, dispatcher, register, line };
}

const stockQty = async (productId, warehouseId) => {
    const stock = await Stock.findOne({ where: { productId, warehouseId } });
    return stock ? Number(stock.quantity) : null;
};

const receive = (register, transactiones, observations) => auth(
    request(app)
        .post('/api/transactions/incomeProductsRegister')
        .send({ id: Utils.encode(register.id), transactiones, observations })
);

describe('POST /api/transactions/incomeProductsRegister', () => {
    it('ingresa a GPS sin novedad y guarda como receptor al usuario de la sesión, no al despachador', async () => {
        const { product, register, dispatcher, line } = await createDispatchFixture({ sent: 10 });
        const sessionUserId = Utils.decode(jwt.decode(token).id);

        const response = await receive(register, [{ id: line.id, quantity: 10, product: { id: product.id } }]);

        expect(response.status).toBe(200);
        expect(await stockQty(product.id, 9)).toBe(0);
        expect(await stockQty(product.id, 2)).toBe(10);

        const refreshed = await Register.findByPk(register.id);
        expect(refreshed.isResived).toBe(true);
        expect(refreshed.noveltyStatus).toBeNull();
        expect(refreshed.receivedBy).toBe(sessionUserId);

        const reception = await Transaction.findOne({ where: { registerId: String(register.id), warehouseFromId: 9 } });
        expect(reception.userId).toBe(sessionUserId);
        expect(reception.userId).not.toBe(dispatcher.id);
        expect(sendEmailRegisterNovelty).not.toHaveBeenCalled();
    });

    it('con faltante: ingresa lo recibido, no toca el origen ni la línea despachada y deja la novedad pendiente', async () => {
        const { product, register, origin, line } = await createDispatchFixture({ sent: 10, originQuantity: 5 });

        const response = await receive(register, [{ id: line.id, quantity: 7, product: { id: product.id } }], 'Llegaron 3 rotos');

        expect(response.status).toBe(200);
        expect(await stockQty(product.id, 2)).toBe(7);
        expect(await stockQty(product.id, 9)).toBe(3);
        expect(await stockQty(product.id, origin.id)).toBe(5);
        expect(Number((await Transaction.findByPk(line.id)).quantity)).toBe(10);

        const refreshed = await Register.findByPk(register.id);
        expect(refreshed.noveltyStatus).toBe('pendiente');
        expect(refreshed.observations).toBe('Llegaron 3 rotos');
        expect(sendEmailRegisterNovelty).toHaveBeenCalledWith(register.counter, 'Llegaron 3 rotos');
    });

    it('con sobrante y un producto que no estaba en el registro: no bloquea y tránsito queda en negativo', async () => {
        const { product, register, line } = await createDispatchFixture({ sent: 10 });
        const extra = await createProductFixture();

        const response = await receive(register, [
            { id: line.id, quantity: 12, product: { id: product.id } },
            { productId: Utils.encode(extra.id), quantity: 2 },
        ], 'Llegó de más');

        expect(response.status).toBe(200);
        expect(await stockQty(product.id, 2)).toBe(12);
        expect(await stockQty(product.id, 9)).toBe(-2);
        expect(await stockQty(extra.id, 2)).toBe(2);
        expect(await stockQty(extra.id, 9)).toBe(-2);
    });

    it('devuelve 400 si hay diferencias sin observaciones y no mueve stock', async () => {
        const { product, register, line } = await createDispatchFixture({ sent: 10 });

        const response = await receive(register, [{ id: line.id, quantity: 9, product: { id: product.id } }]);

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('AppError');
        expect(await stockQty(product.id, 9)).toBe(10);
        expect((await Register.findByPk(register.id)).isResived).toBe(false);
    });

    it('devuelve 400 si el registro ya fue ingresado (no duplica el movimiento)', async () => {
        const { product, register, line } = await createDispatchFixture({ sent: 10 });
        const payload = [{ id: line.id, quantity: 10, product: { id: product.id } }];

        await receive(register, payload);
        const second = await receive(register, payload);

        expect(second.status).toBe(400);
        expect(await stockQty(product.id, 2)).toBe(10);
    });

    it('devuelve 400 si el registro no es un despacho a tránsito', async () => {
        const register = await createRegisterFixture();
        const product = await createProductFixture();

        const response = await receive(register, [{ quantity: 3, product: { id: product.id } }]);

        expect(response.status).toBe(400);
    });

    it('devuelve 403 sin JWT', async () => {
        const response = await request(app).post('/api/transactions/incomeProductsRegister').send({});

        expect(response.status).toBe(403);
    });
});

// =========================================================================
// POST /api/transactions/resolveRegisterNovelty
// =========================================================================

const resolve = (register) => auth(
    request(app)
        .post('/api/transactions/resolveRegisterNovelty')
        .send({ id: Utils.encode(register.id) })
);

describe('POST /api/transactions/resolveRegisterNovelty', () => {
    it('devuelve al origen lo que faltó y deja tránsito en 0', async () => {
        const { product, register, origin, line } = await createDispatchFixture({ sent: 10, originQuantity: 5 });
        await receive(register, [{ id: line.id, quantity: 7, product: { id: product.id } }], 'Faltaron 3');

        const response = await resolve(register);

        expect(response.status).toBe(200);
        expect(await stockQty(product.id, 9)).toBe(0);
        expect(await stockQty(product.id, origin.id)).toBe(8);
        expect(await stockQty(product.id, 2)).toBe(7);

        const refreshed = await Register.findByPk(register.id);
        expect(refreshed.noveltyStatus).toBe('resuelta');
        expect(refreshed.resolvedBy).toBe(Utils.decode(jwt.decode(token).id));

        const adjust = await Transaction.findOne({ where: { registerId: String(register.id), type: 'ADJUST' } });
        expect(Number(adjust.quantity)).toBe(3);
        expect(adjust.warehouseToId).toBe(origin.id);
    });

    it('descuenta del origen lo que llegó de más y deja tránsito en 0', async () => {
        const { product, register, origin, line } = await createDispatchFixture({ sent: 10, originQuantity: 5 });
        await receive(register, [{ id: line.id, quantity: 12, product: { id: product.id } }], 'Sobraron 2');

        const response = await resolve(register);

        expect(response.status).toBe(200);
        expect(await stockQty(product.id, 9)).toBe(0);
        expect(await stockQty(product.id, origin.id)).toBe(3);
    });

    it('devuelve 400 si el origen no tiene stock para cubrir el sobrante y no cambia nada', async () => {
        const { product, register, origin, line } = await createDispatchFixture({ sent: 10, originQuantity: 1 });
        await receive(register, [{ id: line.id, quantity: 12, product: { id: product.id } }], 'Sobraron 2');

        const response = await resolve(register);

        expect(response.status).toBe(400);
        expect(await stockQty(product.id, origin.id)).toBe(1);
        expect(await stockQty(product.id, 9)).toBe(-2);
        expect((await Register.findByPk(register.id)).noveltyStatus).toBe('pendiente');
    });

    it('devuelve 400 si el registro no tiene novedad pendiente', async () => {
        const { register } = await createDispatchFixture();

        const response = await resolve(register);

        expect(response.status).toBe(400);
    });
});

// =========================================================================
// Match pedido <-> despacho
// =========================================================================

describe('Despacho ligado a un pedido', () => {
    const dispatch = (ctx, quantity) => auth(
        request(app)
            .post('/api/transactions/transactionBetweenWarehouse')
            .send({
                products: [{ id: Utils.encode(ctx.product.id), name: ctx.product.name, quantity }],
                userName: 'Tester',
                location: 'GPS',
                companyId: Utils.encode(ctx.order.companyId),
                warehouseFromId: Utils.encode(ctx.origin.id),
                warehouseToId: Utils.encode(9),
                userId: Utils.encode(ctx.order.userId),
                orderId: Utils.encode(ctx.order.id),
            })
    );

    it('cuadra pedido vs. despachos parciales y marca Distribuido al completar', async () => {
        const order = await createOrderFixture({ status: 'Procesado' });
        const origin = await createWarehouseFixture();
        const product = await createProductFixture();
        // El SKU del pedido llega con ceros a la izquierda; el producto se guarda sin ellos.
        await createOrderItemFixture(order.id, { sku: `00${product.sku}`, quantity: 10, originalQuantity: 12, status: 'ingresado' });
        await createStockFixture(product.id, origin.id, order.companyId, { quantity: 10 });
        const ctx = { order, origin, product };
        const summary = () => auth(request(app).get(`/api/orders/${Utils.encode(order.id)}/dispatch-summary`));

        expect((await dispatch(ctx, 4)).status).toBe(200);

        let response = await summary();
        expect(response.status).toBe(200);
        expect(response.body).toEqual([expect.objectContaining({
            sku: product.sku,
            productId: Utils.encode(product.id),
            ordered: 12,
            entered: 10,
            dispatched: 4,
            pending: 6,
        })]);
        expect((await Order.findByPk(order.id)).status).toBe('Procesado');

        expect((await dispatch(ctx, 6)).status).toBe(200);

        response = await summary();
        expect(response.body[0].pending).toBe(0);
        expect((await Order.findByPk(order.id)).status).toBe('Distribuido');
    });
});

// =========================================================================
// POST /api/transactions/exitProducts  y  /adjustProducts
// =========================================================================

describe('Salida y ajuste de stock', () => {
    const post = (path, body) => auth(request(app).post(`/api/transactions/${path}`).send(body));
    const line = (product, quantity) => ({ id: Utils.encode(product.id), name: product.name, quantity });

    it('salida: descuenta el stock y registra el motivo con el usuario de la sesión', async () => {
        const warehouse = await createWarehouseFixture();
        const product = await createProductFixture();
        await Stock.create({ productId: product.id, warehouseId: warehouse.id, quantity: 10 });

        const response = await post('exitProducts', {
            warehouseFromId: Utils.encode(warehouse.id),
            products: [line(product, 4)],
            reason: 'Baja por daño',
            note: 'Caja mojada',
        });

        expect(response.status).toBe(200);
        expect(await stockQty(product.id, warehouse.id)).toBe(6);

        const tx = await Transaction.findOne({ where: { productId: product.id } });
        expect(tx).toMatchObject({ type: 'OUT', warehouseFromId: warehouse.id, warehouseToId: null, reason: 'Baja por daño', note: 'Caja mojada' });
        expect(Number(tx.quantity)).toBe(4);
        expect(tx.userId).toBe(Utils.decode(jwt.decode(token).id));
    });

    it('salida: 400 sin motivo o con stock insuficiente, sin tocar el stock', async () => {
        const warehouse = await createWarehouseFixture();
        const product = await createProductFixture();
        await Stock.create({ productId: product.id, warehouseId: warehouse.id, quantity: 3 });
        const base = { warehouseFromId: Utils.encode(warehouse.id), products: [line(product, 5)] };

        expect((await post('exitProducts', base)).status).toBe(400);
        expect((await post('exitProducts', { ...base, reason: 'Consumo interno' })).status).toBe(400);
        expect(await stockQty(product.id, warehouse.id)).toBe(3);
    });

    it('salida: en una bodega con stock por empresa exige la empresa y descuenta solo de esa', async () => {
        const warehouse = await createWarehouseFixture();
        const product = await createProductFixture();
        const { company: a } = await createCompanyWithYacht(`Exit-A-${suffix()}`);
        const { company: b } = await createCompanyWithYacht(`Exit-B-${suffix()}`);
        await createStockFixture(product.id, warehouse.id, a.id, { quantity: 10 });
        await createStockFixture(product.id, warehouse.id, b.id, { quantity: 10 });
        const base = { warehouseFromId: Utils.encode(warehouse.id), products: [line(product, 4)], reason: 'Vencido' };

        expect((await post('exitProducts', base)).status).toBe(400);
        expect((await post('exitProducts', { ...base, companyId: Utils.encode(b.id) })).status).toBe(200);

        const rows = await Stock.findAll({ where: { productId: product.id, warehouseId: warehouse.id } });
        expect(Object.fromEntries(rows.map((row) => [row.companyId, Number(row.quantity)]))).toEqual({ [a.id]: 10, [b.id]: 6 });
    });

    it('ajuste: deja el stock igual al conteo y registra solo la diferencia, en el sentido correcto', async () => {
        const warehouse = await createWarehouseFixture();
        const missing = await createProductFixture();
        const surplus = await createProductFixture();
        const same = await createProductFixture();
        const fresh = await createProductFixture();
        await Stock.create({ productId: missing.id, warehouseId: warehouse.id, quantity: 10 });
        await Stock.create({ productId: surplus.id, warehouseId: warehouse.id, quantity: 10 });
        await Stock.create({ productId: same.id, warehouseId: warehouse.id, quantity: 10 });

        const response = await post('adjustProducts', {
            warehouseId: Utils.encode(warehouse.id),
            products: [line(missing, 7), line(surplus, 12), line(same, 10), line(fresh, 5)],
            reason: 'Conteo físico',
        });

        expect(response.status).toBe(200);
        expect(await stockQty(missing.id, warehouse.id)).toBe(7);
        expect(await stockQty(surplus.id, warehouse.id)).toBe(12);
        expect(await stockQty(fresh.id, warehouse.id)).toBe(5);

        const down = await Transaction.findOne({ where: { productId: missing.id } });
        expect(down).toMatchObject({ type: 'ADJUST', warehouseFromId: warehouse.id, warehouseToId: null, reason: 'Conteo físico' });
        expect(Number(down.quantity)).toBe(3);
        const up = await Transaction.findOne({ where: { productId: surplus.id } });
        expect(up).toMatchObject({ type: 'ADJUST', warehouseFromId: null, warehouseToId: warehouse.id });
        expect(Number(up.quantity)).toBe(2);
        // Sin diferencia no se registra nada
        expect(await Transaction.count({ where: { productId: same.id } })).toBe(0);
    });

    it('ajuste: un producto en ml se cuenta en botellas (con decimales) y el stock queda en ml', async () => {
        const warehouse = await createWarehouseFixture();
        const bottle = await createProductFixture({ type: 'CONSUMABLE', unit: 'ml', presentationQuantity: 750 });
        await Stock.create({ productId: bottle.id, warehouseId: warehouse.id, quantity: 3000 });

        const response = await post('adjustProducts', {
            warehouseId: Utils.encode(warehouse.id),
            products: [line(bottle, 3.5)],
            reason: 'Conteo físico',
        });

        expect(response.status).toBe(200);
        expect(await stockQty(bottle.id, warehouse.id)).toBe(2625);
        const tx = await Transaction.findOne({ where: { productId: bottle.id } });
        expect(Number(tx.quantity)).toBe(0.5);
        expect(tx.warehouseFromId).toBe(warehouse.id);
    });

    it('ajuste: 400 sin motivo o con conteo negativo', async () => {
        const warehouse = await createWarehouseFixture();
        const product = await createProductFixture();
        const base = { warehouseId: Utils.encode(warehouse.id), products: [line(product, 5)] };

        expect((await post('adjustProducts', base)).status).toBe(400);
        expect((await post('adjustProducts', { ...base, products: [line(product, -1)], reason: 'Conteo físico' })).status).toBe(400);
    });
});

// =========================================================================
// Productos sin control de stock y productos fusionados
// =========================================================================

describe('Productos sin control de stock y fusionados', () => {
    it('sin control de stock: la transferencia y la salida se registran sin validar ni mover cantidades; el ajuste se rechaza', async () => {
        await Consecutivo.destroy({ where: {} });
        await Consecutivo.create({ valor: 1 });
        const { company } = await createCompanyWithYacht(`NoCtrl-${suffix()}`);
        const from = await createWarehouseFixture();
        const to = await createWarehouseFixture();
        const linen = await createProductFixture({ controlsStock: false });
        const staff = await createStaffFixture();
        const line = { id: Utils.encode(linen.id), name: linen.name, quantity: 8 };

        const transfer = await auth(request(app).post('/api/transactions/transactionBetweenWarehouse').send({
            products: [line],
            userName: 'Tester',
            location: 'GPS',
            companyId: Utils.encode(company.id),
            warehouseFromId: Utils.encode(from.id),
            warehouseToId: Utils.encode(to.id),
            userId: Utils.encode(staff.id),
        }));
        const exit = await auth(request(app).post('/api/transactions/exitProducts').send({
            warehouseFromId: Utils.encode(from.id), products: [line], reason: 'Baja por daño',
        }));
        const adjust = await auth(request(app).post('/api/transactions/adjustProducts').send({
            warehouseId: Utils.encode(from.id), products: [line], reason: 'Conteo físico',
        }));

        expect(transfer.status).toBe(200);
        expect(exit.status).toBe(200);
        expect(adjust.status).toBe(400);
        expect(await Stock.count({ where: { productId: linen.id } })).toBe(0);
        expect(await Transaction.count({ where: { productId: linen.id } })).toBe(2);
    });

    it('el SKU de un producto fusionado ingresa el pedido al producto vigente', async () => {
        const current = await createProductFixture();
        const merged = await createProductFixture({ active: false, mergedIntoId: current.id });
        const warehouse = await createWarehouseFixture();
        const order = await createOrderFixture();
        const item = await createOrderItemFixture(order.id, { sku: merged.sku });
        const staff = await createStaffFixture();

        const response = await auth(request(app).post(`/api/transactions/productEntryInWarehouse/${warehouse.id}`).send({
            id: item.id,
            product: merged.name,
            sku: merged.sku,
            quantity: 6,
            companyId: order.companyId,
            user: Utils.encode(staff.id),
        }));

        expect(response.status).toBe(200);
        expect(await stockQty(current.id, warehouse.id)).toBe(6);
        expect(await Stock.count({ where: { productId: merged.id } })).toBe(0);
    });
});

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
    });

    it('devuelve 400 cuando el servicio de impresión responde distinto de 200', async () => {
        const printSpy = jest.spyOn(axios, 'post').mockResolvedValueOnce({ status: 500 });

        const response = await auth(
            request(app).put('/api/transactions/printRegister').send(printBody())
        );

        expect(response.status).toBe(400);
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
    });

    it('devuelve 403 sin JWT', async () => {
        const response = await request(app).put('/api/transactions/printRegister').send({});

        expect(response.status).toBe(403);
    });
});
