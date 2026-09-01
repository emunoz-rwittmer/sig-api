const { bootTestApp, shutdownTestApp } = require('../../../helpers/testApp');
const { createCompanyWithYacht, createDepartment, createPosition } = require('../../../helpers/staffFixtures');
const { setUpdatedAt } = require('../../../helpers/dateFixtures');
const Form = require('../../../../src/models/operations/surveys/form.models');
const FormQuestion = require('../../../../src/models/operations/surveys/formQuestion.models');
const FormRespond = require('../../../../src/models/operations/surveys/formRespond.models');
const FormAnswers = require('../../../../src/models/operations/surveys/formAnswers.models');
const Staff = require('../../../../src/models/catalogs/staff.models');
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

        const evaluadorTrimestreRow = result.porEvaluadorTrimestre.find((r) => r.evaluador === `Evaluador Personas ${caseSuffix}`);
        expect(evaluadorTrimestreRow.total).toBe(4); // calificación (score), not compliance %
        expect(evaluadorTrimestreRow.porTrimestre.find((t) => t.trimestre === 'Q2').valor).toBe(4);

        expect(result.comentarios).toContainEqual({
            evaluado: `Evaluado Personas ${caseSuffix}`,
            evaluador: `Evaluador Personas ${caseSuffix}`,
            texto: 'Buen desempeño este mes.',
        });
    });

    it('returns kpisByYear, kpis with max/min, and per-yate breakdowns scoped to the current filter', async () => {
        const caseSuffix = `${Date.now()}`;
        const yachtName = `Personas Kpi Yacht ${caseSuffix}`;
        const { company } = await createCompanyWithYacht(`Personas Kpi Co ${caseSuffix}`, yachtName);
        const form = await Form.create({ name: `Form Personas Kpi ${caseSuffix}`, positions: [] });
        const question = await FormQuestion.create({ formId: form.id, title: 'Pregunta 1', type: 'scale' });

        const high = await FormRespond.create({
            companyId: company.id, formId: form.id, state: 'Completada',
            evaluator: `Evaluador Kpi ${caseSuffix}`, evaluated: `Evaluado Kpi Alto ${caseSuffix}`,
            expirationDate: new Date('2025-08-01'),
        });
        await setUpdatedAt('form_responds', high.id, '2025-08-05T12:00:00');
        await FormAnswers.create({ respuestaId: high.id, questionId: question.id, answer: '5' });

        const low = await FormRespond.create({
            companyId: company.id, formId: form.id, state: 'Completada',
            evaluator: `Evaluador Kpi ${caseSuffix}`, evaluated: `Evaluado Kpi Bajo ${caseSuffix}`,
            expirationDate: new Date('2025-08-01'),
        });
        await setUpdatedAt('form_responds', low.id, '2025-08-10T12:00:00');
        await FormAnswers.create({ respuestaId: low.id, questionId: question.id, answer: '2' });

        const result = await getPersonas({ yate: yachtName, anio: 2025 });
        const year2025 = result.kpisByYear.find((k) => k.year === 2025);

        expect(year2025.calificacion).toBe(3.5);
        expect(result.kpis.calificacionMax).toBe(5);
        expect(result.kpis.calificacionMin).toBe(2);
        expect(result.avgByYate.find((y) => y.yate === yachtName).calificacion).toBe(3.5);
        expect(result.monthlyCalificacionByYate.find((y) => y.yate === yachtName)).toBeDefined();
    });

    it('filters by area (departamento) resolved from the evaluado staff record', async () => {
        const caseSuffix = `${Date.now()}`;
        const { company } = await createCompanyWithYacht(`Personas Area Co ${caseSuffix}`);
        const department = await createDepartment(`Cubierta ${caseSuffix}`);
        const position = await createPosition(`Marinero ${caseSuffix}`);
        const firstName = `AreaFN${caseSuffix}`;
        const lastName = 'Perez Lopez';
        await Staff.create({
            firstName,
            lastName,
            email: `area-test-${caseSuffix}@example.com`,
            cellPhone: '0966666666',
            password: 'Sup3rSecret!',
            departamentId: department.id,
            positionId: position.id,
            contractType: 'Fijo',
            active: true,
        });
        const evaluatedFullName = `${firstName} ${lastName}`;

        const form = await Form.create({ name: `Form Personas Area ${caseSuffix}`, positions: [] });
        const question = await FormQuestion.create({ formId: form.id, title: 'Pregunta 1', type: 'scale' });
        const respond = await FormRespond.create({
            companyId: company.id, formId: form.id, state: 'Completada',
            evaluator: `Evaluador Area ${caseSuffix}`, evaluated: evaluatedFullName,
            expirationDate: new Date('2025-07-01'),
        });
        await setUpdatedAt('form_responds', respond.id, '2025-07-05T12:00:00');
        await FormAnswers.create({ respuestaId: respond.id, questionId: question.id, answer: '5' });

        const matched = await getPersonas({ area: department.name, anio: 2025 });
        const unmatched = await getPersonas({ area: 'Area Que No Existe', anio: 2025 });

        expect(matched.porEvaluado.some((p) => p.evaluado === evaluatedFullName)).toBe(true);
        expect(unmatched.porEvaluado.some((p) => p.evaluado === evaluatedFullName)).toBe(false);
    });
});
