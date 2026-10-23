const request = require('supertest');
const { bootTestApp, shutdownTestApp } = require('../../helpers/testApp');
const { createAuthenticatedUser, TEST_USER } = require('../../helpers/auth');
const { createAssignablePosition, createPosition } = require('../../helpers/staffFixtures');
const Staff = require('../../../src/models/catalogs/staff.models');
const Roles = require('../../../src/models/catalogs/roles.models');
const Users = require('../../../src/models/catalogs/user.models');
const HrSurveyResponse = require('../../../src/models/rrhh/hrSurveyResponse.models');
const HrSurveyAnswer = require('../../../src/models/rrhh/hrSurveyAnswer.models');
const Utils = require('../../../src/utils/Utils');

let app;
let adminToken;
let rrhhToken;

beforeAll(async () => {
    app = await bootTestApp();
    adminToken = await createAuthenticatedUser(app);

    const role = await Roles.create({ name: 'rrhh' });
    const email = 'rrhh-results@example.com';
    await Users.create({
        firstName: 'Rrhh',
        lastName: 'Results',
        email,
        password: TEST_USER.password,
        roleId: role.id,
        active: true,
    });
    const login = await request(app).post('/api/auth/login').send({ email, password: TEST_USER.password });
    if (login.status !== 200) throw new Error(`No se pudo autenticar rrhh: ${JSON.stringify(login.body)}`);
    rrhhToken = login.body.token;
}, 60000);

afterAll(async () => {
    await shutdownTestApp();
});

const bearer = (token) => ({ Authorization: `Bearer ${token}` });

let staffCounter = 0;
async function createStaffFixture(position) {
    staffCounter += 1;
    // email es STRING(50) y único: corto y con contador.
    return Staff.create({
        firstName: 'TEST_AUTOMATED',
        lastName: `HrSurveysRes${staffCounter}`,
        email: `hsr-${staffCounter}-${Date.now() % 1e8}@example.com`,
        cellPhone: '0966666666',
        password: 'Sup3rSecret!',
        departamentId: position.departamentId,
        positionId: position.id,
        contractType: 'Fijo',
        active: true,
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
    { statement: 'Comentarios', type: 'texto largo', required: false },
];

async function submitAs(staff, surveyHash, { choice, scale, comment }) {
    const token = await loginStaff(staff);
    const detail = await request(app).get(`/api/hr-surveys/me/${surveyHash}`).set(bearer(token));
    expect(detail.status).toBe(200);
    const [q1, q2, q3] = detail.body.questions;
    const answers = [
        { questionId: q1.id, optionId: q1.options.find((option) => option.text === choice).id },
        { questionId: q2.id, value: scale },
        { questionId: q3.id, ...(comment ? { text: comment } : {}) },
    ];
    const response = await request(app)
        .post(`/api/hr-surveys/me/${surveyHash}/responses`)
        .set(bearer(token))
        .send({ answers });
    expect(response.status).toBe(200);
}

async function setup() {
    const p1 = await createAssignablePosition('Cocina');
    const p2 = await createAssignablePosition('Cubierta');
    const s1 = await createStaffFixture(p1);
    const s2 = await createStaffFixture(p1);
    const pending = await createStaffFixture(p1);
    const s3 = await createStaffFixture(p2);
    const created = await request(app)
        .post('/api/hr-surveys')
        .set(bearer(adminToken))
        .send({
            name: 'Clima laboral',
            startsAt: '2020-01-01',
            endsAt: '2099-12-31',
            active: true,
            positionIds: [Utils.encode(p1.id), Utils.encode(p2.id)],
            questions: surveyQuestions(),
        });
    expect(created.status).toBe(201);
    const surveyHash = created.body.surveyId;

    await submitAs(s1, surveyHash, { choice: 'Bueno', scale: 4, comment: 'Todo bien' });
    await submitAs(s2, surveyHash, { choice: 'Malo', scale: 2 });
    await submitAs(s3, surveyHash, { choice: 'Bueno', scale: 5 });
    return { p1, p2, s1, s2, s3, pending, surveyHash };
}

describe('HR surveys results (rrhh only)', () => {
    it('tabulates averages, participation and comments with hashed ids', async () => {
        const { p1, p2, surveyHash } = await setup();

        const response = await request(app).get(`/api/hr-surveys/${surveyHash}/results`).set(bearer(rrhhToken));
        expect(response.status).toBe(200);

        expect(response.body.survey).toEqual({
            id: surveyHash,
            name: 'Clima laboral',
            startsAt: '2020-01-01',
            endsAt: '2099-12-31',
            status: 'open',
        });

        const h1 = Utils.encode(p1.departamentId);
        const h2 = Utils.encode(p2.departamentId);
        expect(response.body.participation).toEqual(expect.arrayContaining([
            { departamentId: h1, name: 'Cocina', responded: 2, assigned: 3 },
            { departamentId: h2, name: 'Cubierta', responded: 1, assigned: 1 },
        ]));
        expect(response.body.participation).toHaveLength(2);

        const [choice, scale, comments] = response.body.questions;
        expect(choice.overall).toBe(3.67);
        expect(choice.byDepartament).toEqual({ [h1]: 3, [h2]: 5 });
        expect(choice.distribution.map(({ text, count }) => [text, count])).toEqual(
            expect.arrayContaining([['Bueno', 2], ['Malo', 1]]),
        );
        choice.distribution.forEach((entry) => expect(Utils.decode(entry.optionId)).toBeGreaterThan(0));
        expect(Utils.decode(choice.questionId)).toBeGreaterThan(0);
        expect(scale.overall).toBe(3.67);
        expect(scale.byDepartament).toEqual({ [h1]: 3, [h2]: 5 });
        expect(comments.comments).toEqual([{ departamentId: h1, text: 'Todo bien' }]);
    });

    it('groups positions of the same departament and ignores unassigned positions', async () => {
        const chef = await createAssignablePosition('Galley');
        const cook = await createPosition('Ayudante', chef.departamentId);
        const waiter = await createPosition('Mesero', chef.departamentId);
        const s1 = await createStaffFixture(chef);
        await createStaffFixture(cook);
        await createStaffFixture(waiter);
        const created = await request(app)
            .post('/api/hr-surveys')
            .set(bearer(adminToken))
            .send({
                name: 'Por cargo',
                startsAt: '2020-01-01',
                endsAt: '2099-12-31',
                active: true,
                positionIds: [Utils.encode(chef.id), Utils.encode(cook.id)],
                questions: surveyQuestions(),
            });
        expect(created.status).toBe(201);
        await submitAs(s1, created.body.surveyId, { choice: 'Bueno', scale: 4 });

        const response = await request(app).get(`/api/hr-surveys/${created.body.surveyId}/results`).set(bearer(rrhhToken));
        expect(response.status).toBe(200);
        expect(response.body.participation).toEqual([
            { departamentId: Utils.encode(chef.departamentId), name: 'Galley', responded: 1, assigned: 2 },
        ]);
    });

    it('never leaks staff ids or response/answer uuids', async () => {
        const { s1, s2, s3, surveyHash } = await setup();
        const response = await request(app).get(`/api/hr-surveys/${surveyHash}/results`).set(bearer(rrhhToken));
        expect(response.status).toBe(200);

        const json = JSON.stringify(response.body);
        const uuids = [
            ...(await HrSurveyResponse.findAll({ attributes: ['id'] })).map((row) => row.id),
            ...(await HrSurveyAnswer.findAll({ attributes: ['id'] })).map((row) => row.id),
        ];
        expect(uuids.length).toBeGreaterThan(0);
        uuids.forEach((uuid) => expect(json).not.toContain(uuid));
        expect(json).not.toMatch(/staffId|responseId|"answers"/);
        [s1, s2, s3].forEach((staff) => {
            expect(json).not.toContain(staff.email);
        });
    });

    it('lets admin see the results too', async () => {
        const { surveyHash } = await setup();
        const response = await request(app).get(`/api/hr-surveys/${surveyHash}/results`).set(bearer(adminToken));
        expect(response.status).toBe(200);
        expect(response.body.survey.id).toBe(surveyHash);
    });

    it('forbids roles other than admin and rrhh', async () => {
        const { surveyHash } = await setup();
        const role = await Roles.create({ name: 'psicologos' });
        const email = 'psico-results@example.com';
        await Users.create({
            firstName: 'Psico',
            lastName: 'Results',
            email,
            password: TEST_USER.password,
            roleId: role.id,
            active: true,
        });
        const login = await request(app).post('/api/auth/login').send({ email, password: TEST_USER.password });
        expect(login.status).toBe(200);

        const response = await request(app).get(`/api/hr-surveys/${surveyHash}/results`).set(bearer(login.body.token));
        expect(response.status).toBe(403);
    });

    it('returns 404 for an unknown survey and empty data for a draft', async () => {
        const missing = await request(app).get(`/api/hr-surveys/${Utils.encode(987654)}/results`).set(bearer(rrhhToken));
        expect(missing.status).toBe(404);

        const draft = await request(app).post('/api/hr-surveys').set(bearer(adminToken)).send({
            name: 'Borrador', questions: surveyQuestions(),
        });
        expect(draft.status).toBe(201);
        const response = await request(app).get(`/api/hr-surveys/${draft.body.surveyId}/results`).set(bearer(rrhhToken));
        expect(response.status).toBe(200);
        expect(response.body.survey.status).toBe('draft');
        expect(response.body.participation).toEqual([]);
        expect(response.body.questions[0].overall).toBeNull();
    });
});
