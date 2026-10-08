const request = require('supertest');
const { bootTestApp, shutdownTestApp } = require('../../helpers/testApp');
const { createAuthenticatedUser } = require('../../helpers/auth');
const { createCompanyWithYacht } = require('../../helpers/staffFixtures');
const Cruise = require('../../../src/models/bar/cruises.models');
const Passenger = require('../../../src/models/bar/passenger.models');
const ConsumerCard = require('../../../src/models/bar/consumerCard.models');
const Utils = require('../../../src/utils/Utils');

let app;
let token;
let yacht;
let fixtureCounter = 0;

const auth = (httpRequest) => httpRequest.set('Authorization', `Bearer ${token}`);
const suffix = () => {
    fixtureCounter += 1;
    return `${Date.now()}-${fixtureCounter}`;
};

beforeAll(async () => {
    app = await bootTestApp();
    token = await createAuthenticatedUser(app);
    ({ yacht } = await createCompanyWithYacht('Bar Cruises Co', 'Bar Cruises Yacht'));
}, 60000);

afterAll(async () => {
    await shutdownTestApp();
});

async function createCruiseFixture(overrides = {}) {
    return Cruise.create({
        yachtId: yacht.id,
        code: `CR-${suffix()}`,
        name: 'Cliente Test',
        itinerary: 'A - Norte',
        startDate: new Date('2026-03-01'),
        endDate: new Date('2026-03-08'),
        ...overrides,
    });
}

// =========================================================================
// GET /api/bar/cruises
// =========================================================================

describe('GET /api/bar/cruises — lista de cruceros', () => {
    it('devuelve 200 con ids y yachtId codificados como hashid', async () => {
        const cruise = await createCruiseFixture();

        const response = await auth(request(app).get('/api/bar/cruises'));

        expect(response.status).toBe(200);
        const found = response.body.find((item) => item.id === Utils.encode(cruise.id));
        expect(found).toBeDefined();
        expect(found.yachtId).toBe(Utils.encode(yacht.id));
    });

    it('devuelve 403 sin JWT', async () => {
        const response = await request(app).get('/api/bar/cruises');

        expect(response.status).toBe(403);
    });
});

// =========================================================================
// GET /api/bar/cruises/:cruise_id
// =========================================================================

describe('GET /api/bar/cruises/:cruise_id — crucero por ID', () => {
    it('devuelve 200 con el id codificado', async () => {
        const cruise = await createCruiseFixture();

        const response = await auth(
            request(app).get(`/api/bar/cruises/${Utils.encode(cruise.id)}`)
        );

        expect(response.status).toBe(200);
        expect(response.body.id).toBe(Utils.encode(cruise.id));
    });

    it('devuelve 400 con hashid inválido', async () => {
        const response = await auth(request(app).get('/api/bar/cruises/not-a-hashid'));

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 404 cuando el crucero no existe', async () => {
        const response = await auth(
            request(app).get(`/api/bar/cruises/${Utils.encode(999999)}`)
        );

        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe('AppError');
    });
});

// =========================================================================
// PUT /api/bar/cruises/:cruise_id
// =========================================================================

describe('PUT /api/bar/cruises/:cruise_id — actualizar crucero', () => {
    it('devuelve 200 y persiste el cambio', async () => {
        const cruise = await createCruiseFixture();

        const response = await auth(
            request(app)
                .put(`/api/bar/cruises/${Utils.encode(cruise.id)}`)
                .send({ cruiseState: 'close' })
        );

        expect(response.status).toBe(200);
        expect(response.body.data).toBe('resource updated successfully');
        await cruise.reload();
        expect(cruise.cruiseState).toBe('close');
    });

    it('devuelve 404 cuando el crucero no existe', async () => {
        const response = await auth(
            request(app)
                .put(`/api/bar/cruises/${Utils.encode(999999)}`)
                .send({ cruiseState: 'close' })
        );

        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 400 con hashid inválido', async () => {
        const response = await auth(
            request(app).put('/api/bar/cruises/not-a-hashid').send({ cruiseState: 'close' })
        );

        expect(response.status).toBe(400);
    });
});

// =========================================================================
// PUT /api/bar/cruises/sendCruiseReport/:cruise_id
// =========================================================================

describe('PUT /api/bar/cruises/sendCruiseReport/:cruise_id', () => {
    it('devuelve 400 con user_id inválido', async () => {
        const cruise = await createCruiseFixture();

        const response = await auth(
            request(app)
                .put(`/api/bar/cruises/sendCruiseReport/${Utils.encode(cruise.id)}?user_id=not-a-hashid`)
                .send({})
        );

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('AppError');
    });

    it('devuelve 404 cuando el crucero no existe', async () => {
        const response = await auth(
            request(app)
                .put(`/api/bar/cruises/sendCruiseReport/${Utils.encode(999999)}?user_id=${Utils.encode(1)}`)
                .send({})
        );

        expect(response.status).toBe(404);
    });

    describe('informe parcial (día del traslado)', () => {
        // transferDay = 1 con el crucero iniciado hoy: hoy es el día del traslado.
        const partialCruise = () => createCruiseFixture({ transferDay: 1, startDate: new Date(), endDate: new Date(Date.now() + 14 * 86400000) });
        const createPassenger = (cruise, type, name) => Passenger.create({
            cruiseId: cruise.id,
            identificationNumber: `ID-${suffix()}`,
            name,
            cabin: '1',
            type,
            nationality: 'EC',
            country: 'Ecuador',
            gender: 'Male',
            cruiseStartDate: cruise.startDate,
            cruiseEndDate: cruise.endDate,
        });
        const send = (cruise) => auth(
            request(app)
                .put(`/api/bar/cruises/sendCruiseReport/${Utils.encode(cruise.id)}?user_id=${Utils.encode(1)}`)
                .send({})
        );

        it('liquida a los PP sin consumos, deja el crucero abierto y no toca a los TO', async () => {
            const cruise = await partialCruise();
            const pp = await createPassenger(cruise, 'PP', 'Pasajero PP');
            const to = await createPassenger(cruise, 'TO', 'Pasajero TO');

            const response = await send(cruise);

            expect(response.status).toBe(200);
            expect(response.body.data).toMatch(/parcial PP/);
            expect((await pp.reload()).settled).toBe(true);
            expect((await to.reload()).settled).toBe(false);
            expect((await cruise.reload()).cruiseState).toBe('open');
        });

        it('devuelve 400 y no liquida a un PP con saldo sin cobrar', async () => {
            const cruise = await partialCruise();
            const pp = await createPassenger(cruise, 'PP', 'PP con deuda');
            await ConsumerCard.create({ numberCard: `C-${suffix()}`, passengerId: pp.id, totalCount: 25, paidAccount: false });

            const response = await send(cruise);

            expect(response.status).toBe(400);
            expect(response.body.error.message).toMatch(/PP con saldo sin cobrar/);
            expect((await pp.reload()).settled).toBe(false);
        });
    });

    it('devuelve 400 cuando el crucero no tiene tarjetas válidas para reportar', async () => {
        const cruise = await createCruiseFixture();

        const response = await auth(
            request(app)
                .put(`/api/bar/cruises/sendCruiseReport/${Utils.encode(cruise.id)}?user_id=${Utils.encode(1)}`)
                .send({})
        );

        expect(response.status).toBe(400);
        expect(response.body.error.message).toMatch(/consumer cards/);
    });
});
