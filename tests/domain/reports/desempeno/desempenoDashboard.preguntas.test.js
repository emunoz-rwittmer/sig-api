const { bootTestApp, shutdownTestApp } = require('../../../helpers/testApp');
const { createCompanyWithYacht, createDepartment, createPosition } = require('../../../helpers/staffFixtures');
const { setUpdatedAt } = require('../../../helpers/dateFixtures');
const Form = require('../../../../src/models/operations/surveys/form.models');
const FormQuestion = require('../../../../src/models/operations/surveys/formQuestion.models');
const FormRespond = require('../../../../src/models/operations/surveys/formRespond.models');
const FormAnswers = require('../../../../src/models/operations/surveys/formAnswers.models');
const Staff = require('../../../../src/models/catalogs/staff.models');
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

    it('includes year on porMes rows and breaks calificación down by función×mes via porFuncionMes', async () => {
        const caseSuffix = `${Date.now()}`;
        const { company } = await createCompanyWithYacht(`Preguntas FuncionMes Co ${caseSuffix}`);
        const department = await createDepartment(`Cubierta ${caseSuffix}`);
        const position = await createPosition(`Capitan ${caseSuffix}`);
        const firstName = `Pfm${caseSuffix}`;
        const lastName = 'Rios Vera';
        await Staff.create({
            firstName,
            lastName,
            email: `pfm-test-${caseSuffix}@example.com`,
            cellPhone: '0966666666',
            password: 'Sup3rSecret!',
            departamentId: department.id,
            positionId: position.id,
            contractType: 'Fijo',
            active: true,
        });
        const evaluatedFullName = `${firstName} ${lastName}`;

        const form = await Form.create({ name: `Form Preguntas FuncionMes ${caseSuffix}`, positions: [] });
        const question = await FormQuestion.create({ formId: form.id, title: 'Liderazgo', type: 'scale' });
        const respond = await FormRespond.create({
            companyId: company.id, formId: form.id, state: 'Completada',
            evaluator: `Evaluador FuncionMes ${caseSuffix}`, evaluated: evaluatedFullName,
            expirationDate: new Date('2025-09-01'),
        });
        await setUpdatedAt('form_responds', respond.id, '2025-09-10T12:00:00');
        await FormAnswers.create({ respuestaId: respond.id, questionId: question.id, answer: '4' });

        const result = await getPreguntas({ anio: 2025 });

        const septiembreRow = result.porMes.find((m) => m.year === 2025 && m.monthIndex === 9);
        expect(septiembreRow).toBeDefined();

        const funcionRow = result.porFuncionMes.find((f) => f.funcion === position.name);
        expect(funcionRow).toBeDefined();
        const funcionSeptiembre = funcionRow.porMes.find((m) => m.year === 2025 && m.monthIndex === 9);
        expect(funcionSeptiembre.valores.find((v) => v.etiqueta === 'Liderazgo').valor).toBe(4);
    });
});
