const request = require('supertest');
const { bootTestApp, shutdownTestApp } = require('../../helpers/testApp');
const { createAuthenticatedUser } = require('../../helpers/auth');
const { createCompanyWithYacht } = require('../../helpers/staffFixtures');
const ComentCard = require('../../../src/models/operations/comentCard/comentCard.models');
const ComentCardQuestions = require('../../../src/models/operations/comentCard/comentCardQuestions.models');
const ComentCardYacht = require('../../../src/models/operations/comentCard/cardYacht.models');
const ComentCardQR = require('../../../src/models/operations/comentCard/cardQR.models');
const ComentCardRespond = require('../../../src/models/operations/comentCard/comentCardRespond.models');
const ComentCardAnswers = require('../../../src/models/operations/comentCard/comentCardAnswers.models');
const ComentCardService = require('../../../src/services/operations/comentCard/comentCard.services');
const Utils = require('../../../src/utils/Utils');

let app;
let token;
let fixtureCounter = 0;

const auth = (httpRequest) => httpRequest.set('Authorization', `Bearer ${token}`);

const createFixture = async () => {
    fixtureCounter += 1;
    const suffix = `${Date.now()}-${fixtureCounter}`;
    const { yacht } = await createCompanyWithYacht(
        `Comment Card Company ${suffix}`,
        `Comment Card Yacht ${suffix}`
    );
    const card = await ComentCard.create({ name: `Comment Card ${suffix}` });
    const questions = await ComentCardQuestions.bulkCreate([
        {
            comentCardId: card.id,
            title: 'Califique el servicio',
            type: 'scale',
            required: true,
            scaleMin: 1,
            scaleMax: 5,
            options: [],
        },
        {
            comentCardId: card.id,
            title: '¿Qué podemos mejorar?',
            type: 'select',
            required: false,
            options: ['Comida', 'Servicio'],
        },
    ]);
    const cardYacht = await ComentCardYacht.create({
        cardId: card.id,
        yachtId: yacht.id,
    });
    const qr = await ComentCardQR.create({
        comentCardYachtId: cardYacht.id,
        accessLink: `https://example.test/comment-card/${suffix}`,
        code: `QR-${suffix}`,
        name: `Salida ${suffix}`,
        startDate: new Date('2026-07-01T00:00:00.000Z'),
        endDate: new Date('2026-07-10T23:59:59.000Z'),
    });

    return { yacht, card, questions, cardYacht, qr };
};

beforeAll(async () => {
    app = await bootTestApp();
    token = await createAuthenticatedUser(app);
});

afterAll(async () => {
    await shutdownTestApp();
});

describe('operaciones/comentCard', () => {
    it('requires authentication on the administrative list', async () => {
        const response = await request(app).get('/api/coment_cards');

        expect(response.status).toBe(403);
    });

    it('lists comment-card/yacht relations with encoded identifiers', async () => {
        const { card, yacht, cardYacht } = await createFixture();

        const response = await auth(request(app).get('/api/coment_cards'));

        expect(response.status).toBe(200);
        const found = response.body.find((item) => item.id === Utils.encode(cardYacht.id));
        expect(found.cardId).toBe(Utils.encode(card.id));
        expect(found.yachtId).toBe(Utils.encode(yacht.id));
        expect(found.coment_card.name).toBe(card.name);
        expect(found.yate.name).toBe(yacht.name);
    });

    it('returns one comment card and reports invalid or missing identifiers correctly', async () => {
        const { card, yacht } = await createFixture();

        const response = await auth(
            request(app).get(`/api/coment_cards/${Utils.encode(card.id)}`)
        );
        expect(response.status).toBe(200);
        expect(response.body.id).toBe(Utils.encode(card.id));
        expect(response.body.yates[0].yate.id).toBe(Utils.encode(yacht.id));
        expect(response.body.preguntas).toHaveLength(2);

        const missing = await auth(
            request(app).get(`/api/coment_cards/${Utils.encode(999999999)}`)
        );
        expect(missing.status).toBe(404);
        expect(missing.body.error.message).toBe('Comment card no encontrada');

        const invalid = await auth(request(app).get('/api/coment_cards/not-a-hash'));
        expect(invalid.status).toBe(400);
        expect(invalid.body.error.code).toBe('AppError');
    });

    it('creates a comment card and all question fields in one transaction', async () => {
        const name = `Created Comment Card ${Date.now()}`;
        const response = await auth(
            request(app)
                .post('/api/coment_cards/createComentCard')
                .send({
                    name,
                    preguntas: [{
                        title: 'Seleccione una opción',
                        type: 'select',
                        required: true,
                        scaleMin: 2,
                        scaleMax: 8,
                        options: ['A', 'B'],
                    }],
                })
        );

        expect(response.status).toBe(200);
        const card = await ComentCard.findOne({ where: { name } });
        const question = await ComentCardQuestions.findOne({
            where: { comentCardId: card.id },
        });
        expect(question.options).toEqual(['A', 'B']);
        expect(question.scaleMin).toBe(2);
        expect(question.scaleMax).toBe(8);
    });

    it('rejects an invalid create payload as a business error', async () => {
        const response = await auth(
            request(app)
                .post('/api/coment_cards/createComentCard')
                .send({ name: 'Sin preguntas' })
        );

        expect(response.status).toBe(400);
        expect(response.body.error.message).toBe('name y preguntas son obligatorios');
    });

    it('rolls back the parent card when creating its questions fails', async () => {
        const name = `Rolled Back Comment Card ${Date.now()}`;
        const failure = jest
            .spyOn(ComentCardQuestions, 'bulkCreate')
            .mockRejectedValueOnce(new Error('question insert failed'));

        const response = await auth(
            request(app)
                .post('/api/coment_cards/createComentCard')
                .send({
                    name,
                    preguntas: [{
                        title: 'Pregunta válida',
                        type: 'text',
                        options: [],
                    }],
                })
        );
        failure.mockRestore();

        expect(response.status).toBe(500);
        expect(await ComentCard.findOne({ where: { name } })).toBeNull();
    });

    it('updates the card and persists question options through the Sequelize attribute', async () => {
        const { card, questions } = await createFixture();
        const response = await auth(
            request(app)
                .put(`/api/coment_cards/updateComentCard/${Utils.encode(card.id)}`)
                .send({
                    name: 'Comment Card Actualizada',
                    preguntas: [{
                        id: questions[0].id,
                        title: 'Pregunta actualizada',
                        type: 'select',
                        required: false,
                        options: ['Excelente', 'Bueno'],
                    }],
                })
        );

        expect(response.status).toBe(200);
        await card.reload();
        await questions[0].reload();
        expect(card.name).toBe('Comment Card Actualizada');
        expect(questions[0].title).toBe('Pregunta actualizada');
        expect(questions[0].options).toEqual(['Excelente', 'Bueno']);
    });

    it('returns 404 when updating or deleting a missing card', async () => {
        const encodedMissingId = Utils.encode(999999999);
        const update = await auth(
            request(app)
                .put(`/api/coment_cards/updateComentCard/${encodedMissingId}`)
                .send({ name: 'No existe', preguntas: [] })
        );
        const deletion = await auth(
            request(app).delete(`/api/coment_cards/${encodedMissingId}`)
        );

        expect(update.status).toBe(404);
        expect(deletion.status).toBe(404);
    });

    it('deletes an existing card', async () => {
        const card = await ComentCard.create({ name: `Delete ${Date.now()}` });

        const response = await auth(
            request(app).delete(`/api/coment_cards/${Utils.encode(card.id)}`)
        );

        expect(response.status).toBe(200);
        expect(await ComentCard.findByPk(card.id)).toBeNull();
    });

    it('lists yachts assigned to a card and their access links', async () => {
        const { card, yacht, cardYacht, qr } = await createFixture();

        const yachts = await auth(
            request(app).get(
                `/api/coment_cards/${Utils.encode(card.id)}/cards_yachts/yachts`
            )
        );
        expect(yachts.status).toBe(200);
        expect(yachts.body[0].id).toBe(Utils.encode(cardYacht.id));
        expect(yachts.body[0].yate.id).toBe(Utils.encode(yacht.id));
        expect(yachts.body[0].links_acceso[0].id).toBe(qr.id);

        const links = await request(app).get(
            `/api/coment_cards/access_links/relation/${Utils.encode(cardYacht.id)}`
        );
        expect(links.status).toBe(200);
        expect(links.body[0].id).toBe(Utils.encode(qr.id));
        expect(links.body[0].access_link).toBe(qr.accessLink);
    });

    it('lists submitted responses with answers ordered by question id', async () => {
        const { questions, qr } = await createFixture();
        const submitted = await ComentCardRespond.create({
            cardQrId: qr.id,
            fullName: 'Pasajero Uno',
            cabin: 12,
            isSubmited: true,
        });
        await ComentCardAnswers.bulkCreate([
            {
                respuestaId: submitted.id,
                questionId: questions[1].id,
                answer: 'Servicio',
            },
            {
                respuestaId: submitted.id,
                questionId: questions[0].id,
                answer: '5',
            },
        ]);

        const response = await request(app).get(
            `/api/coment_cards/coment_cards_link/${Utils.encode(qr.id)}`
        );

        expect(response.status).toBe(200);
        expect(response.body[0].id).toBe(Utils.encode(submitted.id));
        expect(response.body[0].nombre_completo).toBe('Pasajero Uno');
        expect(response.body[0].respuestas.map((item) => item.pregunta.id)).toEqual([
            questions[0].id,
            questions[1].id,
        ]);
    });

    it('returns a public comment card by QR and a 404 for an unknown QR', async () => {
        const { card, qr } = await createFixture();

        const response = await request(app).get(
            `/api/coment_cards/coment_card_by_qr/${Utils.encode(qr.id)}`
        );
        expect(response.status).toBe(200);
        expect(response.body.id).toBe(Utils.encode(qr.id));
        expect(response.body.card_yacht.coment_card.id).toBe(card.id);

        const missing = await request(app).get(
            `/api/coment_cards/coment_card_by_qr/${Utils.encode(999999999)}`
        );
        expect(missing.status).toBe(404);
    });

    it('finds the active public link by yacht/date and validates the date', async () => {
        // Desalinear los autoincrementos de yacht y coment_card_yacht evita
        // que una comparación accidental contra el ID de la relación pase.
        await createCompanyWithYacht(
            `Unassigned Company ${Date.now()}`,
            `Unassigned Yacht ${Date.now()}`
        );
        const { yacht, cardYacht, qr } = await createFixture();
        expect(yacht.id).not.toBe(cardYacht.id);

        const response = await request(app).get(
            `/api/coment_cards/coment_card_by_yacht/dates/${Utils.encode(yacht.id)}`
        ).query({ toDay: '2026-07-03' });
        expect(response.status).toBe(200);
        expect(response.body.accessLink).toBe(qr.accessLink);

        const invalid = await request(app).get(
            `/api/coment_cards/coment_card_by_yacht/dates/${Utils.encode(yacht.id)}`
        ).query({ toDay: 'fecha-invalida' });
        expect(invalid.status).toBe(400);
    });

    it('submits a public response atomically and rejects an unknown QR', async () => {
        const { questions, qr } = await createFixture();
        const response = await request(app)
            .post(`/api/coment_cards/respond_coment_card/${Utils.encode(qr.id)}`)
            .send({
                name: 'Pasajera Dos',
                cabin: 21,
                readPolitics: true,
                answers: {
                    [questions[0].id]: 5,
                    [questions[1].id]: 'Comida',
                },
            });

        expect(response.status).toBe(200);
        const submitted = await ComentCardRespond.findOne({
            where: { cardQrId: qr.id, fullName: 'Pasajera Dos' },
        });
        const answers = await ComentCardAnswers.findAll({
            where: { respuestaId: submitted.id },
            order: [['questionId', 'ASC']],
        });
        expect(submitted.isSubmited).toBe(true);
        expect(answers.map((answer) => answer.answer)).toEqual(['5', 'Comida']);

        const missing = await request(app)
            .post(`/api/coment_cards/respond_coment_card/${Utils.encode(999999999)}`)
            .send({
                name: 'Pasajero',
                cabin: 1,
                answers: {},
            });
        expect(missing.status).toBe(404);
    });

    it('rejects answers that reference a question from another comment card', async () => {
        const first = await createFixture();
        const second = await createFixture();

        const response = await request(app)
            .post(`/api/coment_cards/respond_coment_card/${Utils.encode(first.qr.id)}`)
            .send({
                name: 'Respuesta cruzada',
                cabin: 7,
                answers: {
                    [second.questions[0].id]: 5,
                },
            });

        expect(response.status).toBe(400);
        expect(response.body.error.message).toBe(
            'Una pregunta no pertenece a la comment card'
        );
        expect(await ComentCardRespond.findOne({
            where: { cardQrId: first.qr.id, fullName: 'Respuesta cruzada' },
        })).toBeNull();
    });

    it('reports submitted answers by yacht/date and validates paired dates', async () => {
        const { yacht, questions, qr } = await createFixture();
        const submitted = await ComentCardRespond.create({
            cardQrId: qr.id,
            fullName: 'Reporte',
            cabin: 30,
            isSubmited: true,
        });
        await ComentCardAnswers.create({
            respuestaId: submitted.id,
            questionId: questions[0].id,
            answer: '4',
        });

        const response = await request(app)
            .get(`/api/coment_cards/reports/${Utils.encode(yacht.id)}`)
            .query({ startDate: '2026-07-01', endDate: '2026-07-11' });
        expect(response.status).toBe(200);
        expect(response.body.some((item) => item.id === submitted.id)).toBe(true);

        const invalid = await request(app)
            .get(`/api/coment_cards/reports/${Utils.encode(yacht.id)}`)
            .query({ startDate: '2026-07-01' });
        expect(invalid.status).toBe(400);
    });

    it('delegates unexpected failures to the global 500 handler', async () => {
        const failure = jest
            .spyOn(ComentCardService, 'getAll')
            .mockRejectedValueOnce(new Error('database unavailable'));

        const response = await auth(request(app).get('/api/coment_cards'));

        expect(response.status).toBe(500);
        expect(response.body).toEqual({
            error: {
                message: 'database unavailable',
                code: 'INTERNAL_ERROR',
            },
        });
        failure.mockRestore();
    });
});
