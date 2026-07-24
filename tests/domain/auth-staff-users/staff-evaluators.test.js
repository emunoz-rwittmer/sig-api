const request = require('supertest');
const { bootTestApp, shutdownTestApp } = require('../../helpers/testApp');
const { createAuthenticatedUser } = require('../../helpers/auth');
const { createDepartment, createPosition, createCompanyWithYacht } = require('../../helpers/staffFixtures');
const Staff = require('../../../src/models/catalogs/staff.models');
const StaffCompany = require('../../../src/models/catalogs/staffCompany.models');
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

async function createEvaluatorStaff() {
    const departament = await createDepartment();
    const position = await createPosition();
    const { company } = await createCompanyWithYacht();
    const staff = await Staff.create({
        firstName: 'Evaluador',
        lastName: 'Uno',
        email: `evaluador-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`,
        cellPhone: '0966666666',
        password: 'Sup3rSecret!',
        departamentId: departament.id,
        positionId: position.id,
        contractType: 'Fijo',
        active: true,
    });
    await StaffCompany.create({ staffId: staff.id, companyId: company.id });
    return { staff, departament, position, company };
}

describe('GET /api/staffs/send_form/evaluators', () => {
    it('returns evaluators matching the encoded ids in search', async () => {
        const { staff } = await createEvaluatorStaff();

        const response = await request(app)
            .get('/api/staffs/send_form/evaluators')
            .query({ search: Utils.encode(staff.id) })
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(1);
        expect(response.body[0].id).toBe(Utils.encode(staff.id));
    });

    it('returns an empty array when search is not provided', async () => {
        const response = await request(app)
            .get('/api/staffs/send_form/evaluators')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body).toEqual([]);
    });
});

describe('GET /api/staffs/send_form/evaluatorsByFilters', () => {
    it('filters evaluators by companyId and positionId', async () => {
        const { staff, position, company } = await createEvaluatorStaff();

        const response = await request(app)
            .get('/api/staffs/send_form/evaluatorsByFilters')
            .query({
                companyId: Utils.encode(company.id),
                positionId: Utils.encode(position.id),
            })
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body.some((x) => x.id === Utils.encode(staff.id))).toBe(true);
    });
});

describe('GET /api/staffs/send_form/evaluateds', () => {
    it('returns evaluated staff matching the encoded ids in search', async () => {
        const { staff } = await createEvaluatorStaff();

        const response = await request(app)
            .get('/api/staffs/send_form/evaluateds')
            .query({ search: Utils.encode(staff.id) })
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(1);
    });
});

describe('GET /api/staffs/send_form/evaluatedsByFilters', () => {
    it('filters evaluated staff by companyId', async () => {
        const { staff, company } = await createEvaluatorStaff();

        const response = await request(app)
            .get('/api/staffs/send_form/evaluatedsByFilters')
            .query({ companyId: Utils.encode(company.id) })
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body.some((x) => x.id === Utils.encode(staff.id))).toBe(true);
    });
});
