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
