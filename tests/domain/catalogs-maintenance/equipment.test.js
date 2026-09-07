const request = require('supertest');
const { bootTestApp, shutdownTestApp } = require('../../helpers/testApp');
const { createAuthenticatedUser } = require('../../helpers/auth');
const { createCompanyWithYacht } = require('../../helpers/staffFixtures');
const YachtEquipment = require('../../../src/models/catalogs/yachtEquipment.models');
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

describe('catalogs/maintenance - equipment', () => {
    it('requires authentication', async () => {
        const response = await request(app).get('/api/maintenance/equipment');
        expect(response.status).toBe(403);
    });

    it('creates equipment and returns encoded identifiers on the list', async () => {
        const { yacht } = await createCompanyWithYacht('Equipment Co', 'Equipment Yacht');

        const created = await auth(
            request(app).post('/api/maintenance/equipment').send({
                yachtId: Utils.encode(yacht.id),
                name: 'Motor Babor',
                brand: 'Caterpillar',
            })
        );
        expect(created.status).toBe(200);
        expect(created.body.data).toBe('resource created successfully');

        const stored = await YachtEquipment.findOne({ where: { name: 'Motor Babor' } });
        expect(stored.brand).toBe('Caterpillar');
        expect(stored.yachtId).toBe(yacht.id);

        const list = await auth(request(app).get('/api/maintenance/equipment'));
        const found = list.body.find((item) => item.name === 'Motor Babor');
        expect(found.id).toBe(Utils.encode(stored.id));
        expect(found.yachtId).toBe(Utils.encode(yacht.id));
    });

    it('rejects creation without yachtId or name', async () => {
        const response = await auth(
            request(app).post('/api/maintenance/equipment').send({ name: 'Sin yate' })
        );
        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('AppError');
    });

    it('lists equipment filtered by yachtId', async () => {
        const { yacht: yachtA } = await createCompanyWithYacht('List Co A', 'List Yacht A');
        const { yacht: yachtB } = await createCompanyWithYacht('List Co B', 'List Yacht B');
        await YachtEquipment.create({ yachtId: yachtA.id, name: 'Generador A' });
        await YachtEquipment.create({ yachtId: yachtB.id, name: 'Generador B' });

        const response = await auth(
            request(app).get(`/api/maintenance/equipment?yachtId=${Utils.encode(yachtA.id)}`)
        );

        expect(response.status).toBe(200);
        expect(response.body.every((item) => item.yachtId === Utils.encode(yachtA.id))).toBe(true);
        expect(response.body.some((item) => item.name === 'Generador A')).toBe(true);
        expect(response.body.some((item) => item.name === 'Generador B')).toBe(false);
    });

    it('updates equipment and reports 404 for a missing one', async () => {
        const { yacht } = await createCompanyWithYacht('Update Co', 'Update Yacht');
        const equipment = await YachtEquipment.create({ yachtId: yacht.id, name: 'Old Name' });

        const updated = await auth(
            request(app)
                .put(`/api/maintenance/equipment/${Utils.encode(equipment.id)}`)
                .send({ yachtId: Utils.encode(yacht.id), name: 'New Name' })
        );
        expect(updated.status).toBe(200);
        expect(updated.body.data).toBe('resource updated successfully');
        const stored = await YachtEquipment.findByPk(equipment.id);
        expect(stored.name).toBe('New Name');

        const missing = await auth(
            request(app)
                .put(`/api/maintenance/equipment/${Utils.encode(999999999)}`)
                .send({ yachtId: Utils.encode(yacht.id), name: 'Ghost' })
        );
        expect(missing.status).toBe(404);
    });
});
