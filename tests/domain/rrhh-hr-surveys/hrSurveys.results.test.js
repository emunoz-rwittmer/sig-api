const request = require('supertest');
const { bootTestApp, shutdownTestApp } = require('../../helpers/testApp');
const { createAuthenticatedUser, TEST_USER } = require('../../helpers/auth');
const { createAssignablePosition, createCompanyWithYacht } = require('../../helpers/staffFixtures');
const Staff = require('../../../src/models/catalogs/staff.models');
const StaffCompany = require('../../../src/models/catalogs/staffCompany.models');
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

describe('HR surveys results', () => {
    it('tabulates averages and comments with hashed ids and nothing about who answered', async () => {
        const { surveyHash } = await setup();

        const response = await request(app).get(`/api/hr-surveys/${surveyHash}/results`).set(bearer(rrhhToken));
        expect(response.status).toBe(200);

        expect(response.body.survey).toEqual({
            id: surveyHash,
            name: 'Clima laboral',
            startsAt: '2020-01-01',
            endsAt: '2099-12-31',
            status: 'open',
        });
        expect(Object.keys(response.body)).toEqual(['survey', 'report']);
        expect(Object.keys(response.body.report.byCompany)).toEqual(['groups', 'byQuestion']);

        const [choice, scale, comments] = response.body.report.questions;
        expect(Utils.decode(choice.questionId)).toBeGreaterThan(0);
        expect(choice).toMatchObject({ statement: '¿Cómo calificas el clima laboral?', type: 'opcion multiple', average: 3.67, count: 3 });
        expect(scale.average).toBe(3.67);
        expect(comments).toMatchObject({ statement: 'Comentarios', type: 'texto largo', comments: ['Todo bien'] });
        expect(JSON.stringify(response.body)).not.toMatch(/departament|position|staffType|yacht/i);
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

    it('filtering by company shows only that company, even for staff who also belong to another', async () => {
        const position = await createAssignablePosition('Multiempresa');
        const { company: rolf } = await createCompanyWithYacht('Rolf Test', 'Yate Rolf Test');
        const { company: jhony } = await createCompanyWithYacht('Jhony Test', 'Yate Jhony Test');
        const onlyJhony = await Promise.all([1, 2, 3].map(() => createStaffFixture(position)));
        const both = await Promise.all([1, 2, 3].map(() => createStaffFixture(position)));
        await StaffCompany.bulkCreate([
            ...onlyJhony.map((staff) => ({ staffId: staff.id, companyId: jhony.id })),
            ...both.flatMap((staff) => [{ staffId: staff.id, companyId: jhony.id }, { staffId: staff.id, companyId: rolf.id }]),
        ]);
        const created = await request(app).post('/api/hr-surveys').set(bearer(adminToken)).send({
            name: 'Por empresa', startsAt: '2020-01-01', endsAt: '2099-12-31', active: true,
            positionIds: [Utils.encode(position.id)], questions: surveyQuestions(),
        });
        expect(created.status).toBe(201);
        for (const staff of onlyJhony) await submitAs(staff, created.body.surveyId, { choice: 'Malo', scale: 1, comment: 'Solo Jhony' });
        for (const staff of both) await submitAs(staff, created.body.surveyId, { choice: 'Bueno', scale: 5, comment: 'Ambas' });

        const results = (companyId) => request(app)
            .get(`/api/hr-surveys/${created.body.surveyId}/results${companyId ? `?companyId=${Utils.encode(companyId)}` : ''}`)
            .set(bearer(rrhhToken));
        const groupNames = (body) => body.report.byCompany.groups.filter((group) => group.invited).map((group) => group.name);

        const all = await results();
        expect(groupNames(all.body).sort()).toEqual(['Jhony Test', 'Rolf Test']);

        const filtered = await results(jhony.id);
        expect(filtered.status).toBe(200);
        expect(filtered.body.report.overall.responses).toBe(6);
        // Antes salía también "Rolf Test" (los 3 que están en ambas) y parecía mejor valorada dentro de Jhony.
        expect(groupNames(filtered.body)).toEqual(['Jhony Test']);
        expect(filtered.body.report.byCompany.groups[0].average).toBe(filtered.body.report.overall.average);
        const commentsOf = (body) => body.report.questions.find((question) => question.comments).comments;
        expect(commentsOf(all.body).sort()).toEqual(['Ambas', 'Ambas', 'Ambas', 'Solo Jhony', 'Solo Jhony', 'Solo Jhony']);

        // Los comentarios también respetan el filtro: en Rolf solo están los de quienes son de Rolf.
        const rolfOnly = await results(rolf.id);
        expect(rolfOnly.body.report.overall.responses).toBe(3);
        expect(commentsOf(rolfOnly.body)).toEqual(['Ambas', 'Ambas', 'Ambas']);
    });

    it('hides comments of a company with fewer than 3 responses', async () => {
        const position = await createAssignablePosition('Pocas');
        const { company } = await createCompanyWithYacht('Pocas Test', 'Yate Pocas Test');
        const staffs = await Promise.all([1, 2].map(() => createStaffFixture(position)));
        await StaffCompany.bulkCreate(staffs.map((staff) => ({ staffId: staff.id, companyId: company.id })));
        const created = await request(app).post('/api/hr-surveys').set(bearer(adminToken)).send({
            name: 'Pocas', startsAt: '2020-01-01', endsAt: '2099-12-31', active: true,
            positionIds: [Utils.encode(position.id)], questions: surveyQuestions(),
        });
        for (const staff of staffs) await submitAs(staff, created.body.surveyId, { choice: 'Malo', scale: 1, comment: 'Me reconocerían' });

        const response = await request(app)
            .get(`/api/hr-surveys/${created.body.surveyId}/results?companyId=${Utils.encode(company.id)}`)
            .set(bearer(rrhhToken));
        expect(response.status).toBe(200);
        expect(response.body.report.overall.masked).toBe(true);
        expect(response.body.report.questions.find((question) => question.comments).comments).toEqual([]);
        expect(JSON.stringify(response.body)).not.toContain('Me reconocerían');
    });

    it('lets admin see the results too', async () => {
        const { surveyHash } = await setup();
        const response = await request(app).get(`/api/hr-surveys/${surveyHash}/results`).set(bearer(adminToken));
        expect(response.status).toBe(200);
        expect(response.body.survey.id).toBe(surveyHash);
    });

    it('lets psicologos see the results but not reset the responses', async () => {
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

        const results = await request(app).get(`/api/hr-surveys/${surveyHash}/results`).set(bearer(login.body.token));
        expect(results.status).toBe(200);
        const reset = await request(app).post(`/api/hr-surveys/${surveyHash}/reset`).set(bearer(login.body.token));
        expect(reset.status).toBe(403);
        expect(await HrSurveyResponse.count({ where: { surveyId: Utils.decode(surveyHash) } })).toBe(3);
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
        expect(response.body.report.overall.responses).toBe(0);
        expect(response.body.report.questions[0].average).toBeNull();
    });
});
