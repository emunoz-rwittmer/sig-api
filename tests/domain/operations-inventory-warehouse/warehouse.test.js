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
