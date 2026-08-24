jest.mock('../../../src/utils/Utils', () => ({
    encode: jest.fn((id) => `encoded-${id}`)
}));
jest.mock('../../../src/models/operations/comentCard/cardYacht.models', () => ({}));
jest.mock('../../../src/models/operations/comentCard/cardQR.models', () => ({}));
jest.mock('../../../src/models/operations/surveys/shipmentDates.models', () => ({ findAll: jest.fn() }));
jest.mock('../../../src/models/catalogs/staffCompany.models', () => ({}));
jest.mock('../../../src/models/catalogs/staff.models', () => ({}));
jest.mock('../../../src/models/catalogs/company.models', () => ({}));
jest.mock('../../../src/models/operations/surveys/formRespond.models', () => ({
    findAll: jest.fn(),
    bulkCreate: jest.fn()
}));
jest.mock('../../../src/models/catalogs/positions.models', () => ({}));
jest.mock('../../../src/models/operations/surveys/form.models', () => ({ findAll: jest.fn() }));
jest.mock('../../../src/utils/database', () => ({}));
jest.mock('../../../src/mails/mailer', () => ({
    sendEmailEvaluationCrew: jest.fn(),
    sendEmailCommentCard: jest.fn()
}));
jest.mock('../../../src/models/bar/cruises.models', () => ({}));
jest.mock('../../../src/models/bar/passenger.models', () => ({}));
jest.mock('../../../src/models/bar/consumerCardCount.model', () => ({}));
jest.mock('../../../src/models/bar/consumerCard.models', () => ({}));
jest.mock('../../../src/models/bar/cortecyCard.models', () => ({}));

const ShipmentDates = require('../../../src/models/operations/surveys/shipmentDates.models');
const FormRespond = require('../../../src/models/operations/surveys/formRespond.models');
const Form = require('../../../src/models/operations/surveys/form.models');
const { sendEmailEvaluationCrew } = require('../../../src/mails/mailer');
const CronJobs = require('../../../src/controllers/cronJobs.controller');

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
        FormRespond.findAll.mockResolvedValue([]);
        FormRespond.bulkCreate.mockResolvedValue([]);
        sendEmailEvaluationCrew.mockResolvedValue(undefined);
        Form.findAll.mockResolvedValue([
            { id: 100, positions: ['encoded-11'], isAdministrative: false },
            { id: 101, positions: ['encoded-10'], isAdministrative: false }
        ]);
    });

    it('omite companyId 1 y genera las evaluaciones de otros barcos', async () => {
        ShipmentDates.findAll.mockResolvedValue([
            buildShipment({ companyId: 1, staffId: 1, positionId: 10, positionName: 'Capitán' }),
            buildShipment({ companyId: 1, staffId: 2, positionId: 11, positionName: 'Marinero' }),
            buildShipment({ companyId: 4, staffId: 3, positionId: 10, positionName: 'Capitán' }),
            buildShipment({ companyId: 4, staffId: 4, positionId: 11, positionName: 'Marinero' })
        ]);

        await CronJobs.generateWeeklyEvaluationCrew();

        expect(FormRespond.bulkCreate).toHaveBeenCalledTimes(1);
        const evaluations = FormRespond.bulkCreate.mock.calls[0][0];
        expect(evaluations).toHaveLength(2);
        expect(evaluations.every((evaluation) => evaluation.companyId === 4)).toBe(true);
        expect(sendEmailEvaluationCrew).toHaveBeenCalledTimes(1);
    });
});
