const request = require('supertest');
const dayjs = require('dayjs');
const { bootTestApp, shutdownTestApp } = require('../../helpers/testApp');
const { createAuthenticatedUser } = require('../../helpers/auth');
const { createAssignablePosition, createPosition } = require('../../helpers/staffFixtures');
const Staff = require('../../../src/models/catalogs/staff.models');
const HrSurveyParticipation = require('../../../src/models/rrhh/hrSurveyParticipation.models');
const HrSurveyResponse = require('../../../src/models/rrhh/hrSurveyResponse.models');
const HrSurveyAnswer = require('../../../src/models/rrhh/hrSurveyAnswer.models');
const HrSurvey = require('../../../src/models/rrhh/hrSurvey.models');
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

const bearer = (token) => ({ Authorization: `Bearer ${token}` });
const DATE_FORMAT = 'YYYY-MM-DD';
const today = () => dayjs().format(DATE_FORMAT);

let staffCounter = 0;
async function createStaffFixture(position, overrides = {}) {
    staffCounter += 1;
    // email es STRING(50) y único: corto y con contador.
    return Staff.create({
        firstName: 'TEST_AUTOMATED',
        lastName: `HrSurveysMe${staffCounter}`,
        email: `hsm-${staffCounter}-${Date.now() % 1e8}@example.com`,
        cellPhone: '0966666666',
        password: 'Sup3rSecret!',
        departamentId: position.departamentId,
        positionId: position.id,
        contractType: 'Fijo',
        active: true,
        ...overrides,
    });
}

async function loginStaff(staff) {
    const response = await request(app)
        .post('/api/auth/login_staffs')
        .send({ email: staff.email, password: 'Sup3rSecret!' });
    if (response.status !== 200 || !response.body.token) {
        throw new Error(`No se pudo autenticar el staff de prueba: ${JSON.stringify(response.body)}`);
    }
    return response.body.token;
}

const surveyQuestions = () => [
    {
        statement: '¿Cómo calificas el clima laboral?',
        type: 'opcion multiple',
        required: true,
        options: [{ text: 'Bueno', score: 5 }, { text: 'Malo', score: 1 }],
    },
    { statement: 'Satisfacción general', type: 'scale', required: true, scaleMin: 1, scaleMax: 5 },
    {
        statement: '¿Qué área necesita apoyo?',
        type: 'lista',
        required: false,
        options: [{ text: 'Cocina', score: 2 }, { text: 'Cubierta', score: 3 }],
    },
    { statement: 'Comentarios', type: 'texto largo', required: false },
];

async function createSurvey(positions, overrides = {}) {
    const response = await request(app)
        .post('/api/hr-surveys')
        .set(bearer(adminToken))
        .send({
            name: 'Clima laboral',
            description: 'Encuesta anónima',
            startsAt: '2020-01-01',
            endsAt: '2099-12-31',
            active: true,
            positionIds: positions.map((position) => Utils.encode(position.id)),
            questions: surveyQuestions(),
            ...overrides,
        });
    expect(response.status).toBe(201);
    return response.body.surveyId;
}

async function getDetail(token, surveyHash) {
    const response = await request(app).get(`/api/hr-surveys/me/${surveyHash}`).set(bearer(token));
    expect(response.status).toBe(200);
    return response.body;
}

// Respuestas válidas a partir del detalle: Bueno (5), escala 4, lista sin responder, comentario.
function buildAnswers(detail, overrides = {}) {
    const [choice, scale, list, comment] = detail.questions;
    return [
        { questionId: choice.id, optionId: choice.options.find((option) => option.text === 'Bueno').id },
        { questionId: scale.id, value: 4 },
        { questionId: list.id },
        { questionId: comment.id, text: 'Todo bien' },
    ].map((answer, index) => ({ ...answer, ...(overrides[index] ?? {}) }));
}

const submit = (token, surveyHash, answers) => request(app)
    .post(`/api/hr-surveys/me/${surveyHash}/responses`)
    .set(bearer(token))
    .send({ answers });

async function setupOpenSurvey(overrides = {}) {
    const position = await createAssignablePosition('Encuestados');
    const staff = await createStaffFixture(position);
    const token = await loginStaff(staff);
    const surveyHash = await createSurvey([position], overrides);
    return { position, staff, token, surveyHash, surveyId: Utils.decode(surveyHash) };
}

describe('HR surveys staff self-service', () => {
    describe('GET /me', () => {
        it('lists an assigned survey as not answered and hides it from other positions', async () => {
            const { token, surveyHash } = await setupOpenSurvey();
            const other = await createStaffFixture(await createAssignablePosition('Ajeno'));
            const otherToken = await loginStaff(other);

            const mine = await request(app).get('/api/hr-surveys/me').set(bearer(token));
            expect(mine.status).toBe(200);
            const entry = mine.body.find((survey) => survey.id === surveyHash);
            expect(entry).toEqual({
                id: surveyHash,
                name: 'Clima laboral',
                description: 'Encuesta anónima',
                startsAt: '2020-01-01',
                endsAt: '2099-12-31',
                status: 'open',
                answered: false,
                questionCount: 4,
            });

            const others = await request(app).get('/api/hr-surveys/me').set(bearer(otherToken));
            expect(others.status).toBe(200);
            expect(others.body.some((survey) => survey.id === surveyHash)).toBe(false);
        });

        it('hides the survey from staff of the same departament with another position', async () => {
            const { position, surveyHash } = await setupOpenSurvey();
            const sibling = await createPosition('Otro cargo', position.departamentId);
            const token = await loginStaff(await createStaffFixture(sibling));

            const mine = await request(app).get('/api/hr-surveys/me').set(bearer(token));
            expect(mine.body.some((survey) => survey.id === surveyHash)).toBe(false);
            const detail = await request(app).get(`/api/hr-surveys/me/${surveyHash}`).set(bearer(token));
            expect(detail.status).toBe(404);
        });

        it('never lists a draft', async () => {
            const position = await createAssignablePosition('Borradores');
            const token = await loginStaff(await createStaffFixture(position));
            const draftHash = await createSurvey([position], { active: false, name: 'Borrador' });

            const mine = await request(app).get('/api/hr-surveys/me').set(bearer(token));
            expect(mine.body.some((survey) => survey.id === draftHash)).toBe(false);

            const detail = await request(app).get(`/api/hr-surveys/me/${draftHash}`).set(bearer(token));
            expect(detail.status).toBe(404);
        });

        it('is reachable by staff without an admin role', async () => {
            const { token } = await setupOpenSurvey();
            const admin = await request(app).get('/api/hr-surveys').set(bearer(token));
            expect(admin.status).toBe(403);
            const mine = await request(app).get('/api/hr-surveys/me').set(bearer(token));
            expect(mine.status).toBe(200);
        });
    });

    describe('GET /me/:id', () => {
        it('returns questions with hashed ids and without any option score', async () => {
            const { token, surveyHash } = await setupOpenSurvey();
            const detail = await getDetail(token, surveyHash);

            expect(detail).toMatchObject({ id: surveyHash, name: 'Clima laboral', status: 'open', answered: false });
            expect(detail.questions).toHaveLength(4);
            expect(detail.questions[0]).toEqual({
                id: expect.any(String),
                statement: '¿Cómo calificas el clima laboral?',
                type: 'opcion multiple',
                required: true,
                scaleMin: null,
                scaleMax: null,
                options: [{ id: expect.any(String), text: 'Bueno' }, { id: expect.any(String), text: 'Malo' }],
            });
            expect(detail.questions[1]).toMatchObject({ type: 'scale', scaleMin: 1, scaleMax: 5, options: [] });
            detail.questions.forEach((question) => question.options.forEach((option) => {
                expect(option).not.toHaveProperty('score');
            }));
            expect(JSON.stringify(detail)).not.toMatch(/score/i);
        });

        it('returns 404 for a survey not assigned to the staff position', async () => {
            const { surveyHash } = await setupOpenSurvey();
            const outsider = await loginStaff(await createStaffFixture(await createAssignablePosition('Fuera')));
            const response = await request(app).get(`/api/hr-surveys/me/${surveyHash}`).set(bearer(outsider));
            expect(response.status).toBe(404);
        });
    });

    describe('POST /me/:id/responses', () => {
        it('stores an anonymous response and marks the survey as answered', async () => {
            const { token, surveyHash, surveyId, position, staff } = await setupOpenSurvey();
            const detail = await getDetail(token, surveyHash);

            const response = await submit(token, surveyHash, buildAnswers(detail));
            expect(response.status).toBe(200);
            // Nada de ids de participación/respuesta/respuestas en el payload.
            expect(response.body).toEqual({ ok: true });

            const mine = await request(app).get('/api/hr-surveys/me').set(bearer(token));
            expect(mine.body.find((survey) => survey.id === surveyHash).answered).toBe(true);
            expect(JSON.stringify(mine.body)).not.toMatch(/staffId|responseId|participation/i);

            const after = await getDetail(token, surveyHash);
            expect(after.answered).toBe(true);
            expect(JSON.stringify(after)).not.toMatch(/staffId|responseId|participation/i);

            const participations = await HrSurveyParticipation.findAll({ where: { surveyId } });
            expect(participations).toHaveLength(1);
            expect(participations[0]).toMatchObject({ staffId: staff.id, departamentId: position.departamentId });

            const responses = await HrSurveyResponse.findAll({ where: { surveyId }, raw: true });
            expect(responses).toHaveLength(1);
            expect(responses[0]).toEqual({ id: expect.any(String), surveyId, departamentId: position.departamentId });
            expect(HrSurveyResponse.rawAttributes).not.toHaveProperty('staffId');
            expect(HrSurveyResponse.rawAttributes).not.toHaveProperty('createdAt');
            const columns = await HrSurveyResponse.sequelize.getQueryInterface().describeTable('hr_survey_responses');
            expect(Object.keys(columns).sort()).toEqual(['departament_id', 'id', 'survey_id']);

            // La lista opcional sin responder no se guarda; la escala y el texto sí.
            const answers = await HrSurveyAnswer.findAll({ where: { responseId: responses[0].id }, raw: true });
            expect(answers).toHaveLength(3);
            const byQuestion = new Map(answers.map((answer) => [Utils.encode(answer.questionId), answer]));
            expect(Number(byQuestion.get(detail.questions[0].id).score)).toBe(5);
            expect(Number(byQuestion.get(detail.questions[1].id).score)).toBe(4);
            expect(byQuestion.get(detail.questions[3].id)).toMatchObject({ score: null, optionId: null, text: 'Todo bien' });
            expect(byQuestion.has(detail.questions[2].id)).toBe(false);
        });

        it('rejects a second submission with 409', async () => {
            const { token, surveyHash, surveyId } = await setupOpenSurvey();
            const detail = await getDetail(token, surveyHash);

            expect((await submit(token, surveyHash, buildAnswers(detail))).status).toBe(200);
            const second = await submit(token, surveyHash, buildAnswers(detail));
            expect(second.status).toBe(409);
            expect(second.body.error.message).toBe('Ya respondiste esta encuesta');
            expect(await HrSurveyResponse.count({ where: { surveyId } })).toBe(1);
        });

        it('keeps a single response when two submissions race', async () => {
            const { token, surveyHash, surveyId } = await setupOpenSurvey();
            const detail = await getDetail(token, surveyHash);

            const results = await Promise.all([
                submit(token, surveyHash, buildAnswers(detail)),
                submit(token, surveyHash, buildAnswers(detail)),
            ]);
            expect(results.map((result) => result.status).sort()).toEqual([200, 409]);
            expect(await HrSurveyParticipation.count({ where: { surveyId } })).toBe(1);
            expect(await HrSurveyResponse.count({ where: { surveyId } })).toBe(1);
        });

        it('rejects a scheduled survey (one day before it starts)', async () => {
            const tomorrow = dayjs().add(1, 'day').format(DATE_FORMAT);
            const { token, surveyHash, surveyId } = await setupOpenSurvey({ startsAt: tomorrow, endsAt: '2099-12-31' });
            const detail = await getDetail(token, surveyHash);
            expect(detail.status).toBe('scheduled');

            const response = await submit(token, surveyHash, buildAnswers(detail));
            expect(response.status).toBe(400);
            expect(await HrSurveyParticipation.count({ where: { surveyId } })).toBe(0);
        });

        it('rejects a closed survey', async () => {
            const yesterday = dayjs().subtract(1, 'day').format(DATE_FORMAT);
            // Publicar con cierre pasado se rechaza por API: se cierra directo en BD.
            const { token, surveyHash, surveyId } = await setupOpenSurvey();
            await HrSurvey.update({ endsAt: yesterday }, { where: { id: surveyId } });
            const detail = await getDetail(token, surveyHash);
            expect(detail.status).toBe('closed');

            const response = await submit(token, surveyHash, buildAnswers(detail));
            expect(response.status).toBe(400);
        });

        it('accepts a submission on the last day of the period', async () => {
            const { token, surveyHash } = await setupOpenSurvey({ startsAt: '2020-01-01', endsAt: today() });
            const detail = await getDetail(token, surveyHash);

            const response = await submit(token, surveyHash, buildAnswers(detail));
            expect(response.status).toBe(200);
        });

        it('rejects an option that belongs to another question', async () => {
            const { token, surveyHash, surveyId } = await setupOpenSurvey();
            const detail = await getDetail(token, surveyHash);
            const foreignOption = detail.questions[2].options[0].id;

            const response = await submit(token, surveyHash, buildAnswers(detail, { 0: { optionId: foreignOption } }));
            expect(response.status).toBe(400);
            expect(await HrSurveyParticipation.count({ where: { surveyId } })).toBe(0);
            expect(await HrSurveyResponse.count({ where: { surveyId } })).toBe(0);
        });

        it('rejects a question from another survey', async () => {
            const { token, surveyHash, position } = await setupOpenSurvey();
            const otherHash = await createSurvey([position], { name: 'Otra' });
            const detail = await getDetail(token, surveyHash);
            const otherDetail = await getDetail(token, otherHash);

            const answers = [...buildAnswers(detail), { questionId: otherDetail.questions[1].id, value: 3 }];
            const response = await submit(token, surveyHash, answers);
            expect(response.status).toBe(400);
        });

        it('rejects a scale value out of range', async () => {
            const { token, surveyHash } = await setupOpenSurvey();
            const detail = await getDetail(token, surveyHash);

            const response = await submit(token, surveyHash, buildAnswers(detail, { 1: { value: 6 } }));
            expect(response.status).toBe(400);
        });

        it('rejects a submission missing a required question', async () => {
            const { token, surveyHash, surveyId } = await setupOpenSurvey();
            const detail = await getDetail(token, surveyHash);
            const answers = buildAnswers(detail).filter((answer) => answer.questionId !== detail.questions[1].id);

            const response = await submit(token, surveyHash, answers);
            expect(response.status).toBe(400);
            expect(await HrSurveyParticipation.count({ where: { surveyId } })).toBe(0);
        });

        it('rejects a malformed answers payload', async () => {
            const { token, surveyHash } = await setupOpenSurvey();
            const response = await request(app)
                .post(`/api/hr-surveys/me/${surveyHash}/responses`)
                .set(bearer(token))
                .send({ answers: 'nope' });
            expect(response.status).toBe(400);
        });

        it('ignores a client-sent score and stores the option score', async () => {
            const { token, surveyHash, surveyId } = await setupOpenSurvey();
            const detail = await getDetail(token, surveyHash);
            const answers = buildAnswers(detail, { 0: { score: 999 }, 1: { score: 999 } });

            expect((await submit(token, surveyHash, answers)).status).toBe(200);
            const response = await HrSurveyResponse.findOne({ where: { surveyId } });
            const stored = await HrSurveyAnswer.findAll({ where: { responseId: response.id }, raw: true });
            const scores = new Map(stored.map((answer) => [Utils.encode(answer.questionId), answer.score]));
            expect(Number(scores.get(detail.questions[0].id))).toBe(5);
            expect(Number(scores.get(detail.questions[1].id))).toBe(4);
        });

        it('rejects a submission to a survey not assigned to the staff position', async () => {
            const { surveyHash, token } = await setupOpenSurvey();
            const detail = await getDetail(token, surveyHash);
            const outsider = await loginStaff(await createStaffFixture(await createAssignablePosition('Externo')));

            const response = await submit(outsider, surveyHash, buildAnswers(detail));
            expect(response.status).toBe(404);
        });

        it('rejects an inactive staff member', async () => {
            const { staff, token, surveyHash, surveyId } = await setupOpenSurvey();
            const detail = await getDetail(token, surveyHash);
            await staff.update({ active: false });

            const response = await submit(token, surveyHash, buildAnswers(detail));
            expect(response.status).toBe(403);
            expect(await HrSurveyParticipation.count({ where: { surveyId } })).toBe(0);
        });

        it('keeps a survey answered after the staff moves to another assigned position', async () => {
            const first = await createAssignablePosition('Origen');
            const second = await createAssignablePosition('Destino');
            const staff = await createStaffFixture(first);
            const token = await loginStaff(staff);
            const surveyHash = await createSurvey([first, second]);
            const detail = await getDetail(token, surveyHash);

            expect((await submit(token, surveyHash, buildAnswers(detail))).status).toBe(200);
            await staff.update({ positionId: second.id, departamentId: second.departamentId });

            const mine = await request(app).get('/api/hr-surveys/me').set(bearer(token));
            expect(mine.body.filter((survey) => survey.id === surveyHash)).toEqual([
                expect.objectContaining({ id: surveyHash, answered: true }),
            ]);
            const again = await submit(token, surveyHash, buildAnswers(detail));
            expect(again.status).toBe(409);
        });

        it('still shows an answered survey after moving to an unassigned position', async () => {
            const { staff, token, surveyHash } = await setupOpenSurvey();
            const detail = await getDetail(token, surveyHash);
            expect((await submit(token, surveyHash, buildAnswers(detail))).status).toBe(200);

            const moved = await createAssignablePosition('Nuevo');
            await staff.update({ positionId: moved.id, departamentId: moved.departamentId });

            const mine = await request(app).get('/api/hr-surveys/me').set(bearer(token));
            expect(mine.body.find((survey) => survey.id === surveyHash)).toMatchObject({ answered: true });
            expect((await request(app).get(`/api/hr-surveys/me/${surveyHash}`).set(bearer(token))).status).toBe(200);
            expect((await submit(token, surveyHash, buildAnswers(detail))).status).toBe(409);
        });
    });
});
