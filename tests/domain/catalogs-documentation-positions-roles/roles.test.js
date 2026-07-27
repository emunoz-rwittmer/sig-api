const request = require('supertest');
const { bootTestApp, shutdownTestApp } = require('../../helpers/testApp');
const { createAuthenticatedUser } = require('../../helpers/auth');
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

describe('GET /api/roles', () => {
    it('lists roles with encoded id', async () => {
        const response = await request(app)
            .get('/api/roles')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        const adminRole = response.body.find((x) => x.name === 'admin');
        expect(adminRole).toBeDefined();
        expect(adminRole.id).toBe(Utils.encode(Utils.decode(adminRole.id)));
    });
});
