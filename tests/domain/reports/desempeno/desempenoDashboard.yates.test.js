const { bootTestApp, shutdownTestApp } = require('../../../helpers/testApp');
const { createCompanyWithYacht } = require('../../../helpers/staffFixtures');
const { setUpdatedAt } = require('../../../helpers/dateFixtures');
const Form = require('../../../../src/models/operations/surveys/form.models');
const FormQuestion = require('../../../../src/models/operations/surveys/formQuestion.models');
const FormRespond = require('../../../../src/models/operations/surveys/formRespond.models');
const FormAnswers = require('../../../../src/models/operations/surveys/formAnswers.models');
const { getYates } = require('../../../../src/services/reports/desempenoDashboard.services');

beforeAll(async () => {
    await bootTestApp();
}, 60000);

afterAll(async () => {
    await shutdownTestApp();
});

describe('desempenoDashboard.services getYates', () => {
    it('returns per-yate averages and filters the scoped kpis by yate', async () => {
        const { company: companyA } = await createCompanyWithYacht('Yates Co A', 'Yacht Alpha');
        const { company: companyB } = await createCompanyWithYacht('Yates Co B', 'Yacht Beta');
        const form = await Form.create({ name: 'Form Yates', positions: [] });
        const question = await FormQuestion.create({ formId: form.id, title: 'Pregunta 1', type: 'scale' });

        const respondA = await FormRespond.create({
            companyId: companyA.id, formId: form.id, state: 'Completada',
            evaluator: 'Eval A', evaluated: 'Evaluado A', expirationDate: new Date('2025-05-01'),
        });
        await setUpdatedAt('form_responds', respondA.id, '2025-05-01T12:00:00');
        await FormAnswers.create({ respuestaId: respondA.id, questionId: question.id, answer: '5' });

        const respondB = await FormRespond.create({
            companyId: companyB.id, formId: form.id, state: 'Completada',
            evaluator: 'Eval B', evaluated: 'Evaluado B', expirationDate: new Date('2025-05-01'),
        });
        await setUpdatedAt('form_responds', respondB.id, '2025-05-01T12:00:00');
        await FormAnswers.create({ respuestaId: respondB.id, questionId: question.id, answer: '3' });

        const result = await getYates('Yacht Alpha');

        const alphaAvg = result.avgByYate.find((y) => y.yate === 'Yacht Alpha');
        const betaAvg = result.avgByYate.find((y) => y.yate === 'Yacht Beta');
        expect(alphaAvg.calificacion).toBe(5);
        expect(betaAvg.calificacion).toBe(3);
        expect(result.kpis.calificacion).toBe(5); // scoped to Yacht Alpha only
        expect(result.kpis.completadas).toBe(1);

        const competenciaIndex = result.radar.competencias.indexOf('Pregunta 1');
        expect(competenciaIndex).toBeGreaterThanOrEqual(0);

        const alphaRadar = result.radar.series.find((s) => s.yate === 'Yacht Alpha');
        const betaRadar = result.radar.series.find((s) => s.yate === 'Yacht Beta');
        expect(alphaRadar.valores[competenciaIndex]).toBe(5);
        expect(betaRadar.valores[competenciaIndex]).toBe(3);
    });

    it('scopes kpis, avgByYate and radar by anio, and reports kpisByYear per yate', async () => {
        const { company } = await createCompanyWithYacht('Yates Co Anio', 'Yacht Gamma');
        const form = await Form.create({ name: 'Form Yates Anio', positions: [] });
        const question = await FormQuestion.create({ formId: form.id, title: 'Pregunta 1', type: 'scale' });

        const respond2024 = await FormRespond.create({
            companyId: company.id, formId: form.id, state: 'Completada',
            evaluator: 'Eval Gamma', evaluated: 'Evaluado Gamma', expirationDate: new Date('2024-06-01'),
        });
        await setUpdatedAt('form_responds', respond2024.id, '2024-06-01T12:00:00');
        await FormAnswers.create({ respuestaId: respond2024.id, questionId: question.id, answer: '2' });

        const respond2025 = await FormRespond.create({
            companyId: company.id, formId: form.id, state: 'Completada',
            evaluator: 'Eval Gamma', evaluated: 'Evaluado Gamma', expirationDate: new Date('2025-06-01'),
        });
        await setUpdatedAt('form_responds', respond2025.id, '2025-06-01T12:00:00');
        await FormAnswers.create({ respuestaId: respond2025.id, questionId: question.id, answer: '5' });

        const result = await getYates('Yacht Gamma', '2025');

        expect(result.kpis.calificacion).toBe(5); // only 2025 counted
        expect(result.avgByYate.find((y) => y.yate === 'Yacht Gamma').calificacion).toBe(5);

        const kpi2024 = result.kpisByYear.find((k) => k.year === 2024);
        const kpi2025 = result.kpisByYear.find((k) => k.year === 2025);
        expect(kpi2024.calificacion).toBe(2);
        expect(kpi2025.calificacion).toBe(5);
    });
});
