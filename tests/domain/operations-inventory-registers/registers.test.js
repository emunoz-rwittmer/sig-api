const request = require('supertest');
const { bootTestApp, shutdownTestApp } = require('../../helpers/testApp');
const { createAuthenticatedUser } = require('../../helpers/auth');
const { createDepartment, createPosition, createCompanyWithYacht } = require('../../helpers/staffFixtures');
const Staff = require('../../../src/models/catalogs/staff.models');
const Register = require('../../../src/models/operations/inventory/register.models');
const Utils = require('../../../src/utils/Utils');
const RegisterService = require('../../../src/services/operations/inventory/registers.services');

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

async function createStaffFixture() {
    const dept = await createDepartment(`Dept-${suffix()}`);
    const pos = await createPosition(`Pos-${suffix()}`);
    const s = suffix();
    return Staff.create({
        firstName: 'TEST',
        lastName: `Register${s}`,
        email: `register-test-${s}@example.com`,
        cellPhone: '0966666666',
        password: 'Sup3rSecret!',
        departamentId: dept.id,
        positionId: pos.id,
        contractType: 'Fijo',
        active: true,
    });
}

async function createRegisterFixture(overrides = {}) {
    const { company } = await createCompanyWithYacht(`RegisterCo-${suffix()}`);
    const staff = await createStaffFixture();
    return Register.create({
        counter: `CNT-${suffix()}`,
        products: 1,
        companyId: company.id,
        userId: staff.id,
        ...overrides,
    });
}

// =========================================================================
// GET /api/registers
// =========================================================================

describe('GET /api/registers — lista de registros', () => {
    it('devuelve 200 con la lista de registros y los ids codificados como hashid', async () => {
        const register = await createRegisterFixture();

        const response = await auth(request(app).get('/api/registers'));

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);

        const found = response.body.find((r) => r.id === Utils.encode(register.id));
        expect(found).toBeDefined();
        expect(found.companyId).toBe(Utils.encode(register.companyId));
        expect(found.userId).toBe(Utils.encode(register.userId));
    });

    it('devuelve 403 sin JWT', async () => {
        const response = await request(app).get('/api/registers');

        expect(response.status).toBe(403);
    });

    it('delega fallas inesperadas al handler global de 500', async () => {
        const failure = jest
            .spyOn(RegisterService, 'getAllRegisters')
            .mockRejectedValueOnce(new Error('database unavailable'));

        const response = await auth(request(app).get('/api/registers'));

        expect(response.status).toBe(500);
        expect(response.body).toEqual({
            error: {
                message: 'database unavailable',
                code: 'INTERNAL_ERROR',
            },
        });
        failure.mockRestore();
    });
});
