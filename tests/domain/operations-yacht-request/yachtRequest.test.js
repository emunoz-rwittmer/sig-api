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
