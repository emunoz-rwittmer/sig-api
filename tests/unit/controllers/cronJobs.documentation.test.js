jest.mock('../../../src/models/catalogs/staffDocumentation.models', () => ({ findAll: jest.fn() }));
jest.mock('../../../src/models/catalogs/documentation.models', () => ({}));
jest.mock('../../../src/models/catalogs/staff.models', () => ({}));
jest.mock('../../../src/mails/mailer', () => ({
    sendEmailEvaluationCrew: jest.fn(),
    sendEmailCommentCard: jest.fn(),
    sendEmailStaffDocumentExpiring: jest.fn(),
    sendEmailRRHHDocumentExpiringDigest: jest.fn(),
}));
jest.mock('../../../src/utils/Utils', () => ({ encode: jest.fn((id) => `encoded-${id}`) }));
jest.mock('../../../src/models/operations/comentCard/cardYacht.models', () => ({}));
jest.mock('../../../src/models/operations/comentCard/cardQR.models', () => ({}));
jest.mock('../../../src/models/operations/surveys/shipmentDates.models', () => ({ findAll: jest.fn() }));
jest.mock('../../../src/models/catalogs/staffCompany.models', () => ({}));
jest.mock('../../../src/models/catalogs/company.models', () => ({}));
jest.mock('../../../src/models/operations/surveys/formRespond.models', () => ({ findAll: jest.fn(), bulkCreate: jest.fn() }));
jest.mock('../../../src/models/catalogs/positions.models', () => ({}));
jest.mock('../../../src/models/operations/surveys/form.models', () => ({ findAll: jest.fn() }));
jest.mock('../../../src/utils/database', () => ({}));
jest.mock('../../../src/models/bar/cruises.models', () => ({}));
jest.mock('../../../src/models/bar/passenger.models', () => ({}));
jest.mock('../../../src/models/bar/consumerCardCount.model', () => ({}));
jest.mock('../../../src/models/bar/consumerCard.models', () => ({}));
jest.mock('../../../src/models/bar/cortecyCard.models', () => ({}));

const moment = require('moment');
const StaffDocumentation = require('../../../src/models/catalogs/staffDocumentation.models');
const {
    sendEmailStaffDocumentExpiring,
    sendEmailRRHHDocumentExpiringDigest,
} = require('../../../src/mails/mailer');
const CronJobs = require('../../../src/controllers/cronJobs.controller');

function buildRecord({ id, expiryDate, notifiedStage = null, staffActive = true }) {
    return {
        id,
        expiryDate,
        notifiedStage,
        staff: staffActive ? { id: 1, firstName: 'Juan', lastName: 'Perez', email: 'juan@example.com' } : null,
        document: { id: 5, name: 'Cedula' },
        update: jest.fn(function (data) {
            Object.assign(this, data);
            return Promise.resolve(this);
        }),
    };
}

describe('checkExpiringStaffDocuments', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        sendEmailStaffDocumentExpiring.mockResolvedValue(undefined);
        sendEmailRRHHDocumentExpiringDigest.mockResolvedValue(undefined);
    });

    it('notifica y marca stage "30" cuando faltan 30 días o menos para caducar', async () => {
        const record = buildRecord({
            id: 1,
            expiryDate: moment().add(20, 'days').toDate(),
        });
        StaffDocumentation.findAll.mockResolvedValue([record]);

        await CronJobs.checkExpiringStaffDocuments();

        expect(sendEmailStaffDocumentExpiring).toHaveBeenCalledTimes(1);
        expect(sendEmailStaffDocumentExpiring.mock.calls[0][2]).toBe('30');
        expect(record.update).toHaveBeenCalledWith(expect.objectContaining({ notifiedStage: '30' }));
        expect(sendEmailRRHHDocumentExpiringDigest).toHaveBeenCalledTimes(1);
    });

    it('marca stage "7" cuando faltan 7 días o menos', async () => {
        const record = buildRecord({
            id: 2,
            expiryDate: moment().add(3, 'days').toDate(),
        });
        StaffDocumentation.findAll.mockResolvedValue([record]);

        await CronJobs.checkExpiringStaffDocuments();

        expect(sendEmailStaffDocumentExpiring.mock.calls[0][2]).toBe('7');
        expect(record.update).toHaveBeenCalledWith(expect.objectContaining({ notifiedStage: '7' }));
    });

    it('marca stage "expired" cuando la fecha ya pasó', async () => {
        const record = buildRecord({
            id: 3,
            expiryDate: moment().subtract(2, 'days').toDate(),
        });
        StaffDocumentation.findAll.mockResolvedValue([record]);

        await CronJobs.checkExpiringStaffDocuments();

        expect(sendEmailStaffDocumentExpiring.mock.calls[0][2]).toBe('expired');
        expect(record.update).toHaveBeenCalledWith(expect.objectContaining({ notifiedStage: 'expired' }));
    });

    it('no reenvía si ya se notificó ese mismo stage', async () => {
        const record = buildRecord({
            id: 4,
            expiryDate: moment().add(3, 'days').toDate(),
            notifiedStage: '7',
        });
        StaffDocumentation.findAll.mockResolvedValue([record]);

        await CronJobs.checkExpiringStaffDocuments();

        expect(sendEmailStaffDocumentExpiring).not.toHaveBeenCalled();
        expect(record.update).not.toHaveBeenCalled();
        expect(sendEmailRRHHDocumentExpiringDigest).not.toHaveBeenCalled();
    });

    it('ignora documentos fuera de toda ventana de aviso', async () => {
        const record = buildRecord({
            id: 5,
            expiryDate: moment().add(60, 'days').toDate(),
        });
        StaffDocumentation.findAll.mockResolvedValue([record]);

        await CronJobs.checkExpiringStaffDocuments();

        expect(sendEmailStaffDocumentExpiring).not.toHaveBeenCalled();
        expect(sendEmailRRHHDocumentExpiringDigest).not.toHaveBeenCalled();
    });

    it('reenvía cuando el documento avanza de stage "30" a "7"', async () => {
        const record = buildRecord({
            id: 6,
            expiryDate: moment().add(3, 'days').toDate(),
            notifiedStage: '30',
        });
        StaffDocumentation.findAll.mockResolvedValue([record]);

        await CronJobs.checkExpiringStaffDocuments();

        expect(sendEmailStaffDocumentExpiring).toHaveBeenCalledTimes(1);
        expect(record.update).toHaveBeenCalledWith(expect.objectContaining({ notifiedStage: '7' }));
    });
});
