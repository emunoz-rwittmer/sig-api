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

    it('documents every inventory endpoint in the OpenAPI contract', () => {
        const spec = swaggerJsdoc({
            definition: { openapi: '3.0.0', info: { title: 'test', version: '1.0.0' } },
            apis: [
                './src/routes/operations/inventory/products.routes.js',
                './src/routes/operations/inventory/registers.routes.js',
                './src/routes/operations/inventory/transactions.routes.js',
                './src/routes/operations/inventory/warehouse.routes.js',
            ],
        });

        expect(spec.paths).toMatchObject({
            '/products': { get: expect.any(Object) },
            '/products/allProductsWithConfigurations': { get: expect.any(Object) },
            '/products/findProduct/{sku}': { get: expect.any(Object) },
            '/products/{product_id}': { get: expect.any(Object), delete: expect.any(Object) },
            '/products/createProduct': { post: expect.any(Object) },
            '/products/updateProduct/{product_id}': { put: expect.any(Object) },
            '/products/{warehouse_id}/stocks': { get: expect.any(Object) },
            '/products/upadate/stock/{stock_id}': { put: expect.any(Object) },
            '/products/configurations/switchConfiguration/{configuration_id}': { put: expect.any(Object) },
            '/registers': { get: expect.any(Object) },
            '/transactions/productEntryInWarehouse/{warehouse_id}': { post: expect.any(Object) },
            '/transactions/transactionBetweenWarehouse': { post: expect.any(Object) },
            '/transactions/incomeProductsInWarehouse': { post: expect.any(Object) },
            '/transactions/updateStatusItem/{item_id}': { put: expect.any(Object) },
            '/transactions/incomeProductsRegister': { post: expect.any(Object) },
            '/transactions/printRegister': { put: expect.any(Object) },
            '/warehouse': { get: expect.any(Object), post: expect.any(Object) },
            '/warehouse/{warehouse_id}': { put: expect.any(Object), delete: expect.any(Object) },
            '/warehouse/{stock_id}/stockProduct': { get: expect.any(Object) },
        });
    });
});
