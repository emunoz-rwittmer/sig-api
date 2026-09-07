jest.mock('../../../src/models/catalogs/staff.models', () => ({}));
jest.mock('../../../src/models/catalogs/yacht.models', () => ({}));
jest.mock('../../../src/models/catalogs/positions.models', () => ({}));
jest.mock('../../../src/models/catalogs/departament.models', () => ({}));
jest.mock('../../../src/models/catalogs/roles.models', () => ({}));
jest.mock('../../../src/models/catalogs/company.models', () => ({}));
jest.mock('../../../src/models/catalogs/staffCompany.models', () => ({}));
jest.mock('../../../src/models/rrhh/regulation.models', () => ({}));
jest.mock('../../../src/models/rrhh/readRegulation.models', () => ({}));
jest.mock('../../../src/models/catalogs/documentation.models', () => ({}));
jest.mock('../../../src/models/catalogs/staffDocumentation.models', () => ({ update: jest.fn() }));
jest.mock('../../../src/utils/Utils', () => ({}));

const db = require('../../../src/utils/database');
jest.mock('../../../src/utils/database', () => ({
    transaction: jest.fn(),
}));

const StaffDocumentation = require('../../../src/models/catalogs/staffDocumentation.models');
const StaffService = require('../../../src/services/catalogs/staff.services');

describe('StaffService.uploadStaffDocumentation', () => {
    let mockTransaction;

    beforeEach(() => {
        jest.clearAllMocks();
        mockTransaction = { commit: jest.fn(), rollback: jest.fn() };
        db.transaction.mockResolvedValue(mockTransaction);
        StaffDocumentation.update.mockResolvedValue([1]);
    });

    it('resetea notifiedStage y notifiedAt al subir un nuevo documento', async () => {
        await StaffService.uploadStaffDocumentation({
            id: 10,
            file: '/uploads/x.pdf',
            fileName: 'x.pdf',
            fileSize: 123,
            status: 'uploaded',
            expiryDate: '2027-01-01',
        });

        expect(StaffDocumentation.update).toHaveBeenCalledWith(
            expect.objectContaining({ notifiedStage: null, notifiedAt: null }),
            expect.objectContaining({ where: { id: 10 } })
        );
        expect(mockTransaction.commit).toHaveBeenCalledTimes(1);
    });
});
