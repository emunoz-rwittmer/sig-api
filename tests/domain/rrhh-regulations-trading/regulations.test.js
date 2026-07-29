const request = require('supertest');
const { bootTestApp, shutdownTestApp } = require('../../helpers/testApp');
const { createAuthenticatedUser } = require('../../helpers/auth');
const { createDepartment, createPosition, createCompanyWithYacht } = require('../../helpers/staffFixtures');
const Regulation = require('../../../src/models/rrhh/regulation.models');
const StaffReadRegulation = require('../../../src/models/rrhh/readRegulation.models');
const StaffCompany = require('../../../src/models/catalogs/staffCompany.models');
const Staff = require('../../../src/models/catalogs/staff.models');
const Utils = require('../../../src/utils/Utils');

jest.mock('../../../src/mails/mailer', () => ({
    sendEmailConfirmacion: jest.fn(),
}));

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

beforeAll(async () => {
    app = await bootTestApp();
    token = await createAuthenticatedUser(app);
}, 60000);

afterAll(async () => {
    await shutdownTestApp();
});

beforeEach(() => {
    mailer.sendEmailConfirmacion.mockClear();
});

async function createStaffFixture(overrides = {}) {
    const departament = await createDepartment();
    const position = await createPosition();
    const uniqueSuffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    return Staff.create({
        firstName: 'TEST_AUTOMATED',
        lastName: `Regulations${uniqueSuffix}`,
        email: `regulations-test-${uniqueSuffix}@example.com`,
        cellPhone: '0966666666',
        password: 'Sup3rSecret!',
        departamentId: departament.id,
        positionId: position.id,
        contractType: 'Fijo',
        active: true,
        ...overrides,
    });
}

async function createBasicRegulation(companyId, overrides = {}) {
    return Regulation.create({
        name: `Reglamento ${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
        file: '/uploads/pdfs/existing.pdf',
        companyId,
        ...overrides,
    });
}

describe('RRHH Regulations', () => {
    describe('GET /api/regulations/:company_id', () => {
        it('lists regulations for a company', async () => {
            const { company } = await createCompanyWithYacht();
            const regulation = await createBasicRegulation(company.id);

            const response = await request(app)
                .get(`/api/regulations/${Utils.encode(company.id)}`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            const found = response.body.find((x) => x.id === Utils.encode(regulation.id));
            expect(found).toBeDefined();
        });

        it('returns 400 for an invalid hashid', async () => {
            const response = await request(app)
                .get('/api/regulations/not-a-hashid')
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(400);
            expect(response.body.error.code).toBe('AppError');
        });
    });

    describe('GET /api/regulations/:company_id/staffs', () => {
        it('lists staff of a company with their regulation reads', async () => {
            const { company } = await createCompanyWithYacht();
            const staff = await createStaffFixture();
            await StaffCompany.create({ staffId: staff.id, companyId: company.id });

            const response = await request(app)
                .get(`/api/regulations/${Utils.encode(company.id)}/staffs`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(1);
        });
    });

    describe('GET /api/regulations/staff/:staff_id', () => {
        it('lists regulation reads for a staff', async () => {
            const { company } = await createCompanyWithYacht();
            const staff = await createStaffFixture();
            const regulation = await createBasicRegulation(company.id);
            await StaffReadRegulation.create({ staffId: staff.id, regulationId: regulation.id, read: false });

            const response = await request(app)
                .get(`/api/regulations/staff/${Utils.encode(staff.id)}`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.length).toBe(1);
            expect(response.body[0].regulation.id).toBe(Utils.encode(regulation.id));
        });
    });

    describe('POST /api/regulations/createRegulation', () => {
        it('creates a regulation and a read record for every staff of the company', async () => {
            const { company } = await createCompanyWithYacht();
            const staff = await createStaffFixture();
            await StaffCompany.create({ staffId: staff.id, companyId: company.id });
            const name = `Reglamento Nuevo ${Date.now()}`;

            const response = await request(app)
                .post('/api/regulations/createRegulation')
                .set('Authorization', `Bearer ${token}`)
                .set('x-test-file', '1')
                .send({ name, companyId: Utils.encode(company.id) });

            expect(response.status).toBe(200);

            const created = await Regulation.findOne({ where: { name } });
            expect(created).not.toBeNull();
            expect(created.file).toMatch(/^\/uploads\/pdfs\//);

            const read = await StaffReadRegulation.findOne({
                where: { staffId: staff.id, regulationId: created.id },
            });
            expect(read).not.toBeNull();
            expect(read.read).toBe(false);
        });

        it('returns 400 when no file is attached', async () => {
            const { company } = await createCompanyWithYacht();

            const response = await request(app)
                .post('/api/regulations/createRegulation')
                .set('Authorization', `Bearer ${token}`)
                .send({ name: `Reglamento Sin Archivo ${Date.now()}`, companyId: Utils.encode(company.id) });

            expect(response.status).toBe(400);
            expect(response.body.error.message).toBe('No se ha subido ningún archivo');
        });
    });

    describe('PUT /api/regulations/updateRegulation/:regulation_id', () => {
        it('updates a regulation', async () => {
            const { company } = await createCompanyWithYacht();
            const regulation = await createBasicRegulation(company.id);
            const newName = 'Reglamento Actualizado';

            const response = await request(app)
                .put(`/api/regulations/updateRegulation/${Utils.encode(regulation.id)}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ name: newName });

            expect(response.status).toBe(200);
            await regulation.reload();
            expect(regulation.name).toBe(newName);
        });
    });

    describe('DELETE /api/regulations/:regulation_id', () => {
        it('deletes a regulation', async () => {
            const { company } = await createCompanyWithYacht();
            const regulation = await createBasicRegulation(company.id);

            const response = await request(app)
                .delete(`/api/regulations/${Utils.encode(regulation.id)}`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(await Regulation.findByPk(regulation.id)).toBeNull();
        });
    });

    describe('GET /api/regulations/regulation_staff/:regulation_id', () => {
        it('returns the read record', async () => {
            const { company } = await createCompanyWithYacht();
            const staff = await createStaffFixture();
            const regulation = await createBasicRegulation(company.id);
            const read = await StaffReadRegulation.create({ staffId: staff.id, regulationId: regulation.id, read: false });

            const response = await request(app)
                .get(`/api/regulations/regulation_staff/${Utils.encode(read.id)}`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.id).toBe(Utils.encode(read.id));
        });

        it('returns 404 when the read record does not exist', async () => {
            const response = await request(app)
                .get(`/api/regulations/regulation_staff/${Utils.encode(999999999)}`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(404);
            expect(response.body.error.message).toBe('Registro de lectura no encontrado');
        });
    });

    describe('PUT /api/regulations/aceptar_reglamento/:regulation_id', () => {
        it('marks the read record as read and sends the confirmation email', async () => {
            const { company } = await createCompanyWithYacht();
            const staff = await createStaffFixture();
            const regulation = await createBasicRegulation(company.id);
            const read = await StaffReadRegulation.create({ staffId: staff.id, regulationId: regulation.id, read: false });

            const response = await request(app)
                .put(`/api/regulations/aceptar_reglamento/${Utils.encode(read.id)}`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            await read.reload();
            expect(read.read).toBe(true);
            expect(mailer.sendEmailConfirmacion).toHaveBeenCalledTimes(1);
        });

        it('returns 404 when the read record does not exist', async () => {
            const response = await request(app)
                .put(`/api/regulations/aceptar_reglamento/${Utils.encode(999999999)}`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(404);
            expect(response.body.error.message).toBe('Registro de lectura no encontrado');
            expect(mailer.sendEmailConfirmacion).not.toHaveBeenCalled();
        });
    });
});
