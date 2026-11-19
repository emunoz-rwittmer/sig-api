jest.mock('../../../src/utils/Utils', () => ({
    encode: jest.fn((id) => `encoded-${id}`)
}));
jest.mock('../../../src/models/operations/comentCard/cardYacht.models', () => ({}));
jest.mock('../../../src/models/operations/comentCard/cardQR.models', () => ({}));
jest.mock('../../../src/models/operations/surveys/shipmentDates.models', () => ({ findAll: jest.fn() }));
jest.mock('../../../src/models/catalogs/staffCompany.models', () => ({}));
jest.mock('../../../src/models/catalogs/staff.models', () => ({}));
jest.mock('../../../src/models/catalogs/company.models', () => ({}));
jest.mock('../../../src/models/catalogs/yacht.models', () => ({}));
jest.mock('../../../src/models/operations/surveys/formRespond.models', () => ({
    findAll: jest.fn(),
    bulkCreate: jest.fn()
}));
jest.mock('../../../src/models/catalogs/positions.models', () => ({}));
jest.mock('../../../src/models/operations/surveys/weeklyEvaluationSetting.models', () => ({ findAll: jest.fn(), findOrCreate: jest.fn() }));
jest.mock('../../../src/models/operations/surveys/form.models', () => ({ findAll: jest.fn() }));
jest.mock('../../../src/utils/database', () => ({}));
jest.mock('../../../src/models/catalogs/staffDocumentation.models', () => ({ findAll: jest.fn() }));
jest.mock('../../../src/models/catalogs/documentation.models', () => ({}));
jest.mock('../../../src/mails/mailer', () => ({
    sendEmailEvaluationCrew: jest.fn(),
    sendEmailCommentCard: jest.fn(),
    sendEmailStaffDocumentExpiring: jest.fn(),
    sendEmailRRHHDocumentExpiringDigest: jest.fn()
}));
jest.mock('../../../src/models/bar/cruises.models', () => ({}));
jest.mock('../../../src/models/bar/passenger.models', () => ({}));
jest.mock('../../../src/models/bar/consumerCardCount.model', () => ({}));
jest.mock('../../../src/models/bar/consumerCard.models', () => ({}));
jest.mock('../../../src/models/bar/cortecyCard.models', () => ({}));

const ShipmentDates = require('../../../src/models/operations/surveys/shipmentDates.models');
const FormRespond = require('../../../src/models/operations/surveys/formRespond.models');
const Form = require('../../../src/models/operations/surveys/form.models');
const WeeklyEvaluationSetting = require('../../../src/models/operations/surveys/weeklyEvaluationSetting.models');
const { sendEmailEvaluationCrew } = require('../../../src/mails/mailer');
const CronJobs = require('../../../src/controllers/cronJobs.controller');
const { Op } = require('sequelize');

function buildShipment({ companyId, staffId, positionId, positionName }) {
    const staff = {
        id: staffId,
        firstName: `Nombre${staffId}`,
        lastName: `Apellido${staffId}`,
        staff_position: { id: positionId, name: positionName }
    };

    staff.toJSON = jest.fn(() => ({ ...staff }));

    return {
        id: staffId,
        empresa: {
            companyId,
            staff
        }
    };
}

describe('generateWeeklyEvaluationCrew', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        WeeklyEvaluationSetting.findAll.mockResolvedValue([]);
        FormRespond.findAll.mockResolvedValue([]);
        FormRespond.bulkCreate.mockResolvedValue([]);
        sendEmailEvaluationCrew.mockResolvedValue(undefined);
        Form.findAll.mockResolvedValue([
            { id: 100, positions: ['encoded-11'], isAdministrative: false },
            { id: 101, positions: ['encoded-10'], isAdministrative: false }
        ]);
    });

    const twoYachts = () => [
        buildShipment({ companyId: 1, staffId: 1, positionId: 10, positionName: 'Capitán' }),
        buildShipment({ companyId: 1, staffId: 2, positionId: 11, positionName: 'Marinero' }),
        buildShipment({ companyId: 4, staffId: 3, positionId: 10, positionName: 'Capitán' }),
        buildShipment({ companyId: 4, staffId: 4, positionId: 11, positionName: 'Marinero' })
    ];

    it('omite los barcos desactivados en el panel y genera los demás', async () => {
        WeeklyEvaluationSetting.findAll.mockResolvedValue([{ companyId: 1 }]);
        ShipmentDates.findAll.mockResolvedValue(twoYachts());

        await CronJobs.generateWeeklyEvaluationCrew();

        expect(FormRespond.bulkCreate).toHaveBeenCalledTimes(1);
        const evaluations = FormRespond.bulkCreate.mock.calls[0][0];
        expect(evaluations).toHaveLength(2);
        expect(evaluations.every((evaluation) => evaluation.companyId === 4)).toBe(true);
        expect(sendEmailEvaluationCrew).toHaveBeenCalledTimes(1);
    });

    it('el envío manual solo crea las evaluaciones de los barcos pedidos', async () => {
        ShipmentDates.findAll.mockResolvedValue(twoYachts());

        const result = await CronJobs.sendWeeklyEvaluationCrewNow([1]);

        const evaluations = FormRespond.bulkCreate.mock.calls[0][0];
        expect(evaluations).toHaveLength(2);
        expect(evaluations.every((evaluation) => evaluation.companyId === 1)).toBe(true);
        expect(result).toEqual(expect.objectContaining({ created: 2, createdByCompany: { 1: 2 } }));
        expect(sendEmailEvaluationCrew).toHaveBeenCalledTimes(1);
    });

    it('el envío manual no duplica lo ya creado en la semana ni avisa si no creó nada', async () => {
        ShipmentDates.findAll.mockResolvedValue(twoYachts());
        FormRespond.findAll.mockResolvedValue([
            { companyId: '1', formId: 100, evaluator: 'Nombre1 Apellido1', evaluated: 'Nombre2 Apellido2' },
            { companyId: '1', formId: 101, evaluator: 'Nombre2 Apellido2', evaluated: 'Nombre1 Apellido1' }
        ]);

        const result = await CronJobs.sendWeeklyEvaluationCrewNow([1]);

        expect(FormRespond.findAll.mock.calls[0][0].where).toHaveProperty([Op.or]);
        expect(FormRespond.bulkCreate).not.toHaveBeenCalled();
        expect(result.created).toBe(0);
        expect(sendEmailEvaluationCrew).not.toHaveBeenCalled();
    });
});
