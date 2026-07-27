const request = require('supertest');
const { bootTestApp, shutdownTestApp } = require('../../helpers/testApp');
const { createAuthenticatedUser } = require('../../helpers/auth');
const { createPosition } = require('../../helpers/staffFixtures');
const Positions = require('../../../src/models/catalogs/positions.models');
const Utils = require('../../../src/utils/Utils');

let app;
let token;

beforeAll(async () => {
    app = await bootTestApp();
    token = await createAuthenticatedUser(app);
});

afterAll(async () => {
    await shutdownTestApp();
});

describe('GET /api/positions', () => {
    it('lists positions with encoded id', async () => {
        const position = await createPosition(`Position List ${Date.now()}`);

        const response = await request(app)
            .get('/api/positions')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        const found = response.body.find((x) => x.id === Utils.encode(position.id));
        expect(found).toBeDefined();
        expect(found.name).toBe(position.name);
    });
});

describe('GET /api/positions/:position_id', () => {
    it('returns a single position with encoded id', async () => {
        const position = await createPosition(`Position Get ${Date.now()}`);

        const response = await request(app)
            .get(`/api/positions/${Utils.encode(position.id)}`)
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body.id).toBe(Utils.encode(position.id));
        expect(response.body.name).toBe(position.name);
    });

    it('returns 404 when the position does not exist', async () => {
        const response = await request(app)
            .get(`/api/positions/${Utils.encode(999999999)}`)
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(404);
        expect(response.body.error.message).toBe('Posición no encontrada');
    });
});

describe('POST /api/positions/createPosition', () => {
    it('creates a position', async () => {
        const name = `Nueva Posición ${Date.now()}`;
        const response = await request(app)
            .post('/api/positions/createPosition')
            .set('Authorization', `Bearer ${token}`)
            .send({ name });

        expect(response.status).toBe(200);
        const created = await Positions.findOne({ where: { name } });
        expect(created).not.toBeNull();
    });
});

describe('PUT /api/positions/updatePosition/:position_id', () => {
    it('updates a position', async () => {
        const position = await createPosition(`Position Update ${Date.now()}`);

        const response = await request(app)
            .put(`/api/positions/updatePosition/${Utils.encode(position.id)}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Posición Actualizada' });

        expect(response.status).toBe(200);
        await position.reload();
        expect(position.name).toBe('Posición Actualizada');
    });
});

describe('DELETE /api/positions/:position_id', () => {
    it('deletes a position', async () => {
        const position = await createPosition(`Position Delete ${Date.now()}`);

        const response = await request(app)
            .delete(`/api/positions/${Utils.encode(position.id)}`)
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ data: 'resource deleted successfully' });
        const found = await Positions.findByPk(position.id);
        expect(found).toBeNull();
    });
});
