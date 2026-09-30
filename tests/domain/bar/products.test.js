const request = require('supertest');
const { bootTestApp, shutdownTestApp } = require('../../helpers/testApp');
const { createAuthenticatedUser } = require('../../helpers/auth');
const ProductBar = require('../../../src/models/bar/productBar.models');
const Recipe = require('../../../src/models/bar/recipe.models');
const RecipeDetail = require('../../../src/models/bar/recipeDetail.models');
const Product = require('../../../src/models/operations/inventory/product.models');
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

async function createInventoryProduct() {
    const s = suffix();
    return Product.create({
        name: `Inventario-${s}`,
        sku: `SKU-${s}`,
        type: 'DISCRETE',
        unit: 'unidad',
        active: true,
    });
}

async function createBarProductFixture(overrides = {}) {
    return ProductBar.create({
        name: `Producto-${suffix()}`,
        category: 'Licores',
        price: 12.5,
        type: 'DIRECT',
        active: true,
        ...overrides,
    });
}

// =========================================================================
// GET /api/bar/products
// =========================================================================

describe('GET /api/bar/products — lista de productos del bar', () => {
    it('devuelve 200 con ids codificados y productId nulo cuando no hay relación', async () => {
        const product = await createBarProductFixture();

        const response = await auth(request(app).get('/api/bar/products'));

        expect(response.status).toBe(200);
        const found = response.body.find((item) => item.id === Utils.encode(product.id));
        expect(found).toBeDefined();
        expect(found.productId).toBeNull();
    });

    it('devuelve 403 sin JWT', async () => {
        const response = await request(app).get('/api/bar/products');

        expect(response.status).toBe(403);
    });
});

// =========================================================================
// GET /api/bar/products/:product_id
// =========================================================================

describe('GET /api/bar/products/:product_id', () => {
    it('devuelve 200 con el id codificado', async () => {
        const product = await createBarProductFixture();

        const response = await auth(
            request(app).get(`/api/bar/products/${Utils.encode(product.id)}`)
        );

        expect(response.status).toBe(200);
        expect(response.body.id).toBe(Utils.encode(product.id));
    });

    it('devuelve 400 con hashid inválido', async () => {
        const response = await auth(request(app).get('/api/bar/products/not-a-hashid'));

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 404 cuando el producto no existe', async () => {
        const response = await auth(
            request(app).get(`/api/bar/products/${Utils.encode(999999)}`)
        );

        expect(response.status).toBe(404);
    });
});

// =========================================================================
// POST /api/bar/products/createProduct
// =========================================================================

describe('POST /api/bar/products/createProduct', () => {
    it('crea un producto directo con producto de inventario relacionado', async () => {
        const inventoryProduct = await createInventoryProduct();
        const name = `Whisky-${suffix()}`;

        const response = await auth(
            request(app).post('/api/bar/products/createProduct').send({
                name,
                category: 'Licores',
                price: 15,
                active: true,
                productId: Utils.encode(inventoryProduct.id),
                recipe: [],
            })
        );

        expect(response.status).toBe(200);
        expect(response.body.data).toBe('resource created successfully');
        const created = await ProductBar.findOne({ where: { name } });
        expect(created.type).toBe('DIRECT');
        expect(created.productId).toBe(inventoryProduct.id);
    });

    it('crea un cóctel con su receta', async () => {
        const inventoryProduct = await createInventoryProduct();
        const name = `Mojito-${suffix()}`;

        const response = await auth(
            request(app).post('/api/bar/products/createProduct').send({
                name,
                category: 'Cócteles',
                price: 9,
                active: true,
                recipe: [{ productId: Utils.encode(inventoryProduct.id), quantity: '2' }],
            })
        );

        expect(response.status).toBe(200);
        const created = await ProductBar.findOne({ where: { name } });
        expect(created.type).toBe('RECIPE');
        const recipe = await Recipe.findOne({ where: { productBarId: created.id } });
        const details = await RecipeDetail.findAll({ where: { recipeId: recipe.id } });
        expect(details).toHaveLength(1);
        expect(details[0].productId).toBe(inventoryProduct.id);
    });

    it('devuelve 400 cuando un ingrediente de la receta trae un hashid inválido', async () => {
        const response = await auth(
            request(app).post('/api/bar/products/createProduct').send({
                name: `Roto-${suffix()}`,
                category: 'Cócteles',
                price: 9,
                recipe: [{ productId: 'not-a-hashid', quantity: 1 }],
            })
        );

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('AppError');
    });

    it('tolera un payload sin receta para productos directos', async () => {
        const response = await auth(
            request(app).post('/api/bar/products/createProduct').send({
                name: `SinReceta-${suffix()}`,
                category: 'Bebidas Soft',
                price: 2,
                active: true,
            })
        );

        expect(response.status).toBe(200);
    });
});

// =========================================================================
// PUT /api/bar/products/updateProduct/:product_id
// =========================================================================

describe('PUT /api/bar/products/updateProduct/:product_id', () => {
    it('actualiza el precio de un producto directo', async () => {
        const product = await createBarProductFixture();

        const response = await auth(
            request(app)
                .put(`/api/bar/products/updateProduct/${Utils.encode(product.id)}`)
                .send({ name: product.name, category: 'Licores', price: 20, recipe: [] })
        );

        expect(response.status).toBe(200);
        await product.reload();
        expect(Number(product.price)).toBe(20);
    });

    it('convierte un producto directo en cóctel y crea su receta', async () => {
        const product = await createBarProductFixture();
        const inventoryProduct = await createInventoryProduct();

        const response = await auth(
            request(app)
                .put(`/api/bar/products/updateProduct/${Utils.encode(product.id)}`)
                .send({
                    name: product.name,
                    category: 'Cócteles',
                    price: 11,
                    recipe: [{ productId: Utils.encode(inventoryProduct.id), quantity: 3 }],
                })
        );

        expect(response.status).toBe(200);
        await product.reload();
        expect(product.type).toBe('RECIPE');
        const recipe = await Recipe.findOne({ where: { productBarId: product.id } });
        expect(await RecipeDetail.count({ where: { recipeId: recipe.id } })).toBe(1);
    });

    it('devuelve 404 cuando el producto no existe', async () => {
        const response = await auth(
            request(app)
                .put(`/api/bar/products/updateProduct/${Utils.encode(999999)}`)
                .send({ name: 'X', category: 'Licores', price: 1, recipe: [] })
        );

        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe('AppError');
    });
});

// =========================================================================
// DELETE /api/bar/products/:product_id
// =========================================================================

describe('DELETE /api/bar/products/:product_id', () => {
    it('elimina el producto', async () => {
        const product = await createBarProductFixture();

        const response = await auth(
            request(app).delete(`/api/bar/products/${Utils.encode(product.id)}`)
        );

        expect(response.status).toBe(200);
        expect(response.body.data).toBe('resource deleted successfully');
        expect(await ProductBar.findByPk(product.id)).toBeNull();
    });

    it('devuelve 404 cuando el producto no existe', async () => {
        const response = await auth(
            request(app).delete(`/api/bar/products/${Utils.encode(999999)}`)
        );

        expect(response.status).toBe(404);
    });
});
