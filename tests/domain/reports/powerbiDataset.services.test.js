const { bootTestApp, shutdownTestApp } = require('../../helpers/testApp');
const { createDepartment, createPosition, createCompanyWithYacht } = require('../../helpers/staffFixtures');
const Staff = require('../../../src/models/catalogs/staff.models');
const Form = require('../../../src/models/operations/surveys/form.models');
const FormQuestion = require('../../../src/models/operations/surveys/formQuestion.models');
const FormRespond = require('../../../src/models/operations/surveys/formRespond.models');
const FormAnswers = require('../../../src/models/operations/surveys/formAnswers.models');
const { getEvaluationsDatasetRows } = require('../../../src/services/reports/powerbiDataset.services');

let fixtureCounter = 0;
const suffix = () => {
    fixtureCounter += 1;
    return `${Date.now()}-${fixtureCounter}`;
};

beforeAll(async () => {
    await bootTestApp();
}, 60000);

afterAll(async () => {
    await shutdownTestApp();
});

describe('powerbiDataset.services getEvaluationsDatasetRows', () => {
    it('returns a flat row per evaluation with resolved cargo, capitalized yacht and typed answers', async () => {
        const caseSuffix = suffix();
        const { company } = await createCompanyWithYacht(`PBI Company ${caseSuffix}`, 'TIP TOP III');
        const departament = await createDepartment();
        const position = await createPosition(`Marinero ${caseSuffix}`);
        const evaluatedLastName = `Dataset${caseSuffix} Ramirez`;

        await Staff.create({
            firstName: 'Carla Ines',
            lastName: evaluatedLastName,
            email: `staff-dataset-${caseSuffix}@example.com`,
            cellPhone: '0911111111',
            password: 'Sup3rSecret!',
            departamentId: departament.id,
            positionId: position.id,
            contractType: 'Fijo',
            active: true,
        });

        const form = await Form.create({ name: `Form Dataset ${caseSuffix}`, positions: [] });
        const scaleQuestion = await FormQuestion.create({
            formId: form.id,
            title: 'Calificacion general',
            type: 'scale',
        });
        const respond = await FormRespond.create({
            companyId: company.id,
            formId: form.id,
            state: 'FINALIZADO',
            evaluator: 'Evaluador Dataset',
            evaluated: `Carla Ines ${evaluatedLastName}`,
            expirationDate: new Date('2026-08-01'),
        });
        await FormAnswers.create({ respuestaId: respond.id, questionId: scaleQuestion.id, answer: '5' });

        const rows = await getEvaluationsDatasetRows();
        const row = rows.find((r) => r.evaluado === `Carla Ines ${evaluatedLastName}`);

        expect(row).toBeDefined();
        expect(row.formulario).toBe(form.name);
        expect(row.evaluador).toBe('Evaluador Dataset');
        expect(row.cargo).toBe(position.name);
        expect(row.yate).toBe('Tip Top III');
        expect(row.estado).toBe('FINALIZADO');
        expect(row.pregunta1).toBe(5);
        expect(row.pregunta2).toBeNull();
        expect(typeof row.fecha).toBe('string');
    });

    it('uses "Sin Datos" for cargo when the evaluated name has no staff match', async () => {
        const caseSuffix = suffix();
        const { company } = await createCompanyWithYacht(`PBI NoCargo Company ${caseSuffix}`);
        const form = await Form.create({ name: `Form NoCargo ${caseSuffix}`, positions: [] });
        const question = await FormQuestion.create({ formId: form.id, title: 'Pregunta', type: 'text' });
        await FormRespond.create({
            companyId: company.id,
            formId: form.id,
            state: 'Pendiente',
            evaluator: 'Evaluador X',
            evaluated: `Persona SinCargo${caseSuffix} Ficticia`,
            expirationDate: new Date('2026-08-01'),
        });

        const rows = await getEvaluationsDatasetRows();
        const row = rows.find((r) => r.evaluado === `Persona SinCargo${caseSuffix} Ficticia`);

        expect(row).toBeDefined();
        expect(row.cargo).toBe('Sin Datos');
    });
});
