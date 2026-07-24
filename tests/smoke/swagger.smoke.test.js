const request = require('supertest');
const { bootTestApp, shutdownTestApp } = require('../helpers/testApp');

let app;

beforeAll(async () => {
    app = await bootTestApp();
});

afterAll(async () => {
    await shutdownTestApp();
});

describe('Swagger docs smoke test', () => {
    it('serves Swagger UI at /api/docs', async () => {
        const response = await request(app).get('/api/docs/');
        expect(response.status).toBe(200);
        expect(response.text).toContain('swagger-ui');
    });
});
