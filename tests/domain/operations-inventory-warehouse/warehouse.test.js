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
