const request = require('supertest');
const jwt = require('jsonwebtoken');
const { bootTestApp, shutdownTestApp } = require('../../helpers/testApp');
const { createAuthenticatedUser } = require('../../helpers/auth');
const { createCompanyWithYacht } = require('../../helpers/staffFixtures');
const Form = require('../../../src/models/operations/surveys/form.models');
const FormQuestion = require('../../../src/models/operations/surveys/formQuestion.models');
const FormRespond = require('../../../src/models/operations/surveys/formRespond.models');
const FormAnswers = require('../../../src/models/operations/surveys/formAnswers.models');

jest.mock('axios');
const axios = require('axios');

let app;
let adminToken;
let fixtureCounter = 0;
const suffix = () => {
    fixtureCounter += 1;
    return `${Date.now()}-${fixtureCounter}`;
};

const withAuth = (httpRequest, token) => httpRequest.set('Authorization', `Bearer ${token}`);

beforeAll(async () => {
    app = await bootTestApp();
    adminToken = await createAuthenticatedUser(app);
    process.env.POWERBI_REPORTS_MAP = JSON.stringify({
        desempeno: { workspaceId: 'ws-1', reportId: 'rep-1' },
    });
    process.env.POWERBI_TENANT_ID = 'tenant-1';
    process.env.POWERBI_CLIENT_ID = 'client-1';
    process.env.POWERBI_CLIENT_SECRET = 'secret-1';
}, 60000);

afterAll(async () => {
    await shutdownTestApp();
});

beforeEach(() => {
    jest.clearAllMocks();
});

describe('GET /api/reports/powerbi/:reportKey/embed', () => {
    it('returns the embed config for an authenticated admin user', async () => {
        axios.post.mockImplementation((url) => {
            if (url.includes('login.microsoftonline.com')) {
                return Promise.resolve({ data: { access_token: 'aad-token', expires_in: 3600 } });
            }
            return Promise.resolve({
                data: { token: 'embed-token-abc', tokenId: 't-1', expiration: '2026-08-25T15:00:00Z' },
            });
        });
        axios.get.mockResolvedValueOnce({
            data: { id: 'rep-1', embedUrl: 'https://app.powerbi.com/reportEmbed?reportId=rep-1' },
        });

        const response = await withAuth(
            request(app).get('/api/reports/powerbi/desempeno/embed'),
            adminToken
        );

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            embedUrl: 'https://app.powerbi.com/reportEmbed?reportId=rep-1',
            embedToken: 'embed-token-abc',
            reportId: 'rep-1',
            expiration: '2026-08-25T15:00:00Z',
        });
    });

    it('returns 403 for a role outside the allowed list', async () => {
        const restrictedToken = jwt.sign({ id: 999, rol: 'rrhh' }, process.env.JWT_SECRET, {
            expiresIn: '10h',
            algorithm: 'HS512',
        });

        const response = await withAuth(
            request(app).get('/api/reports/powerbi/desempeno/embed'),
            restrictedToken
        );

        expect(response.status).toBe(403);
        expect(axios.get).not.toHaveBeenCalled();
    });

    it('returns 403 without a token, same as any other /api/reports route', async () => {
        const response = await request(app).get('/api/reports/powerbi/desempeno/embed');

        expect(response.status).toBe(403);
    });

    it('returns 404 for an unconfigured report key', async () => {
        const response = await withAuth(
            request(app).get('/api/reports/powerbi/otro-reporte/embed'),
            adminToken
        );

        expect(response.status).toBe(404);
        expect(response.body.error.message).toBe("Reporte 'otro-reporte' no configurado");
    });
});

describe('GET /api/reports/evaluations/powerbi-dataset', () => {
    it('returns the dataset as JSON when the api key header matches', async () => {
        const caseSuffix = suffix();
        const { company } = await createCompanyWithYacht(`PBI Route Company ${caseSuffix}`);
        const form = await Form.create({ name: `Form Route ${caseSuffix}`, positions: [] });
        const question = await FormQuestion.create({ formId: form.id, title: 'Pregunta', type: 'scale' });
        const respond = await FormRespond.create({
            companyId: company.id,
            formId: form.id,
            state: 'FINALIZADO',
            evaluator: 'Evaluador Route',
            evaluated: 'Evaluado Route',
            expirationDate: new Date('2026-08-01'),
        });
        await FormAnswers.create({ respuestaId: respond.id, questionId: question.id, answer: '4' });

        const response = await request(app)
            .get('/api/reports/evaluations/powerbi-dataset')
            .set('X-PowerBI-Key', process.env.POWERBI_DATASET_API_KEY);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.some((row) => row.evaluado === 'Evaluado Route')).toBe(true);
    });

    it('returns 401 without the api key header', async () => {
        const response = await request(app).get('/api/reports/evaluations/powerbi-dataset');

        expect(response.status).toBe(401);
    });

    it('returns 401 with a JWT instead of the api key (JWT alone is not accepted here)', async () => {
        const response = await withAuth(
            request(app).get('/api/reports/evaluations/powerbi-dataset'),
            adminToken
        );

        expect(response.status).toBe(401);
    });
});
