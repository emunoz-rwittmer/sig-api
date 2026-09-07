const request = require('supertest');
const { bootTestApp, shutdownTestApp } = require('../../helpers/testApp');
const { createAuthenticatedUser } = require('../../helpers/auth');
const MaintenanceRule = require('../../../src/models/catalogs/maintenanceRule.models');
const Product = require('../../../src/models/operations/inventory/product.models');
const Utils = require('../../../src/utils/Utils');

let app;
let token;

const auth = (httpRequest) => httpRequest.set('Authorization', `Bearer ${token}`);

beforeAll(async () => {
    app = await bootTestApp();
    token = await createAuthenticatedUser(app);
});

afterAll(async () => {
    await shutdownTestApp();
});

describe('catalogs/maintenance - rules', () => {
    it('creates a rule with recommended materials and lists it with those materials', async () => {
        const product = await Product.create({ name: 'Aceite 15W40', type: 'CONSUMABLE' });

        const created = await auth(
            request(app).post('/api/maintenance/rules').send({
                name: 'Cambio de aceite',
                periodicityValue: 250,
                periodicityUnit: 'horas',
                instructions: 'Usar aceite 15W40',
                recommendedMaterials: [{ productId: Utils.encode(product.id), recommendedQuantity: 20 }],
            })
        );
        expect(created.status).toBe(200);
        expect(created.body.data).toBe('resource created successfully');

        const stored = await MaintenanceRule.findOne({ where: { name: 'Cambio de aceite' } });
        expect(stored.periodicityValue).toBe(250);

        const list = await auth(request(app).get('/api/maintenance/rules'));
        const found = list.body.find((item) => item.name === 'Cambio de aceite');
        expect(found.periodicityUnit).toBe('horas');
        expect(found.recommendedMaterials).toHaveLength(1);
        expect(found.recommendedMaterials[0].product.name).toBe('Aceite 15W40');
        expect(found.recommendedMaterials[0].product.id).toBe(Utils.encode(product.id));
    });

    it('rejects an invalid periodicityUnit', async () => {
        const response = await auth(
            request(app).post('/api/maintenance/rules').send({
                name: 'Regla inválida',
                periodicityUnit: 'semanas',
            })
        );
        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('AppError');
    });

    it('updates a rule, replacing its recommended materials, and 404s on a missing one', async () => {
        const productA = await Product.create({ name: 'Filtro A', type: 'DISCRETE' });
        const productB = await Product.create({ name: 'Filtro B', type: 'DISCRETE' });
        const rule = await MaintenanceRule.create({ name: 'Cambio de filtro' });

        const updated = await auth(
            request(app).put(`/api/maintenance/rules/${Utils.encode(rule.id)}`).send({
                name: 'Cambio de filtro actualizado',
                recommendedMaterials: [{ productId: Utils.encode(productB.id), recommendedQuantity: 1 }],
            })
        );
        expect(updated.status).toBe(200);
        expect(updated.body.data).toBe('resource updated successfully');

        const list = await auth(request(app).get('/api/maintenance/rules'));
        const found = list.body.find((item) => item.id === Utils.encode(rule.id));
        expect(found.name).toBe('Cambio de filtro actualizado');
        expect(found.recommendedMaterials).toHaveLength(1);
        expect(found.recommendedMaterials[0].product.name).toBe('Filtro B');

        const missing = await auth(
            request(app).put(`/api/maintenance/rules/${Utils.encode(999999999)}`).send({ name: 'Ghost' })
        );
        expect(missing.status).toBe(404);
    });
});
