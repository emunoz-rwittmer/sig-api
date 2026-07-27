const request = require('supertest');
const { bootTestApp, shutdownTestApp } = require('../../helpers/testApp');
const { createAuthenticatedUser } = require('../../helpers/auth');
const Company = require('../../../src/models/catalogs/company.models');
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

async function createBasicCompany(overrides = {}) {
    return Company.create({
        name: `Company ${Date.now()}-${Math.random()}`,
        ruc: '1234567890001',
        logo: '/uploads/companies/test-logo.png',
        adress: 'Av. Test 123',
        ...overrides,
    });
}

describe('GET /api/companies', () => {
    it('lists companies with encoded id', async () => {
        const company = await createBasicCompany({ name: `Company List ${Date.now()}` });

        const response = await request(app)
            .get('/api/companies')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        const found = response.body.find((x) => x.id === Utils.encode(company.id));
        expect(found).toBeDefined();
        expect(found.name).toBe(company.name);
    });
});

describe('GET /api/companies/:company_id', () => {
    it('returns a single company with encoded id', async () => {
        const company = await createBasicCompany({ name: `Company Get ${Date.now()}` });

        const response = await request(app)
            .get(`/api/companies/${Utils.encode(company.id)}`)
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body.id).toBe(Utils.encode(company.id));
        expect(response.body.name).toBe(company.name);
    });

    it('returns 404 when the company does not exist', async () => {
        const response = await request(app)
            .get(`/api/companies/${Utils.encode(999999999)}`)
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(404);
        expect(response.body.error.message).toBe('Empresa no encontrada');
    });
});

describe('POST /api/companies/createCompany', () => {
    it('returns 400 when no logo file is uploaded', async () => {
        const response = await request(app)
            .post('/api/companies/createCompany')
            .set('Authorization', `Bearer ${token}`)
            .field('name', `Sin Logo ${Date.now()}`)
            .field('ruc', '1234567890099')
            .field('adress', 'Av. Sin Logo');

        expect(response.status).toBe(400);
        expect(response.body.error.message).toBe('No se ha subido ningún archivo');
    });
});

describe('PUT /api/companies/updateCompany/:company_id', () => {
    it('updates a company without changing the logo when no file is sent', async () => {
        const company = await createBasicCompany({ name: `Company Update ${Date.now()}` });

        const response = await request(app)
            .put(`/api/companies/updateCompany/${Utils.encode(company.id)}`)
            .set('Authorization', `Bearer ${token}`)
            .field('name', 'Company Actualizada');

        expect(response.status).toBe(200);
        await company.reload();
        expect(company.name).toBe('Company Actualizada');
        expect(company.logo).toBe('/uploads/companies/test-logo.png');
    });
});

describe('DELETE /api/companies/:company_id', () => {
    it('deletes a company', async () => {
        const company = await createBasicCompany({ name: `Company Delete ${Date.now()}` });

        const response = await request(app)
            .delete(`/api/companies/${Utils.encode(company.id)}`)
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        const found = await Company.findByPk(company.id);
        expect(found).toBeNull();
    });
});
