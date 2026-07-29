const request = require('supertest');
const { bootTestApp, shutdownTestApp } = require('../../helpers/testApp');
const { createAuthenticatedUser } = require('../../helpers/auth');
const Trading = require('../../../src/models/rrhh/trading.models');
const Utils = require('../../../src/utils/Utils');

jest.mock('../../../src/middlewares/uploadMiddleware', () => {
    return (type) => (req, res, next) => {
        if (type === 'single' && req.headers['x-test-file'] === '1') {
            req.file = {
                filename: `mock-${Date.now()}-${Math.floor(Math.random() * 1e6)}.pdf`,
                originalname: 'mock.pdf',
                mimetype: 'application/pdf',
            };
        }
        next();
    };
});

let app;
let token;

beforeAll(async () => {
    app = await bootTestApp();
    token = await createAuthenticatedUser(app);
}, 60000);

afterAll(async () => {
    await shutdownTestApp();
});

async function createBasicTrading(overrides = {}) {
    return Trading.create({
        name: `Trading ${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
        type: 'pdf',
        url: '/uploads/pdfs/existing.pdf',
        ...overrides,
    });
}

describe('RRHH Trading', () => {
    describe('GET /api/tradings', () => {
        it('lists tradings for an authenticated user', async () => {
            const trading = await createBasicTrading();

            const response = await request(app)
                .get('/api/tradings')
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            const found = response.body.find((x) => x.id === Utils.encode(trading.id));
            expect(found).toBeDefined();
        });
    });

    describe('GET /api/tradings/:trading_id', () => {
        it('returns the trading', async () => {
            const trading = await createBasicTrading();

            const response = await request(app)
                .get(`/api/tradings/${Utils.encode(trading.id)}`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.id).toBe(Utils.encode(trading.id));
            expect(response.body.url).toBe(trading.url);
        });

        it('returns 404 when the trading does not exist', async () => {
            const response = await request(app)
                .get(`/api/tradings/${Utils.encode(999999999)}`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(404);
            expect(response.body.error.message).toBe('Trading no encontrado');
        });

        it('returns 400 for an invalid hashid', async () => {
            const response = await request(app)
                .get('/api/tradings/not-a-hashid')
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(400);
            expect(response.body.error.code).toBe('AppError');
        });
    });

    describe('POST /api/tradings', () => {
        it('creates a trading when a file is attached', async () => {
            const name = `Trading Nuevo ${Date.now()}`;

            const response = await request(app)
                .post('/api/tradings')
                .set('Authorization', `Bearer ${token}`)
                .set('x-test-file', '1')
                .send({ name, type: 'pdf' });

            expect(response.status).toBe(200);

            const created = await Trading.findOne({ where: { name } });
            expect(created).not.toBeNull();
            expect(created.url).toMatch(/^\/uploads\/pdfs\//);
        });

        it('returns 400 when no file is attached and no url is provided', async () => {
            const response = await request(app)
                .post('/api/tradings')
                .set('Authorization', `Bearer ${token}`)
                .send({ name: `Trading Sin Archivo ${Date.now()}`, type: 'pdf' });

            expect(response.status).toBe(400);
            expect(response.body.error.message).toBe('No se ha subido ningún archivo');
        });
    });

    describe('PUT /api/tradings/:trading_id', () => {
        it('updates a trading', async () => {
            const trading = await createBasicTrading();
            const newName = 'Trading Actualizado';

            const response = await request(app)
                .put(`/api/tradings/${Utils.encode(trading.id)}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ name: newName });

            expect(response.status).toBe(200);
            await trading.reload();
            expect(trading.name).toBe(newName);
        });
    });

    describe('DELETE /api/tradings/:trading_id', () => {
        it('deletes a trading', async () => {
            const trading = await createBasicTrading();

            const response = await request(app)
                .delete(`/api/tradings/${Utils.encode(trading.id)}`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(await Trading.findByPk(trading.id)).toBeNull();
        });
    });
});
