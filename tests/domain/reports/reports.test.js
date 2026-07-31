const request = require('supertest');
const { bootTestApp, shutdownTestApp } = require('../../helpers/testApp');
const { createAuthenticatedUser } = require('../../helpers/auth');
const { createDepartment, createPosition, createCompanyWithYacht } = require('../../helpers/staffFixtures');
const Staff = require('../../../src/models/catalogs/staff.models');
const Order = require('../../../src/models/operations/orders/order.models');
const OrderItems = require('../../../src/models/operations/orders/orderItems.models');
const Product = require('../../../src/models/operations/inventory/product.models');
const Warehouse = require('../../../src/models/catalogs/wareHouse.models');
const Stock = require('../../../src/models/operations/inventory/stock.models');
const Transaction = require('../../../src/models/operations/inventory/transaction.models');
const Form = require('../../../src/models/operations/surveys/form.models');
const FormQuestion = require('../../../src/models/operations/surveys/formQuestion.models');
const FormRespond = require('../../../src/models/operations/surveys/formRespond.models');
const FormAnswers = require('../../../src/models/operations/surveys/formAnswers.models');
const ComentCard = require('../../../src/models/operations/comentCard/comentCard.models');
const ComentCardQuestions = require('../../../src/models/operations/comentCard/comentCardQuestions.models');
const ComentCardYacht = require('../../../src/models/operations/comentCard/cardYacht.models');
const ComentCardQR = require('../../../src/models/operations/comentCard/cardQR.models');
const ComentCardRespond = require('../../../src/models/operations/comentCard/comentCardRespond.models');
const ComentCardAnswers = require('../../../src/models/operations/comentCard/comentCardAnswers.models');
const Utils = require('../../../src/utils/Utils');
const Positions = require('../../../src/models/catalogs/positions.models');
const Staffervice = require('../../../src/services/catalogs/staff.services');

let app;
let token;
let fixtureCounter = 0;

const auth = (httpRequest) => httpRequest.set('Authorization', `Bearer ${token}`);
const suffix = () => {
    fixtureCounter += 1;
    return `${Date.now()}-${fixtureCounter}`;
};

beforeAll(async () => {
    app = await bootTestApp();
    token = await createAuthenticatedUser(app);
}, 60000);

afterAll(async () => {
    await shutdownTestApp();
});

async function createStaffFixture(overrides = {}) {
    const departament = await createDepartment();
    const position = await createPosition();
    const uniqueSuffix = suffix();
    return Staff.create({
        firstName: 'TEST_AUTOMATED',
        lastName: `Reports${uniqueSuffix}`,
        email: `reports-test-${uniqueSuffix}@example.com`,
        cellPhone: '0966666666',
        password: 'Sup3rSecret!',
        departamentId: departament.id,
        positionId: position.id,
        contractType: 'Fijo',
        active: true,
        ...overrides,
    });
}

describe('Reports — order excel', () => {
    it('generates the order report with the default (missing) logo file', async () => {
        const { company } = await createCompanyWithYacht(`Order Company ${suffix()}`);
        const staff = await createStaffFixture();
        const order = await Order.create({
            companyId: company.id,
            userId: staff.id,
            status: 'PENDIENTE',
            guide: 'G-001',
        });
        await OrderItems.create({
            orderId: order.id,
            product: 'Producto Test',
            quantity: 3,
            status: 'PENDIENTE',
        });

        const response = await auth(
            request(app).get(`/api/reports/order/${Utils.encode(order.id)}`)
        );

        expect(response.status).toBe(200);
        expect(response.headers['content-disposition']).toContain('attachment');
    });

    it('returns 404 when the order does not exist', async () => {
        const response = await auth(
            request(app).get(`/api/reports/order/${Utils.encode(999999999)}`)
        );

        expect(response.status).toBe(404);
        expect(response.body.error.message).toBe('Orden no encontrada');
    });

    it('returns 400 for an invalid hashid', async () => {
        const response = await auth(request(app).get('/api/reports/order/not-a-hashid'));

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('AppError');
    });

    it('returns 400 when the order has no items', async () => {
        const { company } = await createCompanyWithYacht(`Order Empty Company ${suffix()}`);
        const staff = await createStaffFixture();
        const order = await Order.create({
            companyId: company.id,
            userId: staff.id,
            status: 'PENDIENTE',
        });

        const response = await auth(
            request(app).get(`/api/reports/order/${Utils.encode(order.id)}`)
        );

        expect(response.status).toBe(400);
        expect(response.body.error.message).toBe('No hay items en la orden.');
    });
});

describe('Reports — stock excel', () => {
    it('generates the stock report from the request body', async () => {
        const response = await auth(
            request(app).post('/api/reports/stockWarehouse').send({
                warehouseName: 'Bodega Test',
                products: [
                    { sku: 'SKU-1', name: 'Producto 1', quantity: 10, min: 5, max: 20 },
                ],
            })
        );

        expect(response.status).toBe(200);
        expect(response.headers['content-disposition']).toContain('attachment');
    });

    it('returns 400 when products is missing', async () => {
        const response = await auth(
            request(app).post('/api/reports/stockWarehouse').send({ warehouseName: 'Bodega Test' })
        );

        expect(response.status).toBe(400);
        expect(response.body.error.message).toBe('products es requerido');
    });
});

describe('Reports — transactions excel', () => {
    it('generates the transactions report for a stock', async () => {
        const { company } = await createCompanyWithYacht(`Stock Company ${suffix()}`);
        const staff = await createStaffFixture();
        const warehouse = await Warehouse.create({ name: `Bodega ${suffix()}`, location: 'Base', type: 'general' });
        const product = await Product.create({ name: `Producto ${suffix()}`, type: 'DISCRETE' });
        const stock = await Stock.create({
            productId: product.id,
            warehouseId: warehouse.id,
            companyId: company.id,
            quantity: 5,
        });
        await Transaction.create({
            userId: staff.id,
            productId: product.id,
            warehouseToId: warehouse.id,
            type: 'IN',
            quantity: 5,
        });

        const response = await auth(
            request(app).get(`/api/reports/transactions/stock/${Utils.encode(stock.id)}`)
        );

        expect(response.status).toBe(200);
        expect(response.headers['content-disposition']).toContain('attachment');
    });

    it('returns 404 when the stock does not exist', async () => {
        const response = await auth(
            request(app).get(`/api/reports/transactions/stock/${Utils.encode(999999999)}`)
        );

        expect(response.status).toBe(404);
        expect(response.body.error.message).toBe('Stock no encontrado');
    });
});

describe('Reports — evaluations general report', () => {
    it('generates the general evaluations report for a company', async () => {
        const { company } = await createCompanyWithYacht(`Eval Company ${suffix()}`);
        const form = await Form.create({ name: `Form ${suffix()}`, positions: [] });
        const question = await FormQuestion.create({
            formId: form.id,
            title: '¿Cómo calificarías?',
            type: 'scale',
        });
        const respond = await FormRespond.create({
            companyId: company.id,
            formId: form.id,
            state: 'FINALIZADO',
            evaluator: 'Evaluador Test',
            evaluated: 'Evaluado Test',
            expirationDate: new Date('2026-08-01'),
        });
        await FormAnswers.create({
            respuestaId: respond.id,
            questionId: question.id,
            answer: '5',
        });

        const response = await auth(
            request(app).get(`/api/reports/evaluations/generalReport/${Utils.encode(company.id)}`)
        );

        expect(response.status).toBe(200);
        expect(response.headers['content-disposition']).toContain('attachment');
    });

    it('returns 400 when there are no evaluations for the company', async () => {
        const { company } = await createCompanyWithYacht(`Eval Empty Company ${suffix()}`);

        const response = await auth(
            request(app).get(`/api/reports/evaluations/generalReport/${Utils.encode(company.id)}`)
        );

        expect(response.status).toBe(400);
        expect(response.body.error.message).toBe('No hay registros.');
    });
});

describe('Staffervice — getPositionByLastName', () => {
    it('devuelve el nombre del cargo para un apellido existente', async () => {
        const departament = await createDepartment();
        const position = await createPosition(`Capataz ${suffix()}`);
        const lastName = `Chavez${suffix()} Ortiz`;

        await Staff.create({
            firstName: 'Rene Alberto',
            lastName,
            email: `staff-lookup-${suffix()}@example.com`,
            cellPhone: '0987654321',
            password: 'Sup3rSecret!',
            departamentId: departament.id,
            positionId: position.id,
            contractType: 'Fijo',
            active: true,
        });

        const cargo = await Staffervice.getPositionByLastName(lastName);

        expect(cargo).toBe(position.name);
    });

    it('devuelve null cuando no existe personal activo con ese apellido', async () => {
        const cargo = await Staffervice.getPositionByLastName(`Apellido Inexistente ${suffix()}`);

        expect(cargo).toBeNull();
    });
});

describe('Reports — evaluations by employed', () => {
    it('generates the report from the request body', async () => {
        const response = await auth(
            request(app).post('/api/reports/evaluations/reportByEmployed').send({
                reportingEvaluationsByCrewState: {
                    crew: { first_name: 'Juan', last_name: 'Perez', staff_position: { name: 'Marinero' } },
                },
                dataForReport: {
                    startDate: '2026-07-01',
                    endDate: '2026-07-31',
                    averageGeneral: 4.5,
                    averageReviews: [
                        {
                            createdAt: new Date('2026-07-15'),
                            header_yacht: { name: 'Yate Test' },
                            header_evaluator: { firstName: 'Ana', lastName: 'Lopez' },
                            state: { state: 'FINALIZADO' },
                            promedio: 4.5,
                        },
                    ],
                },
            })
        );

        expect(response.status).toBe(200);
        expect(response.headers['content-disposition']).toContain('attachment');
    });

    it('returns 400 when dataForReport.averageReviews is missing', async () => {
        const response = await auth(
            request(app).post('/api/reports/evaluations/reportByEmployed').send({
                reportingEvaluationsByCrewState: {},
                dataForReport: {},
            })
        );

        expect(response.status).toBe(400);
        expect(response.body.error.message).toBe('dataForReport.averageReviews es requerido');
    });
});

describe('Reports — comment cards report', () => {
    const createCommentCardFixture = async () => {
        const cardSuffix = suffix();
        const { yacht } = await createCompanyWithYacht(
            `CC Report Company ${cardSuffix}`,
            `CC Report Yacht ${cardSuffix}`
        );
        const card = await ComentCard.create({ name: `Comment Card ${cardSuffix}` });
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
        ]);
        const cardYacht = await ComentCardYacht.create({ cardId: card.id, yachtId: yacht.id });
        const qr = await ComentCardQR.create({
            comentCardYachtId: cardYacht.id,
            accessLink: `https://example.test/comment-card/${cardSuffix}`,
            code: `QR-${cardSuffix}`,
            name: `Salida ${cardSuffix}`,
            startDate: new Date('2026-07-01T00:00:00.000Z'),
            endDate: new Date('2026-07-10T23:59:59.000Z'),
        });
        return { yacht, questions, qr };
    };

    it('generates the comment cards report for a yacht', async () => {
        const { yacht, questions, qr } = await createCommentCardFixture();
        const submitted = await ComentCardRespond.create({
            cardQrId: qr.id,
            fullName: 'Pasajero Reporte',
            cabin: 12,
            isSubmited: true,
        });
        await ComentCardAnswers.create({
            respuestaId: submitted.id,
            questionId: questions[0].id,
            answer: '5',
        });

        const response = await auth(
            request(app)
                .get(`/api/reports/comentCards/generateReport/${Utils.encode(yacht.id)}`)
                .query({ startDate: '2026-07-01', endDate: '2026-07-11' })
        );

        expect(response.status).toBe(200);
        expect(response.headers['content-disposition']).toContain('attachment');
    });

    it('returns 400 when there are no comment cards for the yacht', async () => {
        const { yacht } = await createCommentCardFixture();

        const response = await auth(
            request(app)
                .get(`/api/reports/comentCards/generateReport/${Utils.encode(yacht.id)}`)
                .query({ startDate: '2026-07-01', endDate: '2026-07-11' })
        );

        expect(response.status).toBe(400);
        expect(response.body.error.message).toBe('No hay registros.');
    });
});

describe('Reports — request excel removed', () => {
    it('no longer exposes GET /api/reports/request/:request_id', async () => {
        const response = await auth(
            request(app).get(`/api/reports/request/${Utils.encode(1)}`)
        );

        expect(response.status).toBe(404);
    });
});
