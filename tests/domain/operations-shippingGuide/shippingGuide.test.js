jest.mock('../../../src/mails/mailer', () => ({
    sendEmailGuiaRemisionCreada: jest.fn(),
}));

const request = require('supertest');
const { bootTestApp, shutdownTestApp } = require('../../helpers/testApp');
const { createAuthenticatedUser } = require('../../helpers/auth');
const ShippingGuide = require('../../../src/models/operations/shippingGuide/shippingGuide.models');
const ShippingGuideItems = require('../../../src/models/operations/shippingGuide/shippingGuideItems.models');
const Utils = require('../../../src/utils/Utils');
const ShippingGuideService = require('../../../src/services/operations/shippingGuide/shippingGuide.services');
const fs = require('fs');
const path = require('path');

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

async function createShippingGuideFixture(overrides = {}) {
    const s = suffix();
    return ShippingGuide.create({
        counter: `000-${s}`,
        dateStartTraslate: new Date('2026-01-01'),
        dateEndTraslate: new Date('2026-01-05'),
        from: 'Santa Cruz',
        to: 'Quito',
        addressee: 'Cliente Test',
        addresseeRuc: '0999999999',
        carrier: 'Transportista Test',
        carrierRuc: '0988888888',
        carrierLicence: 'ABC-1234',
        file: `/uploads/pdfs/guides/guia_remision_test-${s}.pdf`,
        ...overrides,
    });
}

async function createShippingGuideItemFixture(guideId, overrides = {}) {
    return ShippingGuideItems.create({
        guideId,
        quantity: '10',
        detail: 'Item de prueba',
        ...overrides,
    });
}

// =========================================================================
// GET /api/shipping_guides
// =========================================================================

describe('GET /api/shipping_guides — listar guías de remisión', () => {
    it('devuelve 200 con la lista de guías', async () => {
        await createShippingGuideFixture();

        const response = await auth(request(app).get('/api/shipping_guides'));

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
    });

    it('devuelve 403 sin JWT', async () => {
        const response = await request(app).get('/api/shipping_guides');

        expect(response.status).toBe(403);
    });

    it('delega fallas inesperadas al handler global de 500', async () => {
        const failure = jest
            .spyOn(ShippingGuideService, 'getShippingGuides')
            .mockRejectedValueOnce(new Error('database unavailable'));

        const response = await auth(request(app).get('/api/shipping_guides'));

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
// GET /api/shipping_guides/:guide_id
// =========================================================================

describe('GET /api/shipping_guides/:guide_id', () => {
    it('devuelve 200 con la guía y sus items', async () => {
        const guide = await createShippingGuideFixture();
        await createShippingGuideItemFixture(guide.id, { detail: 'Caja de vino' });

        const response = await auth(
            request(app).get(`/api/shipping_guides/${Utils.encode(guide.id)}`)
        );

        expect(response.status).toBe(200);
        expect(response.body.counter).toBe(guide.counter);
        expect(response.body.details.length).toBe(1);
    });

    it('devuelve 400 con hashid inválido', async () => {
        const response = await auth(request(app).get('/api/shipping_guides/not-a-hashid'));

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 404 cuando la guía no existe', async () => {
        const response = await auth(
            request(app).get(`/api/shipping_guides/${Utils.encode(999999)}`)
        );

        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 403 sin JWT', async () => {
        const response = await request(app).get('/api/shipping_guides/any-id');

        expect(response.status).toBe(403);
    });
});

// =========================================================================
// POST /api/shipping_guides
// =========================================================================

describe('POST /api/shipping_guides — crear guía de remisión', () => {
    const validPayload = () => ({
        dateStartTraslate: '2026-02-01',
        dateEndTraslate: '2026-02-05',
        from: 'Santa Cruz',
        to: 'Quito',
        sale: true,
        buy: false,
        other: false,
        addressee: 'Cliente Test',
        addresseeRuc: '0999999999',
        carrier: 'Transportista Test',
        carrierRuc: '0988888888',
        carrierLicence: 'ABC-1234',
        details: [{ quantity: 5, detail: 'Caja de vino' }],
    });

    it('devuelve 200 al crear una guía', async () => {
        const response = await auth(
            request(app).post('/api/shipping_guides').send(validPayload())
        );

        expect(response.status).toBe(200);
        expect(response.body.data).toBe('resource created successfully');

        const created = await ShippingGuide.findOne({ where: {}, order: [['id', 'DESC']] });
        expect(created).not.toBeNull();
        expect(fs.existsSync(path.join(__dirname, '../../..', created.file))).toBe(true);
    });

    it('devuelve 400 cuando falta dateStartTraslate', async () => {
        const payload = validPayload();
        delete payload.dateStartTraslate;

        const response = await auth(request(app).post('/api/shipping_guides').send(payload));

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 400 cuando falta dateEndTraslate', async () => {
        const payload = validPayload();
        delete payload.dateEndTraslate;

        const response = await auth(request(app).post('/api/shipping_guides').send(payload));

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 400 cuando details está vacío', async () => {
        const payload = validPayload();
        payload.details = [];

        const response = await auth(request(app).post('/api/shipping_guides').send(payload));

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 403 sin JWT', async () => {
        const response = await request(app).post('/api/shipping_guides').send({});

        expect(response.status).toBe(403);
    });
});

// =========================================================================
// PUT /api/shipping_guides/:guide_id
// =========================================================================

describe('PUT /api/shipping_guides/:guide_id — actualizar guía', () => {
    it('devuelve 200 y actualiza un item existente', async () => {
        const guide = await createShippingGuideFixture();
        const item = await createShippingGuideItemFixture(guide.id, { quantity: '10', detail: 'Original' });

        const response = await auth(
            request(app)
                .put(`/api/shipping_guides/${Utils.encode(guide.id)}`)
                .send({
                    id: [Utils.encode(item.id)],
                    product: ['Producto actualizado'],
                    quantity: ['20'],
                    originalQuantity: ['10'],
                })
        );

        expect(response.status).toBe(200);

        const refreshed = await ShippingGuideItems.findByPk(item.id);
        expect(refreshed.quantity).toBe('20');
    });

    it('devuelve 200 y crea un item nuevo asociado a la guía correcta', async () => {
        const guide = await createShippingGuideFixture();

        const response = await auth(
            request(app)
                .put(`/api/shipping_guides/${Utils.encode(guide.id)}`)
                .send({
                    id: [''],
                    product: ['Producto nuevo'],
                    quantity: ['5'],
                    originalQuantity: ['5'],
                })
        );

        expect(response.status).toBe(200);

        const items = await ShippingGuideItems.findAll({ where: { guideId: guide.id } });
        expect(items.length).toBe(1);
        expect(items[0].quantity).toBe('5');
    });

    it('devuelve 400 con hashid inválido', async () => {
        const response = await auth(
            request(app).put('/api/shipping_guides/not-a-hashid').send({ id: [] })
        );

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 404 cuando la guía no existe', async () => {
        const response = await auth(
            request(app)
                .put(`/api/shipping_guides/${Utils.encode(999999)}`)
                .send({ id: [] })
        );

        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 400 cuando id no es un arreglo', async () => {
        const guide = await createShippingGuideFixture();

        const response = await auth(
            request(app)
                .put(`/api/shipping_guides/${Utils.encode(guide.id)}`)
                .send({ id: 'no-es-arreglo' })
        );

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 403 sin JWT', async () => {
        const response = await request(app).put('/api/shipping_guides/any-id').send({});

        expect(response.status).toBe(403);
    });
});
