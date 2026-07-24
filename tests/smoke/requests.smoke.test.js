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

describe('Yacht request smoke test', () => {
    it('lists requests for an authenticated user', async () => {
        const response = await request(app)
            .get('/api/requests')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
    });
});
