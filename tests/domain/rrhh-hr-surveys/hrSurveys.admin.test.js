const request = require('supertest');
const { bootTestApp, shutdownTestApp } = require('../../helpers/testApp');
const { createAuthenticatedUser, TEST_USER } = require('../../helpers/auth');
const { createDepartment, createPosition } = require('../../helpers/staffFixtures');
const Staff = require('../../../src/models/catalogs/staff.models');
const Roles = require('../../../src/models/catalogs/roles.models');
const Users = require('../../../src/models/catalogs/user.models');
const HrSurvey = require('../../../src/models/rrhh/hrSurvey.models');
const HrSurveyQuestion = require('../../../src/models/rrhh/hrSurveyQuestion.models');
const HrSurveyOption = require('../../../src/models/rrhh/hrSurveyOption.models');
const HrSurveyDepartament = require('../../../src/models/rrhh/hrSurveyDepartament.models');
const HrSurveyParticipation = require('../../../src/models/rrhh/hrSurveyParticipation.models');
const HrSurveyResponse = require('../../../src/models/rrhh/hrSurveyResponse.models');
const Utils = require('../../../src/utils/Utils');

let app;
let adminToken;

beforeAll(async () => {
    app = await bootTestApp();
    adminToken = await createAuthenticatedUser(app);
}, 60000);

afterAll(async () => {
    await shutdownTestApp();
});

const auth = (token = adminToken) => ({ Authorization: `Bearer ${token}` });

let staffCounter = 0;
async function createStaffFixture(departament, overrides = {}) {
    const position = await createPosition();
    staffCounter += 1;
    const suffix = `${Date.now()}-${staffCounter}-${Math.floor(Math.random() * 1e6)}`;
    return Staff.create({
        firstName: 'TEST_AUTOMATED',
        lastName: `HrSurveys${suffix}`,
        email: `hs-${staffCounter}-${Date.now()}@example.com`,
        cellPhone: '0966666666',
        password: 'Sup3rSecret!',
        departamentId: departament.id,
        positionId: position.id,
        contractType: 'Fijo',
        active: true,
        ...overrides,
    });
}

const validQuestions = () => [
    {
        statement: '¿Cómo calificas el clima laboral?',
        type: 'opcion multiple',
        required: true,
        options: [{ text: 'Bueno', score: 5 }, { text: 'Malo', score: 1 }],
    },
    { statement: 'Satisfacción general', type: 'scale', required: true, scaleMin: 1, scaleMax: 5 },
];

const validPayload = (departamentIds, overrides = {}) => ({
    name: 'Clima laboral',
    description: 'Encuesta anónima',
    startsAt: '2020-01-01',
    endsAt: '2099-12-31',
    active: true,
    departamentIds,
    questions: validQuestions(),
    ...overrides,
});

// Crea una encuesta publicada con una respuesta sembrada directamente en BD.
async function createSurveyWithResponse() {
    const departament = await createDepartment('Con respuestas');
    const response = await request(app)
        .post('/api/hr-surveys')
        .set(auth())
        .send(validPayload([Utils.encode(departament.id)]));
    expect(response.status).toBe(201);
    const surveyId = Utils.decode(response.body.surveyId);

    const staff = await createStaffFixture(departament);
    await HrSurveyParticipation.create({ surveyId, staffId: staff.id, departamentId: departament.id });
    await HrSurveyResponse.create({ surveyId, departamentId: departament.id });
    return { surveyHash: response.body.surveyId, surveyId, departament };
}

describe('HR surveys admin', () => {
    it('creates an incomplete draft', async () => {
        const response = await request(app).post('/api/hr-surveys').set(auth()).send({ name: 'Borrador' });
        expect(response.status).toBe(201);
        expect(response.body.surveyId).toBeTruthy();

        const survey = await HrSurvey.findByPk(Utils.decode(response.body.surveyId));
        expect(survey.active).toBe(false);
    });

    it('rejects a draft without a name', async () => {
        const response = await request(app).post('/api/hr-surveys').set(auth()).send({ description: 'x' });
        expect(response.status).toBe(400);
    });

    it('rejects publishing without departaments', async () => {
        const response = await request(app)
            .post('/api/hr-surveys')
            .set(auth())
            .send(validPayload([]));
        expect(response.status).toBe(400);
        expect(response.body.message ?? response.body.data ?? JSON.stringify(response.body)).toMatch(/departamento/i);
    });

    it('does not publish an incomplete draft with a bare { active: true }', async () => {
        const created = await request(app).post('/api/hr-surveys').set(auth()).send({ name: 'Incompleto' });
        const response = await request(app)
            .put(`/api/hr-surveys/${created.body.surveyId}`)
            .set(auth())
            .send({ active: true });
        expect(response.status).toBe(400);
    });

    it('stores null dates for a dateless draft', async () => {
        const created = await request(app).post('/api/hr-surveys').set(auth()).send({ name: 'Sin fechas' });
        expect(created.status).toBe(201);
        const survey = await HrSurvey.findByPk(Utils.decode(created.body.surveyId));
        expect(survey.startsAt).toBeNull();
        expect(survey.endsAt).toBeNull();
    });

    it('refuses to publish a dateless draft', async () => {
        const created = await request(app).post('/api/hr-surveys').set(auth()).send({ name: 'Sin fechas' });
        const response = await request(app)
            .put(`/api/hr-surveys/${created.body.surveyId}`).set(auth()).send({ active: true });
        expect(response.status).toBe(400);
    });

    it('refuses to publish a draft whose endsAt already passed', async () => {
        const departament = await createDepartment('Cierre pasado');
        const created = await request(app)
            .post('/api/hr-surveys')
            .set(auth())
            .send(validPayload([Utils.encode(departament.id)], { active: false, startsAt: '2020-01-01', endsAt: '2020-02-01' }));
        expect(created.status).toBe(201);
        const response = await request(app)
            .put(`/api/hr-surveys/${created.body.surveyId}`).set(auth()).send({ active: true });
        expect(response.status).toBe(400);
        expect(JSON.stringify(response.body)).toMatch(/ya pas/i);
    });

    it('clears the dates of an unlocked draft when null is sent', async () => {
        const departament = await createDepartment('Limpiar fechas');
        const created = await request(app)
            .post('/api/hr-surveys')
            .set(auth())
            .send(validPayload([Utils.encode(departament.id)], { active: false }));
        const response = await request(app)
            .put(`/api/hr-surveys/${created.body.surveyId}`).set(auth()).send({ startsAt: null, endsAt: '' });
        expect(response.status).toBe(200);
        const survey = await HrSurvey.findByPk(Utils.decode(created.body.surveyId));
        expect(survey.startsAt).toBeNull();
        expect(survey.endsAt).toBeNull();
    });

    it('lists an open survey with the active staff of its departament as assigned', async () => {
        const departament = await createDepartment('Asignados');
        await createStaffFixture(departament);
        await createStaffFixture(departament);
        await createStaffFixture(departament, { active: false });

        const created = await request(app)
            .post('/api/hr-surveys')
            .set(auth())
            .send(validPayload([Utils.encode(departament.id)], { name: 'Listada' }));
        expect(created.status).toBe(201);

        const list = await request(app).get('/api/hr-surveys').set(auth());
        expect(list.status).toBe(200);
        const entry = list.body.find((survey) => survey.id === created.body.surveyId);
        expect(entry).toMatchObject({ name: 'Listada', status: 'open', active: true, responded: 0, assigned: 2 });
        expect(entry.departaments).toEqual([{ id: expect.any(String), name: 'Asignados' }]);
        expect(entry.departaments[0].id).toBe(Utils.encode(departament.id));
    });

    it('counts responded plus pending active staff as assigned', async () => {
        const departament = await createDepartment('Mixto');
        const respondent = await createStaffFixture(departament);
        await createStaffFixture(departament);

        const created = await request(app)
            .post('/api/hr-surveys')
            .set(auth())
            .send(validPayload([Utils.encode(departament.id)], { name: 'Mixta' }));
        const surveyId = Utils.decode(created.body.surveyId);
        await HrSurveyParticipation.create({ surveyId, staffId: respondent.id, departamentId: departament.id });
        await HrSurveyResponse.create({ surveyId, departamentId: departament.id });

        const list = await request(app).get('/api/hr-surveys').set(auth());
        const entry = list.body.find((survey) => survey.id === created.body.surveyId);
        expect(entry).toMatchObject({ responded: 1, assigned: 2 });
    });

    it('returns the detail with hashed ids, ordered questions and numeric scores', async () => {
        const departament = await createDepartment('Detalle');
        const created = await request(app)
            .post('/api/hr-surveys')
            .set(auth())
            .send(validPayload([Utils.encode(departament.id)], { name: 'Detalle' }));

        const response = await request(app).get(`/api/hr-surveys/${created.body.surveyId}`).set(auth());
        expect(response.status).toBe(200);
        expect(response.body.id).toBe(created.body.surveyId);
        expect(response.body.status).toBe('open');
        expect(response.body.questions.map((q) => q.type)).toEqual(['opcion multiple', 'scale']);
        expect(response.body.questions[0].options.map((o) => o.score)).toEqual([5, 1]);
        expect(response.body.departaments[0].id).toBe(Utils.encode(departament.id));
    });

    it('rejects score changes once the survey has responses', async () => {
        const { surveyHash, departament } = await createSurveyWithResponse();
        const questions = validQuestions();
        questions[0].options[0].score = 4;

        const response = await request(app)
            .put(`/api/hr-surveys/${surveyHash}`)
            .set(auth())
            .send(validPayload([Utils.encode(departament.id)], { questions }));
        expect(response.status).toBe(400);
        expect(JSON.stringify(response.body)).toContain('La encuesta ya tiene respuestas');
    });

    it('accepts an unchanged payload with a new name and endsAt once the survey has responses', async () => {
        const { surveyHash, surveyId, departament } = await createSurveyWithResponse();

        const response = await request(app)
            .put(`/api/hr-surveys/${surveyHash}`)
            .set(auth())
            .send(validPayload([Utils.encode(departament.id)], {
                name: 'Nuevo nombre',
                description: 'Nueva descripción',
                endsAt: '2098-06-30',
            }));
        expect(response.status).toBe(200);

        const survey = await HrSurvey.findByPk(surveyId);
        expect(survey.name).toBe('Nuevo nombre');
        expect(survey.endsAt).toBe('2098-06-30');
        expect(await HrSurveyQuestion.count({ where: { surveyId } })).toBe(2);
    });

    it('rejects changing startsAt or active once the survey has responses', async () => {
        const { surveyHash, departament } = await createSurveyWithResponse();
        const ids = [Utils.encode(departament.id)];

        const startsAt = await request(app)
            .put(`/api/hr-surveys/${surveyHash}`).set(auth()).send(validPayload(ids, { startsAt: '2021-01-01' }));
        expect(startsAt.status).toBe(400);

        const active = await request(app)
            .put(`/api/hr-surveys/${surveyHash}`).set(auth()).send(validPayload(ids, { active: false }));
        expect(active.status).toBe(400);
    });

    it('rejects an endsAt earlier than startsAt once the survey has responses', async () => {
        const { surveyHash, departament } = await createSurveyWithResponse();
        const response = await request(app)
            .put(`/api/hr-surveys/${surveyHash}`)
            .set(auth())
            .send(validPayload([Utils.encode(departament.id)], { endsAt: '2019-12-31' }));
        expect(response.status).toBe(400);
    });

    it('rejects an invalid endsAt once the survey has responses', async () => {
        const { surveyHash, departament } = await createSurveyWithResponse();
        const response = await request(app)
            .put(`/api/hr-surveys/${surveyHash}`)
            .set(auth())
            .send(validPayload([Utils.encode(departament.id)], { endsAt: 'garbage' }));
        expect(response.status).toBe(400);
    });

    it('rejects clearing startsAt once the survey has responses', async () => {
        const { surveyHash } = await createSurveyWithResponse();
        const response = await request(app)
            .put(`/api/hr-surveys/${surveyHash}`).set(auth()).send({ startsAt: null });
        expect(response.status).toBe(400);
    });

    it('rejects removing a departament once the survey has responses, but allows adding one', async () => {
        const { surveyHash, surveyId, departament } = await createSurveyWithResponse();
        const extra = await createDepartment('Extra');

        const removal = await request(app)
            .put(`/api/hr-surveys/${surveyHash}`)
            .set(auth())
            .send(validPayload([Utils.encode(extra.id)]));
        expect(removal.status).toBe(400);

        const addition = await request(app)
            .put(`/api/hr-surveys/${surveyHash}`)
            .set(auth())
            .send(validPayload([Utils.encode(departament.id), Utils.encode(extra.id)]));
        expect(addition.status).toBe(200);
        expect(await HrSurveyDepartament.count({ where: { surveyId } })).toBe(2);
    });

    it('refuses to delete a survey with responses', async () => {
        const { surveyHash, surveyId } = await createSurveyWithResponse();
        const response = await request(app).delete(`/api/hr-surveys/${surveyHash}`).set(auth());
        expect(response.status).toBe(400);
        expect(await HrSurvey.findByPk(surveyId)).not.toBeNull();
    });

    it('deletes a survey without responses and cascades to its children', async () => {
        const departament = await createDepartment('Borrar');
        const created = await request(app)
            .post('/api/hr-surveys')
            .set(auth())
            .send(validPayload([Utils.encode(departament.id)], { name: 'Borrable' }));
        const surveyId = Utils.decode(created.body.surveyId);
        const questionIds = (await HrSurveyQuestion.findAll({ where: { surveyId } })).map((q) => q.id);
        expect(questionIds).toHaveLength(2);

        const response = await request(app).delete(`/api/hr-surveys/${created.body.surveyId}`).set(auth());
        expect(response.status).toBe(200);

        expect(await HrSurvey.findByPk(surveyId)).toBeNull();
        expect(await HrSurveyQuestion.count({ where: { surveyId } })).toBe(0);
        expect(await HrSurveyOption.count({ where: { questionId: questionIds } })).toBe(0);
        expect(await HrSurveyDepartament.count({ where: { surveyId } })).toBe(0);
    });

    it('replaces questions on a survey without responses', async () => {
        const departament = await createDepartment('Reemplazo');
        const created = await request(app)
            .post('/api/hr-surveys')
            .set(auth())
            .send(validPayload([Utils.encode(departament.id)], { name: 'Reemplazable' }));
        const surveyId = Utils.decode(created.body.surveyId);
        const oldQuestionIds = (await HrSurveyQuestion.findAll({ where: { surveyId } })).map((q) => q.id);

        const response = await request(app)
            .put(`/api/hr-surveys/${created.body.surveyId}`)
            .set(auth())
            .send({ questions: [{ statement: 'Solo una', type: 'texto', required: false }] });
        expect(response.status).toBe(200);
        const questions = await HrSurveyQuestion.findAll({ where: { surveyId } });
        expect(questions).toHaveLength(1);
        expect(await HrSurveyOption.count({ where: { questionId: oldQuestionIds } })).toBe(0);
    });

    it('returns 404 for an unknown survey', async () => {
        const response = await request(app).get(`/api/hr-surveys/${Utils.encode(999999)}`).set(auth());
        expect(response.status).toBe(404);
    });

    it('serves the questions template before the :survey_id route', async () => {
        const response = await request(app).get('/api/hr-surveys/questions/template').set(auth());
        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toContain('spreadsheetml');
    });

    it('forbids users that are neither admin nor rrhh', async () => {
        const role = await Roles.create({ name: 'colaborador-encuestas' });
        const email = 'no-rrhh-surveys@example.com';
        await Users.create({
            firstName: 'No',
            lastName: 'Rrhh',
            email,
            password: TEST_USER.password,
            roleId: role.id,
            active: true,
        });
        const login = await request(app).post('/api/auth/login').send({ email, password: TEST_USER.password });
        expect(login.status).toBe(200);

        const response = await request(app).get('/api/hr-surveys').set(auth(login.body.token));
        expect(response.status).toBe(403);
    });
});
