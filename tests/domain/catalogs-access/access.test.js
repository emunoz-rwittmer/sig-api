const request = require('supertest');
const jwt = require('jsonwebtoken');
const { bootTestApp, shutdownTestApp } = require('../../helpers/testApp');
const { createAuthenticatedUser } = require('../../helpers/auth');
const { createDepartment, createPosition } = require('../../helpers/staffFixtures');
const Users = require('../../../src/models/catalogs/user.models');
const Staff = require('../../../src/models/catalogs/staff.models');
const Roles = require('../../../src/models/catalogs/roles.models');
const Warehouse = require('../../../src/models/catalogs/wareHouse.models');
const AccessProfile = require('../../../src/models/catalogs/accessProfile.models');
const Utils = require('../../../src/utils/Utils');

let app;
let adminToken;
let counter = 0;

const suffix = () => `${Date.now()}-${++counter}`;
const as = (token, httpRequest) => httpRequest.set('Authorization', `Bearer ${token}`);
const admin = (httpRequest) => as(adminToken, httpRequest);

beforeAll(async () => {
    app = await bootTestApp();
    adminToken = await createAuthenticatedUser(app);
}, 60000);

afterAll(async () => {
    await shutdownTestApp();
});

async function createStaffLogin(roleName) {
    const role = await Roles.create({ name: roleName });
    const dept = await createDepartment(`Dept-${suffix()}`);
    const pos = await createPosition(`Pos-${suffix()}`);
    const email = `access-${suffix()}@example.com`;
    const staff = await Staff.create({
        firstName: 'TEST', lastName: 'Access', email, cellPhone: '0966666666', password: 'Sup3rSecret!',
        departamentId: dept.id, positionId: pos.id, contractType: 'Fijo', active: true, roleId: role.id, changePassword: false,
    });
    const login = await request(app).post('/api/auth/login_staffs').send({ email, password: 'Sup3rSecret!' });
    return { staff, token: login.body.token };
}

describe('Accesos: perfiles, asignación y acceso efectivo', () => {
    it('el token dice si la cuenta es del panel o de staff', async () => {
        const { token } = await createStaffLogin(`rol-${suffix()}`);

        expect(jwt.decode(adminToken).kind).toBe('user');
        expect(jwt.decode(token).kind).toBe('staff');
    });

    it('el administrador entra a todo sin perfil; un staff sin perfil queda sin permisos propios', async () => {
        const { token } = await createStaffLogin(`rol-${suffix()}`);

        const mine = await admin(request(app).get('/api/access/me'));
        const theirs = await as(token, request(app).get('/api/access/me'));

        expect(mine.body).toMatchObject({ isSuper: true, profile: null });
        expect(theirs.body).toEqual({ isSuper: false, profile: null, permissions: {}, warehouseIds: null });
    });

    it('crea un perfil limpiando módulos y acciones inexistentes, y lo aplica a quien se le asigna', async () => {
        const warehouse = await Warehouse.create({ name: `Bodega-${suffix()}`, location: 'Quito', type: 'Central' });
        const { staff, token } = await createStaffLogin(`rol-${suffix()}`);

        const created = await admin(request(app).post('/api/access/profiles').send({
            name: `Logística ${suffix()}`,
            permissions: { 'inventory.stock': ['edit'], 'inventory.registers': ['view', 'resolve', 'volar'], 'no.existe': ['view'] },
            warehouseIds: [Utils.encode(warehouse.id)],
        }));
        expect(created.status).toBe(200);
        // editar implica ver; lo que no está en el catálogo se descarta
        expect(created.body.permissions).toEqual({ 'inventory.stock': ['view', 'edit'], 'inventory.registers': ['view', 'resolve'] });

        const assigned = await admin(request(app).put('/api/access/people').send({
            people: [{ kind: 'staff', id: Utils.encode(staff.id) }],
            profileId: created.body.id,
        }));
        expect(assigned.status).toBe(200);

        const mine = await as(token, request(app).get('/api/access/me'));
        expect(mine.body).toEqual({
            isSuper: false,
            profile: { id: created.body.id, name: created.body.name },
            permissions: created.body.permissions,
            warehouseIds: [Utils.encode(warehouse.id)],
        });

        const people = await admin(request(app).get('/api/access/people'));
        expect(people.body.find((person) => person.kind === 'staff' && person.id === Utils.encode(staff.id)).accessProfileId).toBe(created.body.id);

        // No se puede borrar mientras esté asignado; al quitarlo, sí
        expect((await admin(request(app).delete(`/api/access/profiles/${created.body.id}`))).status).toBe(400);
        await admin(request(app).put('/api/access/people').send({ people: [{ kind: 'staff', id: Utils.encode(staff.id) }], profileId: null }));
        expect((await admin(request(app).delete(`/api/access/profiles/${created.body.id}`))).status).toBe(200);
        expect(await AccessProfile.count({ where: { id: Utils.decode(created.body.id) } })).toBe(0);
    });

    it('actualiza un perfil y rechaza nombres vacíos o repetidos', async () => {
        const name = `Perfil ${suffix()}`;
        const first = await admin(request(app).post('/api/access/profiles').send({ name, permissions: { bar: ['view'] } }));
        const second = await admin(request(app).post('/api/access/profiles').send({ name: `Otro ${suffix()}`, permissions: {} }));

        expect((await admin(request(app).post('/api/access/profiles').send({ name: '  ', permissions: {} }))).status).toBe(400);
        expect((await admin(request(app).put(`/api/access/profiles/${second.body.id}`).send({ name, permissions: {} }))).status).toBe(400);

        const updated = await admin(request(app).put(`/api/access/profiles/${first.body.id}`).send({ name, permissions: { bar: ['view', 'delete'] }, warehouseIds: null }));
        expect(updated.status).toBe(200);
        expect(updated.body.permissions).toEqual({ bar: ['view', 'delete'] });
        expect(updated.body.warehouseIds).toBeNull();
    });

    it('solo el administrador del panel gestiona accesos', async () => {
        const { token } = await createStaffLogin('admin');
        const other = await Users.findOne();
        expect(other).not.toBeNull();

        for (const path of ['/api/access/catalog', '/api/access/profiles', '/api/access/people']) {
            // un staff, aunque su rol se llame admin, no entra
            expect((await as(token, request(app).get(path))).status).toBe(403);
            expect((await request(app).get(path)).status).toBe(403);
        }
        const catalog = await admin(request(app).get('/api/access/catalog'));
        expect(catalog.status).toBe(200);
        expect(catalog.body.find((module) => module.key === 'inventory.registers')).toMatchObject({ group: 'Inventario', usesWarehouses: true });
        expect(catalog.body[0].legacy).toBeUndefined();
    });
});
