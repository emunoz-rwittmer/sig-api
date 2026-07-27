const request = require('supertest');
const { bootTestApp, shutdownTestApp } = require('../../helpers/testApp');
const { createAuthenticatedUser } = require('../../helpers/auth');
const { createDepartment, createPosition } = require('../../helpers/staffFixtures');
const Documentation = require('../../../src/models/catalogs/documentation.models');
const Staff = require('../../../src/models/catalogs/staff.models');
const StaffDocumentation = require('../../../src/models/catalogs/staffDocumentation.models');
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
        firstName: 'Doc',
        lastName: `Test${Date.now()}${Math.floor(Math.random() * 1e6)}`,
        email: `doc-test-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`,
        cellPhone: '0966666666',
        password: 'Sup3rSecret!',
        departamentId: departament.id,
        positionId: position.id,
        contractType: 'Fijo',
        active: true,
    });
}

async function createBasicDocument(overrides = {}) {
    return Documentation.create({
        name: `Documento ${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
        description: 'Descripción de prueba',
        required: false,
        positions: [],
        ...overrides,
    });
}

describe('GET /api/documentation', () => {
    it('lists documents with encoded id', async () => {
        const document = await createBasicDocument({ name: `Documento List ${Date.now()}` });

        const response = await request(app)
            .get('/api/documentation')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        const found = response.body.find((x) => x.id === Utils.encode(document.id));
        expect(found).toBeDefined();
        expect(found.name).toBe(document.name);
    });
});

describe('GET /api/documentation/:document_id', () => {
    it('returns a single document with encoded id', async () => {
        const document = await createBasicDocument({ name: `Documento Get ${Date.now()}` });

        const response = await request(app)
            .get(`/api/documentation/${Utils.encode(document.id)}`)
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body.id).toBe(Utils.encode(document.id));
        expect(response.body.name).toBe(document.name);
    });

    it('returns 404 when the document does not exist', async () => {
        const response = await request(app)
            .get(`/api/documentation/${Utils.encode(999999999)}`)
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(404);
        expect(response.body.error.message).toBe('Documento no encontrado');
    });
});

describe('POST /api/documentation/createDocument', () => {
    it('creates a document without positions', async () => {
        const name = `Nuevo Documento ${Date.now()}`;
        const response = await request(app)
            .post('/api/documentation/createDocument')
            .set('Authorization', `Bearer ${token}`)
            .send({ name, description: 'Test', required: true, positions: [] });

        expect(response.status).toBe(200);
        const created = await Documentation.findOne({ where: { name } });
        expect(created).not.toBeNull();
        expect(created.required).toBe(true);
    });

    it('creates pending StaffDocumentation for staff whose position is included', async () => {
        const position = await createPosition(`Position Doc Create ${Date.now()}`);
        const staffWithPosition = await createStaffWithPosition(position);
        const otherPosition = await createPosition(`Position Doc Create Other ${Date.now()}`);
        const staffWithoutPosition = await createStaffWithPosition(otherPosition);

        const name = `Documento Con Posiciones ${Date.now()}`;
        const response = await request(app)
            .post('/api/documentation/createDocument')
            .set('Authorization', `Bearer ${token}`)
            .send({ name, description: 'Test', required: true, positions: [Utils.encode(position.id)] });

        expect(response.status).toBe(200);
        const created = await Documentation.findOne({ where: { name } });

        const staffDocs = await StaffDocumentation.findAll({ where: { documentId: created.id } });
        expect(staffDocs).toHaveLength(1);
        expect(staffDocs[0].staffId).toBe(staffWithPosition.id);
        expect(staffDocs[0].status).toBe('pending');

        const staffDocsForOther = await StaffDocumentation.findAll({ where: { documentId: created.id, staffId: staffWithoutPosition.id } });
        expect(staffDocsForOther).toHaveLength(0);
    });
});

describe('PUT /api/documentation/updateDocument/:document_id', () => {
    it('updates a document', async () => {
        const document = await createBasicDocument({ name: `Documento Update ${Date.now()}` });

        const response = await request(app)
            .put(`/api/documentation/updateDocument/${Utils.encode(document.id)}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Documento Actualizado', description: document.description, required: document.required, positions: [] });

        expect(response.status).toBe(200);
        await document.reload();
        expect(document.name).toBe('Documento Actualizado');
    });

    it('moves StaffDocumentation when positions change from one position to another', async () => {
        const oldPosition = await createPosition(`Position Doc Update Old ${Date.now()}`);
        const newPosition = await createPosition(`Position Doc Update New ${Date.now()}`);
        const staffOld = await createStaffWithPosition(oldPosition);
        const staffNew = await createStaffWithPosition(newPosition);

        const document = await createBasicDocument({
            name: `Documento Reasignar ${Date.now()}`,
            positions: [Utils.encode(oldPosition.id)],
        });
        await StaffDocumentation.create({ staffId: staffOld.id, documentId: document.id, status: 'pending' });

        const response = await request(app)
            .put(`/api/documentation/updateDocument/${Utils.encode(document.id)}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ name: document.name, description: document.description, required: document.required, positions: [Utils.encode(newPosition.id)] });

        expect(response.status).toBe(200);

        const staffDocsForOld = await StaffDocumentation.findAll({ where: { documentId: document.id, staffId: staffOld.id } });
        expect(staffDocsForOld).toHaveLength(0);

        const staffDocsForNew = await StaffDocumentation.findAll({ where: { documentId: document.id, staffId: staffNew.id } });
        expect(staffDocsForNew).toHaveLength(1);
        expect(staffDocsForNew[0].status).toBe('pending');
    });

    it('returns 404 when the document does not exist', async () => {
        const response = await request(app)
            .put(`/api/documentation/updateDocument/${Utils.encode(999999999)}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'No existe', description: '', required: false, positions: [] });

        expect(response.status).toBe(404);
        expect(response.body.error.message).toBe('Documento no encontrado');
    });
});

describe('DELETE /api/documentation/:document_id', () => {
    it('deletes a document', async () => {
        const document = await createBasicDocument({ name: `Documento Delete ${Date.now()}` });

        const response = await request(app)
            .delete(`/api/documentation/${Utils.encode(document.id)}`)
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ data: 'resource deleted successfully' });
        const found = await Documentation.findByPk(document.id);
        expect(found).toBeNull();
    });
});
