const request = require('supertest');
const { bootTestApp, shutdownTestApp } = require('../../helpers/testApp');
const { createAuthenticatedUser } = require('../../helpers/auth');
const { createDepartment } = require('../../helpers/staffFixtures');
const Process = require('../../../src/models/operations/indicators/process.models');
const Formula = require('../../../src/models/operations/indicators/formula.models');
const Indicator = require('../../../src/models/operations/indicators/indicator.models');
const Tabulation = require('../../../src/models/operations/indicators/tabulation.models');
const Utils = require('../../../src/utils/Utils');

let app;
let token;

beforeAll(async () => {
    app = await bootTestApp();
    token = await createAuthenticatedUser(app);
}, 60000);

afterAll(async () => {
    await shutdownTestApp();
});

async function createProcessFixture(overrides = {}) {
    const departament = await createDepartment();
    return Process.create({ departamentId: departament.id, name: `Proceso ${Date.now()}-${Math.floor(Math.random() * 1e6)}`, ...overrides });
}

async function createFormulaFixture(name = '(a/b)*100') {
    return Formula.create({ name });
}

async function createIndicatorFixture(process, formula, overrides = {}) {
    return Indicator.create({
        departamentId: process.id,
        formulaId: formula.id,
        name: `Indicador ${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
        type: 'Eficacia',
        source: 'Fuente de prueba',
        reading: 'Mensual',
        follow: 'Trimestral',
        formula: '(a/b)*100',
        goal: '90',
        typeGoal: 'porcentaje',
        active: true,
        ...overrides,
    });
}

describe('Operations Indicators (redesign)', () => {
    describe('GET /api/indicators/all', () => {
        it('lists every indicator across processes with encoded ids and nested process/departamento', async () => {
            const process = await createProcessFixture();
            const formula = await createFormulaFixture();
            const indicator = await createIndicatorFixture(process, formula, { subprocess: 'Compras', numLabel: 'Atendidos', denLabel: 'Total' });

            const response = await request(app)
                .get('/api/indicators/all')
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            const found = response.body.find((x) => x.id === Utils.encode(indicator.id));
            expect(found).toBeDefined();
            expect(found.subprocess).toBe('Compras');
            expect(found.numLabel).toBe('Atendidos');
            expect(found.departament.id).toBe(Utils.encode(process.id));
            expect(found.departament.departamento).toBeDefined();
            expect(Array.isArray(found.tabulations)).toBe(true);
        });
    });

    describe('POST /api/indicators/createIndicator', () => {
        it('creates an indicator with the new redesign fields', async () => {
            const process = await createProcessFixture();
            const formula = await createFormulaFixture();

            const response = await request(app)
                .post('/api/indicators/createIndicator')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    departamentId: Utils.encode(process.id),
                    formulaId: Utils.encode(formula.id),
                    name: `Indicador nuevo ${Date.now()}`,
                    type: 'Efectividad',
                    subprocess: 'Servicio a bordo',
                    source: 'Comment cards',
                    reading: 'Mensual',
                    follow: 'Trimestral',
                    formula: '(a/b)*100',
                    numLabel: 'Satisfechos',
                    denLabel: 'Encuestados',
                    goal: '95',
                    typeGoal: 'porcentaje',
                    active: true,
                });

            expect(response.status).toBe(200);
        });

        it('returns 400 for an invalid departamentId hashid', async () => {
            const formula = await createFormulaFixture();
            const response = await request(app)
                .post('/api/indicators/createIndicator')
                .set('Authorization', `Bearer ${token}`)
                .send({ departamentId: 'not-a-hashid', formulaId: Utils.encode(formula.id), name: 'x' });

            expect(response.status).toBe(400);
            expect(response.body.error.code).toBe('AppError');
        });
    });

    describe('PUT/DELETE /api/indicators', () => {
        it('updates and deletes an indicator', async () => {
            const process = await createProcessFixture();
            const formula = await createFormulaFixture();
            const indicator = await createIndicatorFixture(process, formula);

            const updateResponse = await request(app)
                .put(`/api/indicators/updateIndicator/${Utils.encode(indicator.id)}`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    departamentId: Utils.encode(process.id),
                    formulaId: Utils.encode(formula.id),
                    name: 'Indicador actualizado',
                    subprocess: 'Nuevo subproceso',
                });
            expect(updateResponse.status).toBe(200);
            await indicator.reload();
            expect(indicator.name).toBe('Indicador actualizado');
            expect(indicator.subprocess).toBe('Nuevo subproceso');

            const deleteResponse = await request(app)
                .delete(`/api/indicators/${Utils.encode(indicator.id)}`)
                .set('Authorization', `Bearer ${token}`);
            expect(deleteResponse.status).toBe(200);
            expect(await Indicator.findByPk(indicator.id)).toBeNull();
        });
    });

    describe('Tabulations', () => {
        it('creates a tabulation evaluating the indicator formula and stores the period', async () => {
            const process = await createProcessFixture();
            const formula = await createFormulaFixture('(a/b)*100');
            const indicator = await createIndicatorFixture(process, formula);

            const response = await request(app)
                .post('/api/indicators/tabulations/createTabulation')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    indicatorId: Utils.encode(indicator.id),
                    a: 45,
                    b: 50,
                    periodMonth: 8,
                    periodYear: 2026,
                    observations: 'Corte de agosto',
                });

            expect(response.status).toBe(200);
            const created = await Tabulation.findOne({ where: { indicatorId: indicator.id } });
            expect(created).not.toBeNull();
            expect(created.percent).toBe(90);
            expect(created.periodMonth).toBe(8);
            expect(created.periodYear).toBe(2026);
        });

        it('returns the indicator with its tabulations ordered by most recent period first', async () => {
            const process = await createProcessFixture();
            const formula = await createFormulaFixture('(a/b)*100');
            const indicator = await createIndicatorFixture(process, formula);
            await Tabulation.create({ indicatorId: indicator.id, a: 10, b: 20, percent: 50, periodMonth: 5, periodYear: 2026 });
            await Tabulation.create({ indicatorId: indicator.id, a: 18, b: 20, percent: 90, periodMonth: 7, periodYear: 2026 });

            const response = await request(app)
                .get(`/api/indicators/tabulations/${Utils.encode(indicator.id)}`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.tabulations).toHaveLength(2);
            expect(response.body.tabulations[0].periodMonth).toBe(7);
        });
    });

    describe('Procesos (/api/procedures)', () => {
        it('creates, updates and deletes a process', async () => {
            const departament = await createDepartment();

            const createResponse = await request(app)
                .post('/api/procedures')
                .set('Authorization', `Bearer ${token}`)
                .send({ departamentId: Utils.encode(departament.id), name: 'Proceso de prueba' });
            expect(createResponse.status).toBe(200);

            const created = await Process.findOne({ where: { name: 'Proceso de prueba' } });
            expect(created).not.toBeNull();

            const updateResponse = await request(app)
                .put(`/api/procedures/${Utils.encode(created.id)}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ departamentId: Utils.encode(departament.id), name: 'Proceso renombrado' });
            expect(updateResponse.status).toBe(200);
            await created.reload();
            expect(created.name).toBe('Proceso renombrado');

            const deleteResponse = await request(app)
                .delete(`/api/procedures/${Utils.encode(created.id)}`)
                .set('Authorization', `Bearer ${token}`);
            expect(deleteResponse.status).toBe(200);
            expect(await Process.findByPk(created.id)).toBeNull();
        });

        it('lists processes with their departamento name', async () => {
            const process = await createProcessFixture();

            const response = await request(app)
                .get('/api/procedures')
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            const found = response.body.find((x) => x.id === Utils.encode(process.id));
            expect(found).toBeDefined();
            expect(found.departamento).toBeDefined();
        });

        it('returns 400 for an invalid proces_id hashid', async () => {
            const response = await request(app)
                .get('/api/procedures/not-a-hashid')
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(400);
            expect(response.body.error.code).toBe('AppError');
        });
    });
});
