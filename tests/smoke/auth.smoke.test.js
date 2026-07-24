const request = require('supertest');
const { bootTestApp, shutdownTestApp } = require('../helpers/testApp');
const { TEST_USER } = require('../helpers/auth');
const Roles = require('../../src/models/catalogs/roles.models');
const Users = require('../../src/models/catalogs/user.models');

let app;

beforeAll(async () => {
    app = await bootTestApp();
    const role = await Roles.create({ name: 'admin' });
    await Users.create({
        firstName: 'Test',
        lastName: 'Admin',
        email: TEST_USER.email,
        password: TEST_USER.password,
        roleId: role.id,
        active: true,
    });
});

afterAll(async () => {
    await shutdownTestApp();
});

describe('Auth smoke test', () => {
    it('logs in with valid credentials and returns a usable token', async () => {
        const response = await request(app)
            .post('/api/auth/login')
            .send(TEST_USER);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('token');
        expect(typeof response.body.token).toBe('string');
        expect(response.body.rol).toBe('admin');
    });

    it('rejects an invalid password', async () => {
        const response = await request(app)
            .post('/api/auth/login')
            .send({ email: TEST_USER.email, password: 'wrong-password' });

        expect(response.status).toBe(400);
    });
});
