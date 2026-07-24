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

async function createBasicStaff(overrides = {}) {
    const departament = await createDepartment();
    const position = await createPosition();
    return Staff.create({
        firstName: 'Ana',
        lastName: 'Gomez',
        email: `staff-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`,
        cellPhone: '0999999999',
        password: 'Sup3rSecret!',
        departamentId: departament.id,
        positionId: position.id,
        contractType: 'Fijo',
        active: true,
        ...overrides,
    });
}

describe('GET /api/staffs', () => {
    it('lists staff with encoded ids and department/position names', async () => {
        const staff = await createBasicStaff({ firstName: 'Beatriz' });

        const response = await request(app)
            .get('/api/staffs')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        const found = response.body.find((x) => x.id === Utils.encode(staff.id));
        expect(found).toBeDefined();
        expect(found.firstName).toBe('Beatriz');
        expect(found.companies).toEqual([]);
    });
});

describe('GET /api/staffs/:staff_id', () => {
    it('returns a single staff member with encoded id', async () => {
        const staff = await createBasicStaff({ firstName: 'Carlos' });

        const response = await request(app)
            .get(`/api/staffs/${Utils.encode(staff.id)}`)
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body.id).toBe(Utils.encode(staff.id));
        expect(response.body.firstName).toBe('Carlos');
    });
});

describe('GET /api/staffs/:staff_id/companies', () => {
    it('returns companies with yacht data for the staff member', async () => {
        const staff = await createBasicStaff();
        const { company, yacht } = await createCompanyWithYacht();
        await StaffCompany.create({ staffId: staff.id, companyId: company.id });

        const response = await request(app)
            .get(`/api/staffs/${Utils.encode(staff.id)}/companies`)
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(1);
        expect(response.body[0].company.yacht.id).toBe(Utils.encode(yacht.id));
    });
});

describe('POST /api/staffs/createStaff', () => {
    it('creates a staff member with decoded FK ids', async () => {
        const departament = await createDepartment();
        const position = await createPosition();

        const response = await request(app)
            .post('/api/staffs/createStaff')
            .set('Authorization', `Bearer ${token}`)
            .send({
                firstName: 'Diego',
                lastName: 'Perez',
                email: 'diego@example.com',
                cellPhone: '0988888888',
                contractType: 'Fijo',
                departamentId: Utils.encode(departament.id),
                positionId: Utils.encode(position.id),
            });

        expect(response.status).toBe(200);
        const created = await Staff.findOne({ where: { email: 'diego@example.com' } });
        expect(created).not.toBeNull();
        expect(created.departamentId).toBe(departament.id);
    });
});

describe('PUT /api/staffs/updateStaff/:staff_id', () => {
    it('updates a staff member', async () => {
        const staff = await createBasicStaff();
        const departament = await createDepartment('Nuevo Departamento');
        const position = await createPosition('Nueva Posicion');

        const response = await request(app)
            .put(`/api/staffs/updateStaff/${Utils.encode(staff.id)}`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                firstName: 'Ana Actualizada',
                departamentId: Utils.encode(departament.id),
                positionId: Utils.encode(position.id),
            });

        expect(response.status).toBe(200);
        await staff.reload();
        expect(staff.firstName).toBe('Ana Actualizada');
        expect(staff.departamentId).toBe(departament.id);
    });
});

describe('DELETE /api/staffs/:staff_id', () => {
    it('deletes a staff member', async () => {
        const staff = await createBasicStaff();

        const response = await request(app)
            .delete(`/api/staffs/${Utils.encode(staff.id)}`)
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        const found = await Staff.findByPk(staff.id);
        expect(found).toBeNull();
    });
});

describe('PUT /api/staffs/:staff_id/uploadImageFile', () => {
    it('returns 400 when no file is uploaded', async () => {
        const staff = await createBasicStaff();

        const response = await request(app)
            .put(`/api/staffs/${Utils.encode(staff.id)}/uploadImageFile`)
            .set('Authorization', `Bearer ${token}`)
            .field('type', 'photo');

        expect(response.status).toBe(400);
        expect(response.body.error.message).toBe('No se ha subido ningún archivo');
    });
});

describe('PUT /api/staffs/update/documentation/:staff_id', () => {
    it('returns 400 when no file is uploaded', async () => {
        const staff = await createBasicStaff();

        const response = await request(app)
            .put(`/api/staffs/update/documentation/${Utils.encode(staff.id)}`)
            .set('Authorization', `Bearer ${token}`)
            .field('id', '1');

        expect(response.status).toBe(400);
        expect(response.body.error.message).toBe('No se ha subido ningún archivo');
    });
});
