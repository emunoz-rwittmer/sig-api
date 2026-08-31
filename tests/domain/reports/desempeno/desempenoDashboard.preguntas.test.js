const { bootTestApp, shutdownTestApp } = require('../../../helpers/testApp');
const { createCompanyWithYacht } = require('../../../helpers/staffFixtures');
const { setUpdatedAt } = require('../../../helpers/dateFixtures');
const Form = require('../../../../src/models/operations/surveys/form.models');
const FormQuestion = require('../../../../src/models/operations/surveys/formQuestion.models');
const FormRespond = require('../../../../src/models/operations/surveys/formRespond.models');
const FormAnswers = require('../../../../src/models/operations/surveys/formAnswers.models');
const { getPreguntas } = require('../../../../src/services/reports/desempenoDashboard.services');

beforeAll(async () => {
    await bootTestApp();
}, 60000);

afterAll(async () => {
    await shutdownTestApp();
});

describe('desempenoDashboard.services getPreguntas', () => {
    it('breaks calificación down per competencia using the real FormQuestion titles, excluding free-text answers', async () => {
        const caseSuffix = `${Date.now()}`;
        const { company } = await createCompanyWithYacht(`Preguntas Co ${caseSuffix}`);
        const form = await Form.create({ name: `Form Preguntas ${caseSuffix}`, positions: [] });
        const competenciaQuestion = await FormQuestion.create({ formId: form.id, title: 'Comunicación Clara', type: 'scale' });
        const commentQuestion = await FormQuestion.create({ formId: form.id, title: 'Comentarios', type: 'text' });

        const respond = await FormRespond.create({
            companyId: company.id, formId: form.id, state: 'Completada',
            evaluator: `Evaluador Preguntas ${caseSuffix}`, evaluated: `Evaluado Preguntas ${caseSuffix}`,
            expirationDate: new Date('2025-04-01'),
        });
        await setUpdatedAt('form_responds', respond.id, '2025-04-05T12:00:00');
        await FormAnswers.create({ respuestaId: respond.id, questionId: competenciaQuestion.id, answer: '4' });
        await FormAnswers.create({ respuestaId: respond.id, questionId: commentQuestion.id, answer: 'Todo bien.' });

        const result = await getPreguntas({ anio: 2025 });

        expect(result.competencias).toContain('Comunicación Clara');
        expect(result.competencias).not.toContain('Comentarios');

        const abrilRow = result.porMes.find((m) => m.monthIndex === 4);
        const comunicacionValor = abrilRow.valores.find((v) => v.etiqueta === 'Comunicación Clara').valor;
        expect(comunicacionValor).toBe(4);

        const evaluadorRow = result.porEvaluador.find((r) => r.evaluador === `Evaluador Preguntas ${caseSuffix}`);
        expect(evaluadorRow.calificacion).toBe(4);
        expect(evaluadorRow.valores.find((v) => v.etiqueta === 'Comunicación Clara').valor).toBe(4);
    });
});
