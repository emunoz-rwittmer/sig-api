const request = require('supertest');
const fs = require('fs');
const path = require('path');
const { bootTestApp, shutdownTestApp } = require('../../helpers/testApp');
const { createAuthenticatedUser } = require('../../helpers/auth');
const { createDepartment, createPosition, createCompanyWithYacht } = require('../../helpers/staffFixtures');
const Format = require('../../../src/models/rrhh/format.models');
const DoctorFormat = require('../../../src/models/rrhh/doctorFormat.models');
const RequestStaffs = require('../../../src/models/rrhh/requestStaffs.models');
const Staff = require('../../../src/models/catalogs/staff.models');
const Utils = require('../../../src/utils/Utils');

jest.mock('../../../src/mails/mailer', () => ({
    sendEmailNuevaSolicitud: jest.fn(),
}));

jest.mock('../../../src/services/rrhh/pdfService', () => ({
    generateAndSavePDF: jest.fn(async (htmlContent, filePath) => {
        const nodeFs = require('fs');
        const nodePath = require('path');
        nodeFs.mkdirSync(nodePath.dirname(filePath), { recursive: true });
        nodeFs.writeFileSync(filePath, 'PDF-CONTENT');
        return filePath;
    }),
}));

// Evita que las pruebas de `forms` (doctor formats) escriban archivos reales
// en el disco; el test controla si simula un archivo adjunto vía el header
// `x-test-file`.
jest.mock('../../../src/middlewares/uploadMiddleware', () => {
    return (type) => (req, res, next) => {
        if (type === 'single' && req.headers['x-test-file'] === '1') {
            req.file = {
                filename: `mock-${Date.now()}-${Math.floor(Math.random() * 1e6)}.pdf`,
                originalname: 'mock.pdf',
                mimetype: 'application/pdf',
            };
        }
        next();
    };
});

const mailer = require('../../../src/mails/mailer');

let app;
let token;

const testStaffDirs = [];

beforeAll(async () => {
    app = await bootTestApp();
    token = await createAuthenticatedUser(app);
}, 60000);

afterAll(async () => {
    for (const dir of testStaffDirs) {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    await shutdownTestApp();
});

async function createBasicFormat(overrides = {}) {
    return Format.create({
        name: `Formato ${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
        content: '<p>{compania}</p>',
        companies: [],
        ...overrides,
    });
}

async function createBasicDoctorFormat(overrides = {}) {
    return DoctorFormat.create({
        name: `Formato Medico ${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
        file: '/uploads/pdfs/existing.pdf',
        companies: [],
        ...overrides,
    });
}

async function createStaffFixture(overrides = {}) {
    const departament = await createDepartment();
    const position = await createPosition();
    const uniqueSuffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const staff = await Staff.create({
        firstName: 'TEST_AUTOMATED',
        lastName: `Formats${uniqueSuffix}`,
        email: `formats-test-${uniqueSuffix}@example.com`,
        cellPhone: '0966666666',
        password: 'Sup3rSecret!',
        departamentId: departament.id,
        positionId: position.id,
        contractType: 'Fijo',
        active: true,
        signature: '/uploads/staffs/test-signature.png',
        ...overrides,
    });
    const staffFullName = `${staff.firstName}_${staff.lastName}`.replace(/\s+/g, '_');
    testStaffDirs.push(path.join(__dirname, '../../..', 'uploads', 'staffs', staffFullName));
    return staff;
}

describe('GET /api/formats/request', () => {
    it('lists formats with encoded id', async () => {
        const format = await createBasicFormat({ name: `Formato List ${Date.now()}` });

        const response = await request(app)
            .get('/api/formats/request')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        const found = response.body.find((x) => x.id === Utils.encode(format.id));
        expect(found).toBeDefined();
        expect(found.name).toBe(format.name);
    });
});

describe('GET /api/formats/request/:format_id', () => {
    it('returns a single format with encoded id', async () => {
        const format = await createBasicFormat({ name: `Formato Get ${Date.now()}` });

        const response = await request(app)
            .get(`/api/formats/request/${Utils.encode(format.id)}`)
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body.id).toBe(Utils.encode(format.id));
        expect(response.body.name).toBe(format.name);
    });

    it('returns 404 when the format does not exist', async () => {
        const response = await request(app)
            .get(`/api/formats/request/${Utils.encode(999999999)}`)
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(404);
        expect(response.body.error.message).toBe('Formato no encontrado');
    });

    it('returns 400 when format_id is not a valid hashid', async () => {
        const response = await request(app)
            .get('/api/formats/request/not-a-hashid')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(400);
    });
});

describe('POST /api/formats/request', () => {
    it('creates a format', async () => {
        const name = `Nuevo Formato ${Date.now()}`;

        const response = await request(app)
            .post('/api/formats/request')
            .set('Authorization', `Bearer ${token}`)
            .send({ name, content: '<p>hola</p>', companies: [] });

        expect(response.status).toBe(200);
        const created = await Format.findOne({ where: { name } });
        expect(created).not.toBeNull();
    });
});

describe('PUT /api/formats/request/:format_id', () => {
    it('updates a format even without companies in the payload', async () => {
        const format = await createBasicFormat({ name: `Formato Update ${Date.now()}` });

        const response = await request(app)
            .put(`/api/formats/request/${Utils.encode(format.id)}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Formato Actualizado' });

        expect(response.status).toBe(200);
        await format.reload();
        expect(format.name).toBe('Formato Actualizado');
    });
});

describe('DELETE /api/formats/request/:format_id', () => {
    it('deletes a format', async () => {
        const format = await createBasicFormat({ name: `Formato Delete ${Date.now()}` });

        const response = await request(app)
            .delete(`/api/formats/request/${Utils.encode(format.id)}`)
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        const found = await Format.findByPk(format.id);
        expect(found).toBeNull();
    });
});

describe('GET /api/formats/forms', () => {
    it('lists doctor formats with encoded id', async () => {
        const doctorFormat = await createBasicDoctorFormat({ name: `Formato Medico List ${Date.now()}` });

        const response = await request(app)
            .get('/api/formats/forms')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        const found = response.body.find((x) => x.id === Utils.encode(doctorFormat.id));
        expect(found).toBeDefined();
        expect(found.name).toBe(doctorFormat.name);
    });
});

describe('GET /api/formats/forms/:format_id', () => {
    it('returns a single doctor format with encoded id', async () => {
        const doctorFormat = await createBasicDoctorFormat({ name: `Formato Medico Get ${Date.now()}` });

        const response = await request(app)
            .get(`/api/formats/forms/${Utils.encode(doctorFormat.id)}`)
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body.id).toBe(Utils.encode(doctorFormat.id));
    });

    it('returns 404 when the doctor format does not exist', async () => {
        const response = await request(app)
            .get(`/api/formats/forms/${Utils.encode(999999999)}`)
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(404);
        expect(response.body.error.message).toBe('Formato médico no encontrado');
    });
});

describe('POST /api/formats/forms', () => {
    it('creates a doctor format when a file is attached', async () => {
        const name = `Formato Medico Nuevo ${Date.now()}`;

        const response = await request(app)
            .post('/api/formats/forms')
            .set('Authorization', `Bearer ${token}`)
            .set('x-test-file', '1')
            .send({ name, companies: JSON.stringify([]) });

        expect(response.status).toBe(200);
        const created = await DoctorFormat.findOne({ where: { name } });
        expect(created).not.toBeNull();
        expect(created.file).toMatch(/^\/uploads\/pdfs\//);
    });

    it('returns 400 when no file is attached', async () => {
        const response = await request(app)
            .post('/api/formats/forms')
            .set('Authorization', `Bearer ${token}`)
            .send({ name: `Formato Medico Sin Archivo ${Date.now()}`, companies: JSON.stringify([]) });

        expect(response.status).toBe(400);
        expect(response.body.error.message).toBe('No se ha subido ningún archivo');
    });

    it('returns 400 when companies is malformed JSON', async () => {
        const response = await request(app)
            .post('/api/formats/forms')
            .set('Authorization', `Bearer ${token}`)
            .set('x-test-file', '1')
            .send({ name: `Formato Medico Malformado ${Date.now()}`, companies: '{not-json' });

        expect(response.status).toBe(400);
        expect(response.body.error.message).toBe('companies inválido');
    });
});

describe('PUT /api/formats/forms/:format_id', () => {
    it('updates a doctor format without resending the file', async () => {
        const doctorFormat = await createBasicDoctorFormat({ name: `Formato Medico Update ${Date.now()}` });

        const response = await request(app)
            .put(`/api/formats/forms/${Utils.encode(doctorFormat.id)}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Formato Medico Actualizado', companies: JSON.stringify([]) });

        expect(response.status).toBe(200);
        await doctorFormat.reload();
        expect(doctorFormat.name).toBe('Formato Medico Actualizado');
        expect(doctorFormat.file).toBe('/uploads/pdfs/existing.pdf');
    });
});

describe('DELETE /api/formats/forms/:format_id', () => {
    it('deletes a doctor format', async () => {
        const doctorFormat = await createBasicDoctorFormat({ name: `Formato Medico Delete ${Date.now()}` });

        const response = await request(app)
            .delete(`/api/formats/forms/${Utils.encode(doctorFormat.id)}`)
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        const found = await DoctorFormat.findByPk(doctorFormat.id);
        expect(found).toBeNull();
    });
});

describe('GET /api/formats/:format_id/request/:staff_id', () => {
    it('lists requests filed by a staff for a format', async () => {
        const format = await createBasicFormat();
        const staff = await createStaffFixture();
        await RequestStaffs.create({
            formatId: format.id,
            staffId: staff.id,
            name: format.name,
            company: 'Test Company',
            file: '/uploads/staffs/test/request.pdf',
        });

        const response = await request(app)
            .get(`/api/formats/${Utils.encode(format.id)}/request/${Utils.encode(staff.id)}`)
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(1);
    });
});

describe('POST /api/formats/create_request/format/:format_id/staff/:staff_id', () => {
    beforeEach(() => {
        mailer.sendEmailNuevaSolicitud.mockClear();
    });

    it('creates a request for staff, generates the pdf and sends the email', async () => {
        const { company } = await createCompanyWithYacht(`Compania Formats ${Date.now()}`);
        const staff = await createStaffFixture();
        const format = await createBasicFormat();

        const response = await request(app)
            .post(`/api/formats/create_request/format/${Utils.encode(format.id)}/staff/${Utils.encode(staff.id)}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ compania: company.name, contenido: '<p>{compania}</p>' });

        expect(response.status).toBe(200);
        const created = await RequestStaffs.findOne({ where: { formatId: format.id, staffId: staff.id } });
        expect(created).not.toBeNull();
        expect(created.company).toBe(company.name);
        expect(mailer.sendEmailNuevaSolicitud).toHaveBeenCalledTimes(1);
    });

    it('returns 404 when the staff does not exist', async () => {
        const { company } = await createCompanyWithYacht(`Compania Formats Staff404 ${Date.now()}`);
        const format = await createBasicFormat();

        const response = await request(app)
            .post(`/api/formats/create_request/format/${Utils.encode(format.id)}/staff/${Utils.encode(999999999)}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ compania: company.name, contenido: '<p>{compania}</p>' });

        expect(response.status).toBe(404);
        expect(response.body.error.message).toBe('Staff no encontrado');
    });

    it('returns 404 when the format does not exist', async () => {
        const { company } = await createCompanyWithYacht(`Compania Formats Format404 ${Date.now()}`);
        const staff = await createStaffFixture();

        const response = await request(app)
            .post(`/api/formats/create_request/format/${Utils.encode(999999999)}/staff/${Utils.encode(staff.id)}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ compania: company.name, contenido: '<p>{compania}</p>' });

        expect(response.status).toBe(404);
        expect(response.body.error.message).toBe('Formato no encontrado');
    });

    it('returns 404 when the compania does not exist', async () => {
        const staff = await createStaffFixture();
        const format = await createBasicFormat();

        const response = await request(app)
            .post(`/api/formats/create_request/format/${Utils.encode(format.id)}/staff/${Utils.encode(staff.id)}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ compania: `Compania Inexistente ${Date.now()}`, contenido: '<p>{compania}</p>' });

        expect(response.status).toBe(404);
        expect(response.body.error.message).toBe('Compañía no encontrada');
    });
});
