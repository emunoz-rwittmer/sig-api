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
