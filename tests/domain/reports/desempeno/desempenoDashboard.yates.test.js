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
    });
});
