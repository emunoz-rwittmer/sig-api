const request = require('supertest');
const { bootTestApp, shutdownTestApp } = require('../../helpers/testApp');
const { createAuthenticatedUser } = require('../../helpers/auth');
const { createCompanyWithYacht } = require('../../helpers/staffFixtures');
const Company = require('../../../src/models/catalogs/company.models');
const Yacht = require('../../../src/models/catalogs/yacht.models');
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

describe('GET /api/yachts', () => {
    it('lists yachts with encoded id, companyId and nested company name', async () => {
        const { company, yacht } = await createCompanyWithYacht(`Company List ${Date.now()}`, `Yacht List ${Date.now()}`);

        const response = await request(app)
            .get('/api/yachts')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        const found = response.body.find((x) => x.id === Utils.encode(yacht.id));
        expect(found).toBeDefined();
        expect(found.companyId).toBe(Utils.encode(company.id));
        expect(found.company.name).toBe(company.name);
    });
});

describe('GET /api/yachts/:yacht_id', () => {
    it('returns a single yacht with encoded ids', async () => {
        const { company, yacht } = await createCompanyWithYacht(`Company Get ${Date.now()}`, `Yacht Get ${Date.now()}`);

        const response = await request(app)
            .get(`/api/yachts/${Utils.encode(yacht.id)}`)
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body.id).toBe(Utils.encode(yacht.id));
        expect(response.body.companyId).toBe(Utils.encode(company.id));
    });

    it('returns 404 when the yacht does not exist', async () => {
        const response = await request(app)
            .get(`/api/yachts/${Utils.encode(999999999)}`)
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(404);
        expect(response.body.error.message).toBe('Yate no encontrado');
    });
});

describe('POST /api/yachts/createYacht', () => {
    it('creates a yacht with decoded companyId', async () => {
        const company = await Company.create({
            name: `Company Create ${Date.now()}`,
            ruc: '1234567890001',
            logo: '/uploads/companies/test-logo.png',
            adress: 'Av. Test 123',
        });

        const response = await request(app)
            .post('/api/yachts/createYacht')
            .set('Authorization', `Bearer ${token}`)
            .send({
                companyId: Utils.encode(company.id),
                name: 'Nuevo Yate',
                email: `nuevo-yate-${Date.now()}@example.com`,
                code: 'YT-100',
                color: '#000000',
            });

        expect(response.status).toBe(200);
        const created = await Yacht.findOne({ where: { name: 'Nuevo Yate' } });
        expect(created).not.toBeNull();
        expect(created.companyId).toBe(company.id);
    });
});

describe('PUT /api/yachts/updateYacht/:yacht_id', () => {
    it('updates a yacht, including reassigning its companyId', async () => {
        const { yacht } = await createCompanyWithYacht(`Company Update ${Date.now()}`, `Yacht Update ${Date.now()}`);
        const newCompany = await Company.create({
            name: `Company Update Target ${Date.now()}`,
            ruc: '1234567890002',
            logo: '/uploads/companies/test-logo.png',
            adress: 'Av. Test 456',
        });

        const response = await request(app)
            .put(`/api/yachts/updateYacht/${Utils.encode(yacht.id)}`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                companyId: Utils.encode(newCompany.id),
                name: 'Yate Actualizado',
            });

        expect(response.status).toBe(200);
        await yacht.reload();
        expect(yacht.name).toBe('Yate Actualizado');
        expect(yacht.companyId).toBe(newCompany.id);
    });
});

describe('DELETE /api/yachts/:yacht_id', () => {
    it('deletes a yacht', async () => {
        const { yacht } = await createCompanyWithYacht(`Company Delete ${Date.now()}`, `Yacht Delete ${Date.now()}`);

        const response = await request(app)
            .delete(`/api/yachts/${Utils.encode(yacht.id)}`)
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        const found = await Yacht.findByPk(yacht.id);
        expect(found).toBeNull();
    });
});
