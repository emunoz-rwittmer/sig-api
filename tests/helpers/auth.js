const request = require('supertest');
const Roles = require('../../src/models/catalogs/roles.models');
const Users = require('../../src/models/catalogs/user.models');

const TEST_USER = {
    email: 'smoke-test@example.com',
    password: 'Sup3rSecret!',
};

async function createAuthenticatedUser(app) {
    const role = await Roles.create({ name: 'admin' });
    await Users.create({
        firstName: 'Test',
        lastName: 'Admin',
        email: TEST_USER.email,
        password: TEST_USER.password,
        roleId: role.id,
        active: true,
    });

    const response = await request(app)
        .post('/api/auth/login')
        .send(TEST_USER);

    if (response.status !== 200 || !response.body.token) {
        throw new Error(`No se pudo autenticar el usuario de prueba: ${JSON.stringify(response.body)}`);
    }

    return response.body.token;
}

module.exports = { createAuthenticatedUser, TEST_USER };
