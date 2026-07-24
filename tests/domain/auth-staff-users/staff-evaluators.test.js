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

async function createStaffWithPosition(position) {
    const departament = await createDepartment();
    return Staff.create({
        firstName: 'Evaluador',
        lastName: `Test${Date.now()}${Math.floor(Math.random() * 1e6)}`,
        email: `evaluador-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`,
        cellPhone: '0966666666',
        password: 'Sup3rSecret!',
        departamentId: departament.id,
        positionId: position.id,
        contractType: 'Fijo',
        active: true,
    });
}

describe('GET /api/staffs/send_form/evaluators', () => {
    // `search` is a comma-separated list of encoded POSITION ids to EXCLUDE
    // (StaffService.getEvaluators does `positionId: { [Op.ne]: decodedSearch }`),
    // not staff ids - verified empirically against the real service query.
    it('excludes staff whose position id is in search and includes the rest', async () => {
        const excludedPosition = await createPosition();
        const includedPosition = await createPosition();
        const excludedStaff = await createStaffWithPosition(excludedPosition);
        const includedStaff = await createStaffWithPosition(includedPosition);

        const response = await request(app)
            .get('/api/staffs/send_form/evaluators')
            .query({ search: Utils.encode(excludedPosition.id) })
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        const ids = response.body.map((x) => x.id);
        expect(ids).toContain(Utils.encode(includedStaff.id));
        expect(ids).not.toContain(Utils.encode(excludedStaff.id));
    });

    it('returns active staff when search is not provided (empty exclude list excludes nobody)', async () => {
        const position = await createPosition();
        const staff = await createStaffWithPosition(position);

        const response = await request(app)
            .get('/api/staffs/send_form/evaluators')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body.map((x) => x.id)).toContain(Utils.encode(staff.id));
    });
});

describe('GET /api/staffs/send_form/evaluatorsByFilters', () => {
    it('filters evaluators by companyId and positionId', async () => {
        const position = await createPosition();
        const { company } = await createCompanyWithYacht();
        const staff = await createStaffWithPosition(position);
        await StaffCompany.create({ staffId: staff.id, companyId: company.id });

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
    // `search` here is a list of encoded POSITION ids to INCLUDE
    // (StaffService.getEvaluateds does `positionId: { [Op.in]: decodedSearch }`).
    it('returns staff whose position id is in search', async () => {
        const targetPosition = await createPosition();
        const otherPosition = await createPosition();
        const targetStaff = await createStaffWithPosition(targetPosition);
        const otherStaff = await createStaffWithPosition(otherPosition);

        const response = await request(app)
            .get('/api/staffs/send_form/evaluateds')
            .query({ search: Utils.encode(targetPosition.id) })
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        const ids = response.body.map((x) => x.id);
        expect(ids).toContain(Utils.encode(targetStaff.id));
        expect(ids).not.toContain(Utils.encode(otherStaff.id));
    });
});

describe('GET /api/staffs/send_form/evaluatedsByFilters', () => {
    // The controller passes the decoded `search` array (position ids) as this
    // endpoint's positional `positionId` service argument - `search` must be
    // provided or the resulting `Op.in: []` matches nothing.
    it('filters evaluated staff by position ids in search and by companyId', async () => {
        const position = await createPosition();
        const { company } = await createCompanyWithYacht();
        const staff = await createStaffWithPosition(position);
        await StaffCompany.create({ staffId: staff.id, companyId: company.id });

        const response = await request(app)
            .get('/api/staffs/send_form/evaluatedsByFilters')
            .query({ search: Utils.encode(position.id), companyId: Utils.encode(company.id) })
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body.some((x) => x.id === Utils.encode(staff.id))).toBe(true);
    });
});
