const { bootTestApp, shutdownTestApp } = require('../../../helpers/testApp');
const { createCompanyWithYacht } = require('../../../helpers/staffFixtures');
const { setUpdatedAt } = require('../../../helpers/dateFixtures');
const Form = require('../../../../src/models/operations/surveys/form.models');
const FormQuestion = require('../../../../src/models/operations/surveys/formQuestion.models');
const FormRespond = require('../../../../src/models/operations/surveys/formRespond.models');
const FormAnswers = require('../../../../src/models/operations/surveys/formAnswers.models');
const { getPersonas } = require('../../../../src/services/reports/desempenoDashboard.services');

beforeAll(async () => {
    await bootTestApp();
}, 60000);

afterAll(async () => {
    await shutdownTestApp();
});

describe('desempenoDashboard.services getPersonas', () => {
    it('groups calificación by evaluado/mes, compliance by evaluador/mes, and collects free-text comments', async () => {
        const caseSuffix = `${Date.now()}`;
        const { company } = await createCompanyWithYacht(`Personas Co ${caseSuffix}`);
        const form = await Form.create({ name: `Form Personas ${caseSuffix}`, positions: [] });
        const scaleQuestion = await FormQuestion.create({ formId: form.id, title: 'Pregunta 1', type: 'scale' });
        const commentQuestion = await FormQuestion.create({ formId: form.id, title: 'Pregunta 10', type: 'text' });

        const respond = await FormRespond.create({
            companyId: company.id, formId: form.id, state: 'Completada',
            evaluator: `Evaluador Personas ${caseSuffix}`, evaluated: `Evaluado Personas ${caseSuffix}`,
            expirationDate: new Date('2025-06-01'),
        });
        await setUpdatedAt('form_responds', respond.id, '2025-06-15T12:00:00');
        await FormAnswers.create({ respuestaId: respond.id, questionId: scaleQuestion.id, answer: '4' });
        await FormAnswers.create({ respuestaId: respond.id, questionId: commentQuestion.id, answer: 'Buen desempeño este mes.' });

        const caducada = await FormRespond.create({
            companyId: company.id, formId: form.id, state: 'Caducada',
            evaluator: `Evaluador Personas ${caseSuffix}`, evaluated: `Evaluado Personas 2 ${caseSuffix}`,
            expirationDate: new Date('2025-06-01'),
        });
        await setUpdatedAt('form_responds', caducada.id, '2025-06-20T12:00:00');

        const result = await getPersonas({ anio: 2025 });

        const evaluadoRow = result.porEvaluado.find((r) => r.evaluado === `Evaluado Personas ${caseSuffix}`);
        expect(evaluadoRow.total).toBe(4);
        expect(evaluadoRow.porMes.find((m) => m.monthIndex === 6).valor).toBe(4);

        const evaluadorRow = result.porEvaluadorMensual.find((r) => r.evaluador === `Evaluador Personas ${caseSuffix}`);
        expect(evaluadorRow.total).toBe(50); // 1 completada + 1 caducada

        expect(result.comentarios).toContainEqual({
            evaluado: `Evaluado Personas ${caseSuffix}`,
            evaluador: `Evaluador Personas ${caseSuffix}`,
            texto: 'Buen desempeño este mes.',
        });
    });
});
