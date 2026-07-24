const request = require('supertest');
const { bootTestApp, shutdownTestApp } = require('../../helpers/testApp');
const { createTestUser, TEST_USER } = require('../../helpers/auth');
const Roles = require('../../../src/models/catalogs/roles.models');
const Staff = require('../../../src/models/catalogs/staff.models');
const Departaments = require('../../../src/models/catalogs/departament.models');
const Positions = require('../../../src/models/catalogs/positions.models');

jest.mock('../../../src/mails/mailer', () => ({
    sendEmail: jest.fn(),
    sendEmailPasswordStaff: jest.fn(),
}));

let app;

beforeAll(async () => {
    app = await bootTestApp();
});

afterAll(async () => {
    await shutdownTestApp();
});

describe('POST /api/auth/login', () => {
    beforeAll(async () => {
        await createTestUser();
    });

    it('returns 400 when email is missing', async () => {
        const response = await request(app).post('/api/auth/login').send({ password: 'x' });
        expect(response.status).toBe(400);
        expect(response.body.error.message).toBe('Not email provided');
    });

    it('returns 401 for invalid credentials', async () => {
        const response = await request(app)
            .post('/api/auth/login')
            .send({ email: TEST_USER.email, password: 'wrong-password' });
        expect(response.status).toBe(401);
        expect(response.body.error).toEqual({
            message: 'Usuario o contraseña incorrectas',
            code: 'AppError',
        });
    });

    it('returns 403 when the user is disabled', async () => {
        const role = await Roles.create({ name: 'disabled-role' });
        const Users = require('../../../src/models/catalogs/user.models');
        await Users.create({
            firstName: 'Disabled',
            lastName: 'User',
            email: 'disabled@example.com',
            password: 'Sup3rSecret!',
            roleId: role.id,
            active: false,
        });

        const response = await request(app)
            .post('/api/auth/login')
            .send({ email: 'disabled@example.com', password: 'Sup3rSecret!' });

        expect(response.status).toBe(403);
        expect(response.body.error.message).toBe('Usuario deshabilitado');
    });
});

describe('PUT /api/auth/upgradePassword/:user_id', () => {
    it('updates the password and it can be used to log in', async () => {
        const Users = require('../../../src/models/catalogs/user.models');
        const Utils = require('../../../src/utils/Utils');
        const user = await Users.findOne({ where: { email: TEST_USER.email } });

        const response = await request(app)
            .put(`/api/auth/upgradePassword/${Utils.encode(user.id)}`)
            .send({ password: 'NewPassword1!' });

        expect(response.status).toBe(200);

        const loginResponse = await request(app)
            .post('/api/auth/login')
            .send({ email: TEST_USER.email, password: 'NewPassword1!' });
        expect(loginResponse.status).toBe(200);
    });
});

describe('PUT /api/auth/forgotPassword', () => {
    it('returns 404 when the email does not exist', async () => {
        const response = await request(app)
            .put('/api/auth/forgotPassword')
            .send({ email: 'nobody@example.com' });

        expect(response.status).toBe(404);
        expect(response.body.error.message).toBe('Usuario no encontrado');
    });

    it('resets the password for an existing email and responds 200', async () => {
        const response = await request(app)
            .put('/api/auth/forgotPassword')
            .send({ email: TEST_USER.email });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ data: 'password updated successfully' });
    });
});

describe('POST /api/auth/login_staffs', () => {
    let staff;

    beforeAll(async () => {
        const departament = await Departaments.create({ name: 'Operaciones' });
        const position = await Positions.create({ name: 'Analista' });
        staff = await Staff.create({
            firstName: 'Staff',
            lastName: 'Test',
            email: 'staff-login@example.com',
            cellPhone: '0999999999',
            password: 'Sup3rSecret!',
            departamentId: departament.id,
            positionId: position.id,
            contractType: 'Fijo',
            active: true,
        });
    });

    it('logs in a staff member and returns companiIds/isTiptop', async () => {
        const response = await request(app)
            .post('/api/auth/login_staffs')
            .send({ email: 'staff-login@example.com', password: 'Sup3rSecret!' });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('token');
        expect(response.body.companiIds).toEqual([]);
        expect(response.body.isTiptop).toBe(false);
    });

    it('returns 401 for invalid credentials', async () => {
        const response = await request(app)
            .post('/api/auth/login_staffs')
            .send({ email: 'staff-login@example.com', password: 'wrong' });
        expect(response.status).toBe(401);
    });

    it('returns 403 when the staff member is disabled', async () => {
        await staff.update({ active: false });
        const response = await request(app)
            .post('/api/auth/login_staffs')
            .send({ email: 'staff-login@example.com', password: 'Sup3rSecret!' });
        expect(response.status).toBe(403);
    });
});

describe('PUT /api/auth/forgot_password_staffs', () => {
    it('returns 404 when the staff email does not exist', async () => {
        const response = await request(app)
            .put('/api/auth/forgot_password_staffs')
            .send({ email: 'nobody-staff@example.com' });

        expect(response.status).toBe(404);
        expect(response.body.error.message).toBe('Usuario no encontrado');
    });

    it('resets the password for an existing staff email and responds 200', async () => {
        const departament = await Departaments.create({ name: 'RRHH' });
        const position = await Positions.create({ name: 'Coordinador' });
        await Staff.create({
            firstName: 'Staff',
            lastName: 'Forgot',
            email: 'staff-forgot@example.com',
            cellPhone: '0988888888',
            password: 'Sup3rSecret!',
            departamentId: departament.id,
            positionId: position.id,
            contractType: 'Fijo',
        });

        const response = await request(app)
            .put('/api/auth/forgot_password_staffs')
            .send({ email: 'staff-forgot@example.com' });

        expect(response.status).toBe(200);
    });
});

describe('PUT /api/auth/upgrade_password_staffs/:staff_id', () => {
    it('updates the staff password and it can be used to log in', async () => {
        const Utils = require('../../../src/utils/Utils');
        const departament = await Departaments.create({ name: 'Bar' });
        const position = await Positions.create({ name: 'Barman' });
        const staff = await Staff.create({
            firstName: 'Staff',
            lastName: 'Upgrade',
            email: 'staff-upgrade@example.com',
            cellPhone: '0977777777',
            password: 'Sup3rSecret!',
            departamentId: departament.id,
            positionId: position.id,
            contractType: 'Fijo',
        });

        const response = await request(app)
            .put(`/api/auth/upgrade_password_staffs/${Utils.encode(staff.id)}`)
            .send({ password: 'NewPassword1!' });

        expect(response.status).toBe(200);

        const loginResponse = await request(app)
            .post('/api/auth/login_staffs')
            .send({ email: 'staff-upgrade@example.com', password: 'NewPassword1!' });
        expect(loginResponse.status).toBe(200);
    });
});
