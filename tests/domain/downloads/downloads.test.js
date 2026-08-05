const fs = require('fs');
const path = require('path');
const request = require('supertest');
const { bootTestApp, shutdownTestApp } = require('../../helpers/testApp');
const { createAuthenticatedUser } = require('../../helpers/auth');
const { createDepartment, createPosition, createCompanyWithYacht } = require('../../helpers/staffFixtures');
const Staff = require('../../../src/models/catalogs/staff.models');
const Regulation = require('../../../src/models/rrhh/regulation.models');
const DoctorFormat = require('../../../src/models/rrhh/doctorFormat.models');
const Format = require('../../../src/models/rrhh/format.models');
const RequestStaffs = require('../../../src/models/rrhh/requestStaffs.models');
const ShippingGuide = require('../../../src/models/operations/shippingGuide/shippingGuide.models');
const Cruise = require('../../../src/models/bar/cruises.models');
const Utils = require('../../../src/utils/Utils');

let app;
let token;
let fixtureCounter = 0;

const auth = (httpRequest) => httpRequest.set('Authorization', `Bearer ${token}`);
const suffix = () => {
    fixtureCounter += 1;
    return `${Date.now()}-${fixtureCounter}`;
};

// El helper valida containment bajo uploads/, asi que un os.tmpdir() seria
// rechazado. uploads/ esta en .gitignore.
const FIXTURE_DIR_NAME = `__test_downloads__/${process.pid}-${Date.now()}`;
const FIXTURE_ABS_DIR = path.join(__dirname, '../../..', 'uploads', FIXTURE_DIR_NAME);

// Separadores POSIX a mano: path.relative devolveria backslashes en Windows,
// y ese caso se prueba aparte a proposito.
const createFixtureFile = (filename, contents = 'FIXTURE-CONTENT') => {
    fs.mkdirSync(FIXTURE_ABS_DIR, { recursive: true });
    fs.writeFileSync(path.join(FIXTURE_ABS_DIR, filename), contents);
    return `/uploads/${FIXTURE_DIR_NAME}/${filename}`;
};

const missingFilePath = (filename) => `/uploads/${FIXTURE_DIR_NAME}/${filename}`;

const readBinary = (httpRequest) =>
    httpRequest.buffer(true).parse((res, callback) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
    });

const waitForFileRemoval = async (filePath) => {
    for (let attempt = 0; attempt < 20; attempt += 1) {
        if (!fs.existsSync(filePath)) return;
        await new Promise((resolve) => setTimeout(resolve, 25));
    }
    throw new Error(`El archivo temporal no fue eliminado: ${filePath}`);
};

beforeAll(async () => {
    app = await bootTestApp();
    token = await createAuthenticatedUser(app);
}, 60000);

afterAll(async () => {
    fs.rmSync(FIXTURE_ABS_DIR, { recursive: true, force: true });
    await shutdownTestApp();
});

// --- Fixtures de DB -------------------------------------------------------

async function createRegulationFixture(file) {
    const { company } = await createCompanyWithYacht(`Reg Company ${suffix()}`);
    return Regulation.create({
        name: `Reglamento Interno ${suffix()}`,
        file,
        companyId: company.id,
    });
}

async function createDoctorFormatFixture(file) {
    return DoctorFormat.create({
        name: `Formato Medico ${suffix()}`,
        file,
        companies: [],
    });
}

async function createRequestFixture(file) {
    const departament = await createDepartment();
    const position = await createPosition();
    const uniqueSuffix = suffix();
    const staff = await Staff.create({
        firstName: 'TEST_AUTOMATED',
        lastName: `Downloads${uniqueSuffix}`,
        email: `downloads-test-${uniqueSuffix}@example.com`,
        cellPhone: '0966666666',
        password: 'Sup3rSecret!',
        departamentId: departament.id,
        positionId: position.id,
        contractType: 'Fijo',
        active: true,
    });
    const format = await Format.create({
        name: `Formato ${uniqueSuffix}`,
        content: '<p>contenido</p>',
        companies: [],
    });
    return RequestStaffs.create({
        formatId: format.id,
        staffId: staff.id,
        name: `Vacaciones ${uniqueSuffix}`,
        company: 'Rolf Wittmer',
        file,
    });
}

async function createShippingGuideFixture(file) {
    return ShippingGuide.create({
        counter: `001-${suffix()}`,
        dateStartTraslate: new Date('2026-07-01'),
        dateEndTraslate: new Date('2026-07-02'),
        file,
    });
}

async function createCruiseFixture(overrides = {}) {
    const { yacht } = await createCompanyWithYacht(`Cruise Company ${suffix()}`);
    return Cruise.create({
        yachtId: yacht.id,
        code: `CR-${suffix()}`,
        name: `Crucero ${suffix()}`,
        itinerary: 'A',
        transferDay: 1,
        startDate: new Date('2026-07-01'),
        endDate: new Date('2026-07-08'),
        ...overrides,
    });
}

// --- Los 6 endpoints, 5 casos cada uno ------------------------------------

describe('Downloads — reglamento', () => {
    const url = (id) => `/api/downloads/${id}/download`;

    it('descarga el archivo del reglamento', async () => {
        const file = createFixtureFile(`reglamento-${suffix()}.pdf`);
        const regulation = await createRegulationFixture(file);

        const response = await auth(request(app).get(url(Utils.encode(regulation.id))));

        expect(response.status).toBe(200);
        expect(response.headers['content-disposition']).toContain('attachment');
        expect(response.headers['content-disposition']).toContain('Reglamento_Interno');
        expect(response.headers['content-type']).toContain('application/pdf');
    });

    it('devuelve 400 con un hashid invalido', async () => {
        const response = await auth(request(app).get(url('not-a-hashid')));

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 404 si el reglamento no existe', async () => {
        const response = await auth(request(app).get(url(Utils.encode(999999999))));

        expect(response.status).toBe(404);
        expect(response.body.error.message).toBe('Reglamento no encontrado');
    });

    it('devuelve 404 si no tiene archivo asociado', async () => {
        const regulation = await createRegulationFixture('');

        const response = await auth(request(app).get(url(Utils.encode(regulation.id))));

        expect(response.status).toBe(404);
        expect(response.body.error.message).toBe('El reglamento no tiene archivo asociado');
    });

    it('devuelve 404 si el archivo no esta en disco', async () => {
        const regulation = await createRegulationFixture(missingFilePath('nunca-creado.pdf'));

        const response = await auth(request(app).get(url(Utils.encode(regulation.id))));

        expect(response.status).toBe(404);
        expect(response.body.error.message).toBe('Archivo no encontrado');
    });
});

describe('Downloads — formato medico', () => {
    const url = (id) => `/api/downloads/doctor_format/${id}/download`;

    it('descarga el archivo del formato medico', async () => {
        const file = createFixtureFile(`formato-${suffix()}.pdf`);
        const format = await createDoctorFormatFixture(file);

        const response = await auth(request(app).get(url(Utils.encode(format.id))));

        expect(response.status).toBe(200);
        expect(response.headers['content-disposition']).toContain('attachment');
        expect(response.headers['content-disposition']).toContain('Formato_Medico');
    });

    it('devuelve 400 con un hashid invalido', async () => {
        const response = await auth(request(app).get(url('not-a-hashid')));

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 404 si el formato no existe', async () => {
        const response = await auth(request(app).get(url(Utils.encode(999999999))));

        expect(response.status).toBe(404);
        expect(response.body.error.message).toBe('Formato médico no encontrado');
    });

    it('devuelve 404 si no tiene archivo asociado', async () => {
        const format = await createDoctorFormatFixture(null);

        const response = await auth(request(app).get(url(Utils.encode(format.id))));

        expect(response.status).toBe(404);
        expect(response.body.error.message).toBe('El formato médico no tiene archivo asociado');
    });

    it('devuelve 404 si el archivo no esta en disco', async () => {
        const format = await createDoctorFormatFixture(missingFilePath('nunca-creado.pdf'));

        const response = await auth(request(app).get(url(Utils.encode(format.id))));

        expect(response.status).toBe(404);
        expect(response.body.error.message).toBe('Archivo no encontrado');
    });
});

describe('Downloads — solicitud de staff', () => {
    const url = (id) => `/api/downloads/staff/request/${id}/download`;

    // Regresion: 46a9680 borro FormatService.getRequestById como dead code
    // mientras este handler seguia llamandola, dejando el endpoint 100% roto.
    it('descarga la solicitud (regresion del bug de 46a9680)', async () => {
        const file = createFixtureFile(`solicitud-${suffix()}.pdf`);
        const requestRow = await createRequestFixture(file);

        const response = await auth(request(app).get(url(Utils.encode(requestRow.id))));

        expect(response.status).toBe(200);
        expect(response.headers['content-disposition']).toContain('attachment');
        expect(response.headers['content-disposition']).toContain('Solicitud_Vacaciones');
    });

    it('devuelve 400 con un hashid invalido', async () => {
        const response = await auth(request(app).get(url('not-a-hashid')));

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 404 si la solicitud no existe', async () => {
        const response = await auth(request(app).get(url(Utils.encode(999999999))));

        expect(response.status).toBe(404);
        expect(response.body.error.message).toBe('Solicitud no encontrada');
    });

    it('devuelve 404 si no tiene archivo asociado', async () => {
        const requestRow = await createRequestFixture(null);

        const response = await auth(request(app).get(url(Utils.encode(requestRow.id))));

        expect(response.status).toBe(404);
        expect(response.body.error.message).toBe('La solicitud no tiene archivo asociado');
    });

    it('devuelve 404 si el archivo no esta en disco', async () => {
        const requestRow = await createRequestFixture(missingFilePath('nunca-creado.pdf'));

        const response = await auth(request(app).get(url(Utils.encode(requestRow.id))));

        expect(response.status).toBe(404);
        expect(response.body.error.message).toBe('Archivo no encontrado');
    });
});

describe('Downloads — guia de remision', () => {
    const url = (id) => `/api/downloads/guide/${id}/download`;

    it('descarga el archivo de la guia', async () => {
        const file = createFixtureFile(`guia-${suffix()}.pdf`);
        const guide = await createShippingGuideFixture(file);

        const response = await auth(request(app).get(url(Utils.encode(guide.id))));

        expect(response.status).toBe(200);
        expect(response.headers['content-disposition']).toContain('attachment');
        expect(response.headers['content-disposition']).toContain('guia_remision_001-');
    });

    it('devuelve 400 con un hashid invalido', async () => {
        const response = await auth(request(app).get(url('not-a-hashid')));

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 404 si la guia no existe', async () => {
        const response = await auth(request(app).get(url(Utils.encode(999999999))));

        expect(response.status).toBe(404);
        expect(response.body.error.message).toBe('Guía de remisión no encontrada');
    });

    it('devuelve 404 si no tiene archivo asociado', async () => {
        const guide = await createShippingGuideFixture('');

        const response = await auth(request(app).get(url(Utils.encode(guide.id))));

        expect(response.status).toBe(404);
        expect(response.body.error.message).toBe('La guía de remisión no tiene archivo asociado');
    });

    it('devuelve 404 si el archivo no esta en disco', async () => {
        const guide = await createShippingGuideFixture(missingFilePath('nunca-creado.pdf'));

        const response = await auth(request(app).get(url(Utils.encode(guide.id))));

        expect(response.status).toBe(404);
        expect(response.body.error.message).toBe('Archivo no encontrado');
    });
});

describe('Downloads — reporte PDF de crucero', () => {
    // 'pfd' es un typo historico en la URL publica; se conserva a proposito.
    const url = (id) => `/api/downloads/cruise/${id}/download/pfd`;

    it('descarga el reporte PDF', async () => {
        const file = createFixtureFile(`crucero-pdf-${suffix()}.pdf`);
        const cruise = await createCruiseFixture({ urlPDFReport: file });

        const response = await auth(request(app).get(url(Utils.encode(cruise.id))));

        expect(response.status).toBe(200);
        expect(response.headers['content-disposition']).toContain('attachment');
        expect(response.headers['content-disposition']).toContain('reporte_crucero_CR-');
    });

    it('devuelve 400 con un hashid invalido', async () => {
        const response = await auth(request(app).get(url('not-a-hashid')));

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 404 si el crucero no existe', async () => {
        const response = await auth(request(app).get(url(Utils.encode(999999999))));

        expect(response.status).toBe(404);
        expect(response.body.error.message).toBe('Crucero no encontrado');
    });

    it('devuelve 404 si no tiene reporte PDF asociado', async () => {
        const cruise = await createCruiseFixture({ urlPDFReport: null });

        const response = await auth(request(app).get(url(Utils.encode(cruise.id))));

        expect(response.status).toBe(404);
        expect(response.body.error.message).toBe('El crucero no tiene reporte PDF asociado');
    });

    it('devuelve 404 si el archivo no esta en disco', async () => {
        const cruise = await createCruiseFixture({ urlPDFReport: missingFilePath('nunca-creado.pdf') });

        const response = await auth(request(app).get(url(Utils.encode(cruise.id))));

        expect(response.status).toBe(404);
        expect(response.body.error.message).toBe('Archivo no encontrado');
    });
});

describe('Downloads — reporte Excel de crucero', () => {
    const url = (id) => `/api/downloads/cruise/${id}/download/excel`;

    it('descarga el reporte Excel', async () => {
        const file = createFixtureFile(`crucero-excel-${suffix()}.xlsx`);
        const cruise = await createCruiseFixture({ urlExcelReport: file });

        const response = await auth(request(app).get(url(Utils.encode(cruise.id))));

        expect(response.status).toBe(200);
        expect(response.headers['content-disposition']).toContain('attachment');
        expect(response.headers['content-disposition']).toContain('reporte_crucero_CR-');
    });

    it('devuelve 400 con un hashid invalido', async () => {
        const response = await auth(request(app).get(url('not-a-hashid')));

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 404 si el crucero no existe', async () => {
        const response = await auth(request(app).get(url(Utils.encode(999999999))));

        expect(response.status).toBe(404);
        expect(response.body.error.message).toBe('Crucero no encontrado');
    });

    it('devuelve 404 si no tiene reporte Excel asociado', async () => {
        const cruise = await createCruiseFixture({ urlExcelReport: null });

        const response = await auth(request(app).get(url(Utils.encode(cruise.id))));

        expect(response.status).toBe(404);
        expect(response.body.error.message).toBe('El crucero no tiene reporte Excel asociado');
    });

    it('devuelve 404 si el archivo no esta en disco', async () => {
        const cruise = await createCruiseFixture({ urlExcelReport: missingFilePath('nunca-creado.pdf') });

        const response = await auth(request(app).get(url(Utils.encode(cruise.id))));

        expect(response.status).toBe(404);
        expect(response.body.error.message).toBe('Archivo no encontrado');
    });
});

// --- Regresiones que justifican el dominio --------------------------------

describe('Downloads — regresiones del helper', () => {
    it('usa application/octet-stream para una extension desconocida, nunca .false', async () => {
        const file = createFixtureFile(`raro-${suffix()}.zzz`);
        const regulation = await createRegulationFixture(file);

        const response = await auth(
            request(app).get(`/api/downloads/${Utils.encode(regulation.id)}/download`)
        );

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toContain('application/octet-stream');
        expect(response.headers['content-disposition']).toContain('.zzz');
        expect(response.headers['content-disposition']).not.toContain('false');
    });

    it('no filtra el id numerico interno en el filename', async () => {
        const file = createFixtureFile(`sin-id-${suffix()}.pdf`);
        const regulation = await createRegulationFixture(file);

        const response = await auth(
            request(app).get(`/api/downloads/${Utils.encode(regulation.id)}/download`)
        );

        expect(response.status).toBe(200);
        expect(response.headers['content-disposition']).not.toContain(`reglamento-${regulation.id}`);
    });

    it('rechaza path traversal con 404 y no sirve el archivo', async () => {
        const regulation = await createRegulationFixture('/../../package.json');

        const response = await readBinary(
            auth(request(app).get(`/api/downloads/${Utils.encode(regulation.id)}/download`))
        );

        expect(response.status).toBe(404);
        expect(response.body.toString()).not.toContain('"dependencies"');
    });

    it('rechaza una ruta que escapa de uploads/ dentro del proyecto', async () => {
        const regulation = await createRegulationFixture('/uploads/../package.json');

        const response = await readBinary(
            auth(request(app).get(`/api/downloads/${Utils.encode(regulation.id)}/download`))
        );

        expect(response.status).toBe(404);
        expect(response.body.toString()).not.toContain('"dependencies"');
    });

    it('no revienta con un nombre que trae comillas y saltos de linea', async () => {
        const file = createFixtureFile(`comillas-${suffix()}.pdf`);
        const { company } = await createCompanyWithYacht(`Quote Company ${suffix()}`);
        const regulation = await Regulation.create({
            name: 'Regla "rara"\nsegunda linea',
            file,
            companyId: company.id,
        });

        const response = await auth(
            request(app).get(`/api/downloads/${Utils.encode(regulation.id)}/download`)
        );

        expect(response.status).toBe(200);
        expect(response.headers['content-disposition']).toContain('attachment');
        expect(response.headers['content-disposition']).not.toContain('\n');
    });

    it('resuelve rutas guardadas con separadores de Windows', async () => {
        const filename = `windows-${suffix()}.pdf`;
        createFixtureFile(filename);
        const windowsPath = `/uploads/${FIXTURE_DIR_NAME}/${filename}`.replace(/\//g, '\\');
        const regulation = await createRegulationFixture(windowsPath);

        const response = await auth(
            request(app).get(`/api/downloads/${Utils.encode(regulation.id)}/download`)
        );

        expect(response.status).toBe(200);
        expect(response.headers['content-disposition']).toContain('attachment');
    });

    it('responde 403 sin token', async () => {
        const response = await request(app).get(`/api/downloads/${Utils.encode(1)}/download`);

        expect(response.status).toBe(403);
    });
});

describe('Downloads — reporte de consumer cards', () => {
    const url = '/api/downloads/consumer-cards/export/report';

    it('genera, descarga y elimina el reporte Excel', async () => {
        const { yacht } = await createCompanyWithYacht(
            `Report Company ${suffix()}`,
            `Yate Reporte ${suffix()}`
        );
        const reportPath = path.join(
            __dirname,
            '../../..',
            'uploads',
            'reports',
            `consumer_report_${yacht.name}.xlsx`
        );

        const response = await readBinary(
            auth(request(app).get(url).query({ yachtId: Utils.encode(yacht.id) }))
        );

        expect(response.status).toBe(200);
        expect(response.headers['content-disposition']).toContain('attachment');
        expect(response.headers['content-disposition']).toContain('consumer_report_Yate Reporte');
        expect(response.headers['content-type']).toContain(
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        expect(response.body.subarray(0, 2).toString()).toBe('PK');
        await waitForFileRemoval(reportPath);
    });

    it('devuelve 400 con un yachtId invalido', async () => {
        const response = await auth(request(app).get(url).query({ yachtId: 'not-a-hashid' }));

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 404 si el yate no existe', async () => {
        const response = await auth(
            request(app).get(url).query({ yachtId: Utils.encode(999999999) })
        );

        expect(response.status).toBe(404);
        expect(response.body.error.message).toBe('Yate no encontrado');
    });
});
