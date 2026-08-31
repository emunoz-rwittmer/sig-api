const { bootTestApp, shutdownTestApp } = require('../../../helpers/testApp');
const { createCompanyWithYacht } = require('../../../helpers/staffFixtures');
const Form = require('../../../../src/models/operations/surveys/form.models');
const FormQuestion = require('../../../../src/models/operations/surveys/formQuestion.models');
const FormRespond = require('../../../../src/models/operations/surveys/formRespond.models');
const FormAnswers = require('../../../../src/models/operations/surveys/formAnswers.models');
const { getOverview } = require('../../../../src/services/reports/desempenoDashboard.services');

beforeAll(async () => {
    await bootTestApp();
}, 60000);

afterAll(async () => {
    await shutdownTestApp();
});

describe('desempenoDashboard.services getOverview', () => {
    it('computes compliance % and average calificación per year from real evaluation rows', async () => {
        const { company } = await createCompanyWithYacht('Overview Test Co', 'Overview Yacht');
        const form = await Form.create({ name: 'Form Overview', positions: [] });
        const question = await FormQuestion.create({ formId: form.id, title: 'Pregunta 1', type: 'scale' });

        const completada = await FormRespond.create({
            companyId: company.id,
            formId: form.id,
            state: 'Completada',
            evaluator: 'Eval Overview',
            evaluated: 'Evaluado Overview',
            expirationDate: new Date('2025-01-15'),
        });
        await completada.update({ updatedAt: new Date('2025-01-10') }, { silent: true });
        await FormAnswers.create({ respuestaId: completada.id, questionId: question.id, answer: '5' });

        const caducada = await FormRespond.create({
            companyId: company.id,
            formId: form.id,
            state: 'Caducada',
            evaluator: 'Eval Overview',
            evaluated: 'Evaluado Overview 2',
            expirationDate: new Date('2025-01-20'),
        });
        await caducada.update({ updatedAt: new Date('2025-01-12') }, { silent: true });

        const result = await getOverview();
        const year2025 = result.kpisByYear.find((k) => k.year === 2025);

        expect(year2025).toBeDefined();
        expect(year2025.completadas).toBeGreaterThanOrEqual(1);
        expect(year2025.caducadas).toBeGreaterThanOrEqual(1);
        expect(year2025.compliancePercent).toBe(Math.round((year2025.completadas / (year2025.completadas + year2025.caducadas)) * 100));

        const series2025 = result.monthlyCalificacion.series.find((s) => s.name === '2025');
        expect(series2025).toBeDefined();
        expect(series2025.data[0]).not.toBeNull(); // enero, 1-indexed monthIndex -> array index 0
    });

    it('filters by yate when provided', async () => {
        const { company } = await createCompanyWithYacht('Overview Filter Co', 'Filtered Yacht Overview');
        const form = await Form.create({ name: 'Form Overview Filter', positions: [] });
        const respond = await FormRespond.create({
            companyId: company.id,
            formId: form.id,
            state: 'Completada',
            evaluator: 'Eval Filter',
            evaluated: 'Evaluado Filter',
            expirationDate: new Date('2025-03-01'),
        });
        await respond.update({ updatedAt: new Date('2025-03-01') }, { silent: true });

        const matched = await getOverview('Filtered Yacht Overview');
        const unmatched = await getOverview('Yacht That Does Not Exist');

        expect(matched.years).toContain(2025);
        expect(unmatched.years).not.toContain(2025);
    });
});
