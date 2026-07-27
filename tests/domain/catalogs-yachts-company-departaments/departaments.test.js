const request = require('supertest');
const { bootTestApp, shutdownTestApp } = require('../../helpers/testApp');
const { createAuthenticatedUser } = require('../../helpers/auth');
const { createDepartment } = require('../../helpers/staffFixtures');
const Departaments = require('../../../src/models/catalogs/departament.models');
const Process = require('../../../src/models/operations/indicators/process.models');
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

describe('GET /api/departaments', () => {
    it('lists departaments with encoded id', async () => {
        const departament = await createDepartment(`Departamento List ${Date.now()}`);

        const response = await request(app)
            .get('/api/departaments')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        const found = response.body.find((x) => x.id === Utils.encode(departament.id));
        expect(found).toBeDefined();
        expect(found.name).toBe(departament.name);
    });
});

describe('GET /api/departaments/:departament_id', () => {
    it('returns a single departament with encoded id', async () => {
        const departament = await createDepartment(`Departamento Get ${Date.now()}`);

        const response = await request(app)
            .get(`/api/departaments/${Utils.encode(departament.id)}`)
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body.id).toBe(Utils.encode(departament.id));
        expect(response.body.name).toBe(departament.name);
    });

    it('returns 404 when the departament does not exist', async () => {
        const response = await request(app)
            .get(`/api/departaments/${Utils.encode(999999999)}`)
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(404);
        expect(response.body.error.message).toBe('Departamento no encontrado');
    });
});

describe('GET /api/departaments/process/:departament_id', () => {
    it('returns a process looked up by its own id', async () => {
        const departament = await createDepartment(`Departamento Proceso ${Date.now()}`);
        const process = await Process.create({ departamentId: departament.id, name: 'Proceso Test' });

        const response = await request(app)
            .get(`/api/departaments/process/${Utils.encode(process.id)}`)
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body.id).toBe(Utils.encode(process.id));
        expect(response.body.name).toBe('Proceso Test');
    });

    it('returns 404 when the process does not exist', async () => {
        const response = await request(app)
            .get(`/api/departaments/process/${Utils.encode(999999999)}`)
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(404);
        expect(response.body.error.message).toBe('Proceso no encontrado');
    });
});

describe('POST /api/departaments/createDepartament', () => {
    it('creates a departament', async () => {
        const name = `Nuevo Departamento ${Date.now()}`;
        const response = await request(app)
            .post('/api/departaments/createDepartament')
            .set('Authorization', `Bearer ${token}`)
            .send({ name, indicators: true });

        expect(response.status).toBe(200);
        const created = await Departaments.findOne({ where: { name } });
        expect(created).not.toBeNull();
        expect(created.indicators).toBe(true);
    });
});

describe('PUT /api/departaments/updateDepartament/:departament_id', () => {
    it('updates a departament', async () => {
        const departament = await createDepartment(`Departamento Update ${Date.now()}`);

        const response = await request(app)
            .put(`/api/departaments/updateDepartament/${Utils.encode(departament.id)}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Departamento Actualizado' });

        expect(response.status).toBe(200);
        await departament.reload();
        expect(departament.name).toBe('Departamento Actualizado');
    });
});

describe('DELETE /api/departaments/:departament_id', () => {
    it('deletes a departament', async () => {
        const departament = await createDepartment(`Departamento Delete ${Date.now()}`);

        const response = await request(app)
            .delete(`/api/departaments/${Utils.encode(departament.id)}`)
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ data: 'resource deleted successfully' });
        const found = await Departaments.findByPk(departament.id);
        expect(found).toBeNull();
    });
});
