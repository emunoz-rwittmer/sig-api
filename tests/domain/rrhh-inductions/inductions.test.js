const request = require('supertest');
const { bootTestApp, shutdownTestApp } = require('../../helpers/testApp');
const { createAuthenticatedUser } = require('../../helpers/auth');
const { createDepartment, createPosition, createCompanyWithYacht } = require('../../helpers/staffFixtures');
const Staff = require('../../../src/models/catalogs/staff.models');
const StaffCompany = require('../../../src/models/catalogs/staffCompany.models');
const Induction = require('../../../src/models/rrhh/induction.models');
const InductionQuestion = require('../../../src/models/rrhh/inductionQuestion.models');
const InductionOption = require('../../../src/models/rrhh/inductionOption.models');
const InductionProgress = require('../../../src/models/rrhh/inductionProgress.models');
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

let staffCounter = 0;
async function createStaffFixture(overrides = {}) {
    const departament = await createDepartment();
    const position = await createPosition();
    staffCounter += 1;
    const uniqueSuffix = `${Date.now()}-${staffCounter}-${Math.floor(Math.random() * 1e6)}`;
    return Staff.create({
        firstName: 'TEST_AUTOMATED',
        lastName: `Inductions${uniqueSuffix}`,
        email: `inductions-test-${uniqueSuffix}@example.com`,
        cellPhone: '0966666666',
        password: 'Sup3rSecret!',
        departamentId: departament.id,
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

function validQuestionsPayload() {
    return [
        {
            statement: '¿Cuál es el color correcto?',
            options: [
                { text: 'Rojo', isCorrect: true },
                { text: 'Azul', isCorrect: false },
            ],
        },
        {
            statement: '¿Cuánto es 2 + 2?',
            options: [
                { text: '3', isCorrect: false },
                { text: '4', isCorrect: true },
            ],
        },
    ];
}

function manyQuestionsPayload(count) {
    return Array.from({ length: count }, (_, index) => ({
        statement: `Pregunta ${index + 1}`,
        options: [
            { text: 'Correcta', isCorrect: true },
            { text: 'Incorrecta', isCorrect: false },
        ],
    }));
}

async function createInductionFixture({ companyIds, passingScore = 50, maxAttempts = 1, questions, questionsToShow }) {
    const response = await request(app)
        .post('/api/inductions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
            name: `Inducción ${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
            description: 'Descripción de prueba',
            passingScore,
            maxAttempts,
            questionsToShow,
            active: true,
            companyIds: companyIds.map((id) => Utils.encode(id)),
            questions: questions ?? validQuestionsPayload(),
        });
    expect(response.status).toBe(200);

    const induction = await Induction.findOne({ order: [['id', 'DESC']] });
    return induction;
}

async function getMine(token, inductionId) {
    const response = await request(app)
        .get(`/api/inductions/me/${Utils.encode(inductionId)}`)
        .set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    return response.body;
}

async function fetchInductionDetail(inductionId) {
    const response = await request(app)
        .get(`/api/inductions/${Utils.encode(inductionId)}`)
        .set('Authorization', `Bearer ${adminToken}`);
    expect(response.status).toBe(200);
    return response.body;
}

describe('RRHH Inductions', () => {
    describe('POST /api/inductions', () => {
        it('rejects a question set without exactly one correct option', async () => {
            const { company } = await createCompanyWithYacht();

            const response = await request(app)
                .post('/api/inductions')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    name: 'Inducción inválida',
                    passingScore: 70,
                    maxAttempts: 3,
                    companyIds: [Utils.encode(company.id)],
                    questions: [{ statement: 'Q1', options: [{ text: 'A', isCorrect: false }, { text: 'B', isCorrect: false }] }],
                });

            expect(response.status).toBe(400);
        });

        it('creates an induction with companies and a normalized question set', async () => {
            const { company } = await createCompanyWithYacht();
            const induction = await createInductionFixture({ companyIds: [company.id] });

            const questions = await InductionQuestion.findAll({ where: { inductionId: induction.id } });
            expect(questions.length).toBe(2);

            const options = await InductionOption.findAll({ where: { questionId: questions[0].id } });
            expect(options.filter((option) => option.isCorrect).length).toBe(1);
        });

        it('returns 403 for a role without RRHH access', async () => {
            const staff = await createStaffFixture();
            const { company } = await createCompanyWithYacht();
            await StaffCompany.create({ staffId: staff.id, companyId: company.id });
            const staffToken = await loginStaff(staff);

            const response = await request(app)
                .post('/api/inductions')
                .set('Authorization', `Bearer ${staffToken}`)
                .send({
                    name: 'No autorizado',
                    passingScore: 70,
                    maxAttempts: 3,
                    companyIds: [Utils.encode(company.id)],
                    questions: validQuestionsPayload(),
                });

            expect(response.status).toBe(403);
        });
    });

    describe('GET /api/inductions/:induction_id', () => {
        it('returns 400 for an invalid hashid', async () => {
            const response = await request(app)
                .get('/api/inductions/not-a-hashid')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(400);
            expect(response.body.error.code).toBe('AppError');
        });
    });

    describe('Dynamic company assignment', () => {
        it('covers staff who joined the company after the induction was published', async () => {
            const { company } = await createCompanyWithYacht();
            const induction = await createInductionFixture({ companyIds: [company.id] });

            const lateStaff = await createStaffFixture();
            await StaffCompany.create({ staffId: lateStaff.id, companyId: company.id });

            const response = await request(app)
                .get(`/api/inductions/staff/${Utils.encode(lateStaff.id)}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.some((item) => item.id === Utils.encode(induction.id))).toBe(true);
        });
    });

    describe('Staff self-service quiz flow', () => {
        it('never exposes isCorrect on /me endpoints', async () => {
            const { company } = await createCompanyWithYacht();
            const staff = await createStaffFixture();
            await StaffCompany.create({ staffId: staff.id, companyId: company.id });
            const induction = await createInductionFixture({ companyIds: [company.id], passingScore: 50, maxAttempts: 2 });
            const staffToken = await loginStaff(staff);

            const detail = await request(app)
                .get(`/api/inductions/me/${Utils.encode(induction.id)}`)
                .set('Authorization', `Bearer ${staffToken}`);

            expect(detail.status).toBe(200);
            detail.body.questions.forEach((question) => {
                question.options.forEach((option) => {
                    expect(option).not.toHaveProperty('isCorrect');
                });
            });
        });

        it('blocks an attempt before the material has been viewed', async () => {
            const { company } = await createCompanyWithYacht();
            const staff = await createStaffFixture();
            await StaffCompany.create({ staffId: staff.id, companyId: company.id });
            const induction = await createInductionFixture({ companyIds: [company.id] });
            const staffToken = await loginStaff(staff);

            const questions = await InductionQuestion.findAll({ where: { inductionId: induction.id }, include: [{ model: InductionOption, as: 'options' }] });
            const answers = questions.map((question) => ({
                questionId: Utils.encode(question.id),
                optionId: Utils.encode(question.options.find((option) => option.isCorrect).id),
            }));

            const response = await request(app)
                .post(`/api/inductions/me/${Utils.encode(induction.id)}/attempts`)
                .set('Authorization', `Bearer ${staffToken}`)
                .send({ answers });

            expect(response.status).toBe(400);
        });

        it('grades a passing attempt and rejects a foreign option id', async () => {
            const { company } = await createCompanyWithYacht();
            const staff = await createStaffFixture();
            await StaffCompany.create({ staffId: staff.id, companyId: company.id });
            const induction = await createInductionFixture({ companyIds: [company.id], passingScore: 50, maxAttempts: 2 });
            const otherInduction = await createInductionFixture({ companyIds: [company.id] });
            const staffToken = await loginStaff(staff);

            await request(app)
                .put(`/api/inductions/me/${Utils.encode(induction.id)}/viewed`)
                .set('Authorization', `Bearer ${staffToken}`);

            const foreignQuestion = await InductionQuestion.findOne({
                where: { inductionId: otherInduction.id },
                include: [{ model: InductionOption, as: 'options' }],
            });
            const badResponse = await request(app)
                .post(`/api/inductions/me/${Utils.encode(induction.id)}/attempts`)
                .set('Authorization', `Bearer ${staffToken}`)
                .send({ answers: [{ questionId: Utils.encode(foreignQuestion.id), optionId: Utils.encode(foreignQuestion.options[0].id) }] });
            expect(badResponse.status).toBe(400);

            const questions = await InductionQuestion.findAll({ where: { inductionId: induction.id }, include: [{ model: InductionOption, as: 'options' }] });
            const answers = questions.map((question) => ({
                questionId: Utils.encode(question.id),
                optionId: Utils.encode(question.options.find((option) => option.isCorrect).id),
            }));

            const passResponse = await request(app)
                .post(`/api/inductions/me/${Utils.encode(induction.id)}/attempts`)
                .set('Authorization', `Bearer ${staffToken}`)
                .send({ answers });

            expect(passResponse.status).toBe(200);
            expect(passResponse.body.passed).toBe(true);
            expect(passResponse.body.score).toBe(100);
        });

        it('blocks a new attempt once max attempts are exhausted, then unblocks after an extra attempt is granted', async () => {
            const { company } = await createCompanyWithYacht();
            const staff = await createStaffFixture();
            await StaffCompany.create({ staffId: staff.id, companyId: company.id });
            const induction = await createInductionFixture({ companyIds: [company.id], passingScore: 99, maxAttempts: 1 });
            const staffToken = await loginStaff(staff);

            await request(app)
                .put(`/api/inductions/me/${Utils.encode(induction.id)}/viewed`)
                .set('Authorization', `Bearer ${staffToken}`);

            const questions = await InductionQuestion.findAll({ where: { inductionId: induction.id }, include: [{ model: InductionOption, as: 'options' }] });
            const wrongAnswers = questions.map((question) => ({
                questionId: Utils.encode(question.id),
                optionId: Utils.encode(question.options.find((option) => !option.isCorrect).id),
            }));

            const firstAttempt = await request(app)
                .post(`/api/inductions/me/${Utils.encode(induction.id)}/attempts`)
                .set('Authorization', `Bearer ${staffToken}`)
                .send({ answers: wrongAnswers });
            expect(firstAttempt.status).toBe(200);
            expect(firstAttempt.body.passed).toBe(false);
            expect(firstAttempt.body.remainingAttempts).toBe(0);

            const blockedAttempt = await request(app)
                .post(`/api/inductions/me/${Utils.encode(induction.id)}/attempts`)
                .set('Authorization', `Bearer ${staffToken}`)
                .send({ answers: wrongAnswers });
            expect(blockedAttempt.status).toBe(400);

            const grant = await request(app)
                .post(`/api/inductions/${Utils.encode(induction.id)}/staff/${Utils.encode(staff.id)}/extra-attempt`)
                .set('Authorization', `Bearer ${adminToken}`);
            expect(grant.status).toBe(200);

            const progress = await InductionProgress.findOne({ where: { inductionId: induction.id, staffId: staff.id } });
            expect(progress.extraAttempts).toBe(1);

            const retryAttempt = await request(app)
                .post(`/api/inductions/me/${Utils.encode(induction.id)}/attempts`)
                .set('Authorization', `Bearer ${staffToken}`)
                .send({ answers: wrongAnswers });
            expect(retryAttempt.status).toBe(200);
        });
    });

    describe('Random question sampling per attempt', () => {
        it('rejects questionsToShow greater than the number of questions', async () => {
            const { company } = await createCompanyWithYacht();

            const response = await request(app)
                .post('/api/inductions')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    name: 'Inducción con muestra inválida',
                    passingScore: 70,
                    maxAttempts: 3,
                    questionsToShow: 5,
                    companyIds: [Utils.encode(company.id)],
                    questions: manyQuestionsPayload(3),
                });

            expect(response.status).toBe(400);
        });

        it('shows only questionsToShow questions to the staff, consistently until a new attempt starts', async () => {
            const { company } = await createCompanyWithYacht();
            const staff = await createStaffFixture();
            await StaffCompany.create({ staffId: staff.id, companyId: company.id });
            const induction = await createInductionFixture({
                companyIds: [company.id],
                passingScore: 50,
                maxAttempts: 3,
                questions: manyQuestionsPayload(10),
                questionsToShow: 4,
            });
            const staffToken = await loginStaff(staff);

            const firstView = await getMine(staffToken, induction.id);
            expect(firstView.questions).toHaveLength(4);

            const secondView = await getMine(staffToken, induction.id);
            expect(secondView.questions.map((q) => q.id).sort()).toEqual(firstView.questions.map((q) => q.id).sort());

            await request(app)
                .put(`/api/inductions/me/${Utils.encode(induction.id)}/viewed`)
                .set('Authorization', `Bearer ${staffToken}`);

            const wrongAnswers = firstView.questions.map((question) => ({
                questionId: question.id,
                optionId: question.options[0].id,
            }));

            const attempt = await request(app)
                .post(`/api/inductions/me/${Utils.encode(induction.id)}/attempts`)
                .set('Authorization', `Bearer ${staffToken}`)
                .send({ answers: wrongAnswers });
            expect(attempt.status).toBe(200);
            expect(attempt.body.total).toBe(4);

            const viewAfterAttempt = await getMine(staffToken, induction.id);
            expect(viewAfterAttempt.questions).toHaveLength(4);
        });

        it('rejects an attempt that does not answer every shown question', async () => {
            const { company } = await createCompanyWithYacht();
            const staff = await createStaffFixture();
            await StaffCompany.create({ staffId: staff.id, companyId: company.id });
            const induction = await createInductionFixture({
                companyIds: [company.id],
                questions: manyQuestionsPayload(6),
                questionsToShow: 3,
            });
            const staffToken = await loginStaff(staff);

            const detail = await getMine(staffToken, induction.id);
            await request(app)
                .put(`/api/inductions/me/${Utils.encode(induction.id)}/viewed`)
                .set('Authorization', `Bearer ${staffToken}`);

            const partialAnswers = [{
                questionId: detail.questions[0].id,
                optionId: detail.questions[0].options[0].id,
            }];

            const response = await request(app)
                .post(`/api/inductions/me/${Utils.encode(induction.id)}/attempts`)
                .set('Authorization', `Bearer ${staffToken}`)
                .send({ answers: partialAnswers });

            expect(response.status).toBe(400);
        });
    });

    describe('GET /api/inductions/:induction_id/staffs', () => {
        it('reports assignment counts and per-staff status', async () => {
            const { company } = await createCompanyWithYacht();
            const staff = await createStaffFixture();
            await StaffCompany.create({ staffId: staff.id, companyId: company.id });
            const induction = await createInductionFixture({ companyIds: [company.id] });

            const list = await request(app)
                .get('/api/inductions')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(list.status).toBe(200);
            const listed = list.body.find((item) => item.id === Utils.encode(induction.id));
            expect(listed.assignedCount).toBeGreaterThanOrEqual(1);

            const staffs = await request(app)
                .get(`/api/inductions/${Utils.encode(induction.id)}/staffs`)
                .set('Authorization', `Bearer ${adminToken}`);
            expect(staffs.status).toBe(200);
            const row = staffs.body.find((entry) => entry.staffId === Utils.encode(staff.id));
            expect(row.status).toBe('pending');
        });
    });

    describe('PUT/DELETE /api/inductions/:induction_id', () => {
        it('replaces companies and questions atomically on update', async () => {
            const { company: companyA } = await createCompanyWithYacht();
            const { company: companyB } = await createCompanyWithYacht();
            const induction = await createInductionFixture({ companyIds: [companyA.id] });

            const response = await request(app)
                .put(`/api/inductions/${Utils.encode(induction.id)}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    companyIds: [Utils.encode(companyB.id)],
                    questions: [{ statement: 'Nueva pregunta', options: [{ text: 'X', isCorrect: true }, { text: 'Y', isCorrect: false }] }],
                });
            expect(response.status).toBe(200);

            const detail = await fetchInductionDetail(induction.id);
            expect(detail.companies.length).toBe(1);
            expect(detail.companies[0].companyId).toBe(Utils.encode(companyB.id));
            expect(detail.questions.length).toBe(1);
        });

        it('deletes an induction', async () => {
            const { company } = await createCompanyWithYacht();
            const induction = await createInductionFixture({ companyIds: [company.id] });

            const response = await request(app)
                .delete(`/api/inductions/${Utils.encode(induction.id)}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(await Induction.findByPk(induction.id)).toBeNull();
        });
    });
});
