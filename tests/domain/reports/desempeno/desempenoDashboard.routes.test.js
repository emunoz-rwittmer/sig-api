const request = require('supertest');
const jwt = require('jsonwebtoken');
const { bootTestApp, shutdownTestApp } = require('../../../helpers/testApp');
const { createAuthenticatedUser } = require('../../../helpers/auth');

let app;
let adminToken;

const withAuth = (httpRequest, token) => httpRequest.set('Authorization', `Bearer ${token}`);

beforeAll(async () => {
    app = await bootTestApp();
    adminToken = await createAuthenticatedUser(app);
}, 60000);

afterAll(async () => {
    await shutdownTestApp();
});

describe('GET /api/reports/desempeno/*', () => {
    it('returns 200 with the overview shape for an authenticated allowed-role user', async () => {
        const response = await withAuth(request(app).get('/api/reports/desempeno/overview'), adminToken);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('years');
        expect(response.body).toHaveProperty('kpisByYear');
        expect(response.body).toHaveProperty('monthlyCalificacion');
        expect(response.body).toHaveProperty('monthlyCompliance');
    });

    it('returns the yates shape', async () => {
        const response = await withAuth(request(app).get('/api/reports/desempeno/yates'), adminToken);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('avgByYate');
        expect(response.body).toHaveProperty('kpis');
    });

    it('returns the personas shape, including the new yearly/per-yate breakdowns', async () => {
        const response = await withAuth(request(app).get('/api/reports/desempeno/personas'), adminToken);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('porEvaluado');
        expect(response.body).toHaveProperty('comentarios');
        expect(response.body).toHaveProperty('kpisByYear');
        expect(response.body).toHaveProperty('kpis');
        expect(response.body).toHaveProperty('avgByYate');
        expect(response.body).toHaveProperty('monthlyCalificacionByYate');
    });

    it('returns the preguntas shape, including porFuncionMes', async () => {
        const response = await withAuth(request(app).get('/api/reports/desempeno/preguntas'), adminToken);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('competencias');
        expect(response.body).toHaveProperty('porMes');
        expect(response.body).toHaveProperty('porFuncionMes');
    });

    it('returns 403 without a token', async () => {
        const response = await request(app).get('/api/reports/desempeno/overview');
        expect(response.status).toBe(403);
    });

    it('returns 403 for a role outside the allowed list', async () => {
        const restrictedToken = jwt.sign({ id: 999, rol: 'rrhh' }, process.env.JWT_SECRET, {
            expiresIn: '10h',
            algorithm: 'HS512',
        });

        const response = await withAuth(request(app).get('/api/reports/desempeno/overview'), restrictedToken);
        expect(response.status).toBe(403);
    });
});
