const request = require('supertest');
const { bootTestApp, shutdownTestApp } = require('../../helpers/testApp');
const { createAuthenticatedUser } = require('../../helpers/auth');
const Users = require('../../../src/models/catalogs/user.models');
const Roles = require('../../../src/models/catalogs/roles.models');
const Utils = require('../../../src/utils/Utils');

jest.mock('../../../src/mails/mailer', () => ({
    sendEmail: jest.fn(),
    sendEmailPasswordStaff: jest.fn(),
}));

let app;
let token;

beforeAll(async () => {
    app = await bootTestApp();
    token = await createAuthenticatedUser(app);
});

afterAll(async () => {
    await shutdownTestApp();
});

async function createBasicUser(overrides = {}) {
    const role = await Roles.create({ name: `role-${Date.now()}-${Math.random()}` });
    return Users.create({
        firstName: 'Elena',
        lastName: 'Ruiz',
        email: `user-${Date.now()}-${Math.random()}@example.com`,
        password: 'Sup3rSecret!',
        roleId: role.id,
        active: true,
        ...overrides,
    });
}

describe('GET /api/users', () => {
    it('lists users with encoded ids', async () => {
        const user = await createBasicUser({ firstName: 'Fernanda' });

        const response = await request(app)
            .get('/api/users')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        const found = response.body.find((x) => x.id === Utils.encode(user.id));
        expect(found).toBeDefined();
        expect(found.firstName).toBe('Fernanda');
    });
});

describe('GET /api/users/:user_id', () => {
    it('returns a single user with id and all fields correctly populated', async () => {
        const user = await createBasicUser({ firstName: 'Gabriel' });

        const response = await request(app)
            .get(`/api/users/${Utils.encode(user.id)}`)
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body.id).toBe(Utils.encode(user.id));
        expect(response.body.firstName).toBe('Gabriel');
        expect(response.body.roleId).toBe(Utils.encode(user.roleId));
    });
});

describe('POST /api/users/createUser', () => {
    it('creates a user with a generated password and decoded roleId', async () => {
        const role = await Roles.create({ name: `role-${Date.now()}-${Math.random()}` });

        const response = await request(app)
            .post('/api/users/createUser')
            .set('Authorization', `Bearer ${token}`)
            .send({
                firstName: 'Hugo',
                lastName: 'Diaz',
                email: 'hugo@example.com',
                roleId: Utils.encode(role.id),
            });

        expect(response.status).toBe(200);
        const created = await Users.findOne({ where: { email: 'hugo@example.com' } });
        expect(created).not.toBeNull();
        expect(created.roleId).toBe(role.id);
    });
});

describe('PUT /api/users/updateUser/:user_id', () => {
    it('updates a user', async () => {
        const user = await createBasicUser();
        const newRole = await Roles.create({ name: `role-${Date.now()}-${Math.random()}` });

        const response = await request(app)
            .put(`/api/users/updateUser/${Utils.encode(user.id)}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ firstName: 'Elena Actualizada', roleId: Utils.encode(newRole.id) });

        expect(response.status).toBe(200);
        await user.reload();
        expect(user.firstName).toBe('Elena Actualizada');
        expect(user.roleId).toBe(newRole.id);
    });
});

describe('DELETE /api/users/:user_id', () => {
    it('deletes a user', async () => {
        const user = await createBasicUser();

        const response = await request(app)
            .delete(`/api/users/${Utils.encode(user.id)}`)
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        const found = await Users.findByPk(user.id);
        expect(found).toBeNull();
    });
});
