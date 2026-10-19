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

    it('codifica configuracion.productId como hashid para reenviarlo en la transacción entre bodegas', async () => {
        const req = await createRequestFixture();
        const product = await createProductFixture();
        const config = await createProductConfigFixture(product.id);
        await createRequestItemFixture(req.id, config.id);

        const response = await auth(
            request(app).get(`/api/requests/${Utils.encode(req.id)}`)
        );

        expect(response.status).toBe(200);
        expect(response.body.requestItems[0].configuracion.productId).toBe(Utils.encode(product.id));
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

    it('guarda puerto de entrega, fecha requerida y nota, y los devuelve al consultar la solicitud', async () => {
        const { yacht } = await createCompanyWithYacht(`PostYacht-${suffix()}`);
        const warehouse = await createWarehouseFixture(yacht.id);
        const staff = await createStaffFixture();
        const product = await createProductFixture();
        const config = await createProductConfigFixture(product.id);
        const name = `Requerimiento-${suffix()}`;

        const created = await auth(
            request(app)
                .post('/api/requests')
                .send({
                    warehouseId: Utils.encode(warehouse.id),
                    userId: Utils.encode(staff.id),
                    name,
                    group: 'food_request',
                    status: 'Pendiente',
                    deliveryPort: 'Puerto Ayora',
                    requiredDate: '2026-10-24',
                    note: '  crucero de 8 días  ',
                    products: [{ configurationId: config.id, stock: 1, order: 2 }],
                })
        );
        expect(created.status).toBe(200);

        const saved = await Request.findOne({ where: { name } });
        expect(saved.deliveryPort).toBe('Puerto Ayora');
        expect(saved.requiredDate).toBe('2026-10-24');
        expect(saved.note).toBe('crucero de 8 días');

        const detail = await auth(request(app).get(`/api/requests/${Utils.encode(saved.id)}`));
        expect(detail.status).toBe(200);
        expect(detail.body).toMatchObject({ deliveryPort: 'Puerto Ayora', requiredDate: '2026-10-24', note: 'crucero de 8 días' });
        expect(detail.body.createdAt).toBeDefined();
    });

    it('acepta la solicitud sin los campos de entrega (quedan en null)', async () => {
        const { yacht } = await createCompanyWithYacht(`PostYacht-${suffix()}`);
        const warehouse = await createWarehouseFixture(yacht.id);
        const staff = await createStaffFixture();
        const name = `Requerimiento-${suffix()}`;

        const response = await auth(
            request(app)
                .post('/api/requests')
                .send({
                    warehouseId: Utils.encode(warehouse.id),
                    userId: Utils.encode(staff.id),
                    name,
                    group: 'food_request',
                    status: 'Pendiente',
                    deliveryPort: '',
                    note: '   ',
                    products: [],
                })
        );

        expect(response.status).toBe(200);
        const saved = await Request.findOne({ where: { name } });
        expect(saved.deliveryPort).toBeNull();
        expect(saved.requiredDate).toBeNull();
        expect(saved.note).toBeNull();
    });

    it.each([
        ['requiredDate inválida', { requiredDate: 'no-es-fecha' }],
        ['nota demasiado larga', { note: 'x'.repeat(1001) }],
        ['puerto demasiado largo', { deliveryPort: 'x'.repeat(101) }],
    ])('devuelve 400 con %s', async (_label, extra) => {
        const { yacht } = await createCompanyWithYacht(`PostYacht-${suffix()}`);
        const warehouse = await createWarehouseFixture(yacht.id);
        const staff = await createStaffFixture();

        const response = await auth(
            request(app)
                .post('/api/requests')
                .send({
                    warehouseId: Utils.encode(warehouse.id),
                    userId: Utils.encode(staff.id),
                    status: 'Pendiente',
                    products: [],
                    ...extra,
                })
        );

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('AppError');
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

    it('devuelve 400 cuando products no es un arreglo', async () => {
        const { yacht } = await createCompanyWithYacht(`PostYacht-${suffix()}`);
        const warehouse = await createWarehouseFixture(yacht.id);
        const staff = await createStaffFixture();

        const response = await auth(
            request(app)
                .post('/api/requests')
                .send({
                    warehouseId: Utils.encode(warehouse.id),
                    userId: Utils.encode(staff.id),
                    name: `Requerimiento-${suffix()}`,
                    group: 'inventory_request',
                    status: 'Pendiente',
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

// =========================================================================
// GET /api/requests/search — listado paginado con filtros en SQL
// =========================================================================

describe('GET /api/requests/search — listado filtrado por el backend', () => {
    const search = (query) => auth(request(app).get('/api/requests/search').query(query));

    async function createScenario() {
        const tag = suffix();
        const { yacht } = await createCompanyWithYacht(`Search Company ${tag}`);
        const warehouseA = await createWarehouseFixture(yacht.id);
        const warehouseB = await createWarehouseFixture(yacht.id);
        const staff = await createStaffFixture();
        const base = { userId: staff.id, status: 'Pendiente', group: 'food_request' };

        const pendingFood = await Request.create({ ...base, warehouseId: warehouseA.id, name: `food_${tag}` });
        const processedFood = await Request.create({ ...base, warehouseId: warehouseA.id, name: `done_${tag}`, status: 'Procesado' });
        const lingerie = await Request.create({ ...base, warehouseId: warehouseB.id, name: `lingerie_${tag}`, group: 'lingerie_request' });
        const product = await createProductFixture();
        const config = await createProductConfigFixture(product.id);
        await createRequestItemFixture(pendingFood.id, config.id);
        await createRequestItemFixture(pendingFood.id, config.id);
        await createRequestItemFixture(lingerie.id, config.id);

        const scope = [warehouseA, warehouseB].map((w) => Utils.encode(w.id)).join(',');
        return { tag, staff, warehouseA, warehouseB, pendingFood, processedFood, lingerie, scope };
    }

    it('pagina, cuenta los productos sin traer los items y calcula los totales', async () => {
        const { scope, warehouseA, pendingFood } = await createScenario();

        const response = await search({ warehouseIds: scope, pageSize: 2 });

        expect(response.status).toBe(200);
        expect(response.body.total).toBe(3);
        expect(response.body.rows).toHaveLength(2);
        expect(response.body.rows[0]).not.toHaveProperty('requestItems');
        expect(response.body.summary).toMatchObject({ total: 3, pending: 2, processed: 1, products: 3 });
        expect(response.body.types).toMatchObject({ all: 3, food_request: 2, lingerie_request: 1 });
        const yachtA = response.body.yachts.find((y) => y.warehouseId === Utils.encode(warehouseA.id));
        expect(yachtA).toMatchObject({ total: 2, pending: 1 });
        expect(response.body.years).toContain(new Date().getFullYear());

        const second = await search({ warehouseIds: scope, pageSize: 2, page: 2 });
        expect(second.body.rows).toHaveLength(1);
        const names = [...response.body.rows, ...second.body.rows].map((row) => row.name);
        expect(new Set(names).size).toBe(3);
        const food = [...response.body.rows, ...second.body.rows].find((row) => row.id === Utils.encode(pendingFood.id));
        expect(food.productCount).toBe(2);
    });

    it('filtra por estado, tipo, yate y texto (nombre o solicitante)', async () => {
        const { scope, warehouseA, staff, tag } = await createScenario();

        const byStatus = await search({ warehouseIds: scope, status: 'Procesado' });
        expect(byStatus.body.rows.map((r) => r.name)).toEqual([`done_${tag}`]);

        const byGroup = await search({ warehouseIds: scope, group: 'lingerie_request' });
        expect(byGroup.body.total).toBe(1);
        // el filtro de tipo también reduce los totales por yate
        expect(byGroup.body.yachts).toHaveLength(1);

        const byYacht = await search({ warehouseIds: scope, warehouseId: Utils.encode(warehouseA.id) });
        expect(byYacht.body.total).toBe(2);
        expect(byYacht.body.summary.total).toBe(2);
        // los totales por tipo ignoran el filtro de yate
        expect(byYacht.body.types.all).toBe(3);

        const byName = await search({ warehouseIds: scope, q: `lingerie_${tag}` });
        expect(byName.body.total).toBe(1);

        const byStaff = await search({ warehouseIds: scope, q: staff.lastName });
        expect(byStaff.body.total).toBe(3);

        const wildcard = await search({ warehouseIds: scope, q: '%' });
        expect(wildcard.body.total).toBe(0);
    });

    it('no incluye otros años', async () => {
        const { scope } = await createScenario();

        const response = await search({ warehouseIds: scope, year: 2001 });

        expect(response.status).toBe(200);
        expect(response.body.total).toBe(0);
        expect(response.body.summary.total).toBe(0);
    });

    it.each([
        ['year', { year: 'abc' }],
        ['page', { page: 0 }],
        ['pageSize', { pageSize: 101 }],
        ['status', { status: 'Otro' }],
        ['warehouseIds', { warehouseIds: 'no-es-hashid' }],
    ])('devuelve 400 con %s inválido', async (_name, query) => {
        const response = await search(query);

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 400 si el yate pedido no está entre las bodegas visibles', async () => {
        const { warehouseA, warehouseB } = await createScenario();

        const response = await search({ warehouseIds: Utils.encode(warehouseA.id), warehouseId: Utils.encode(warehouseB.id) });

        expect(response.status).toBe(400);
    });

    it('devuelve 403 sin JWT', async () => {
        const response = await request(app).get('/api/requests/search');

        expect(response.status).toBe(403);
    });
});
