const request = require('supertest');
const { bootTestApp, shutdownTestApp } = require('../helpers/testApp');
const { createAuthenticatedUser } = require('../helpers/auth');

let app;
let token;

beforeAll(async () => {
    app = await bootTestApp();
    token = await createAuthenticatedUser(app);
});

afterAll(async () => {
    await shutdownTestApp();
});

describe('Indicators smoke test', () => {
    it('lists formulas for an authenticated user', async () => {
        const response = await request(app)
            .get('/api/indicators/formulas/indicators')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
    });
});
