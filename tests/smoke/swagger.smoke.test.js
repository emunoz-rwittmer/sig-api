const request = require('supertest');
const swaggerJsdoc = require('swagger-jsdoc');
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

    it('documents every Orders endpoint in the OpenAPI contract', () => {
        const spec = swaggerJsdoc({
            definition: { openapi: '3.0.0', info: { title: 'test', version: '1.0.0' } },
            apis: ['./src/routes/operations/orders/order.routes.js'],
        });

        expect(spec.paths).toMatchObject({
            '/orders': {
                get: expect.any(Object),
                post: expect.any(Object),
            },
            '/orders/{order_id}': {
                get: expect.any(Object),
                put: expect.any(Object),
            },
            '/orders/deleteItem/{item_id}': {
                delete: expect.any(Object),
            },
        });
    });
});
