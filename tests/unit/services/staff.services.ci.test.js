jest.mock('../../../src/models/catalogs/staff.models', () => ({ findOne: jest.fn(), create: jest.fn(), update: jest.fn() }));
jest.mock('../../../src/models/catalogs/yacht.models', () => ({}));
jest.mock('../../../src/models/catalogs/positions.models', () => ({}));
jest.mock('../../../src/models/catalogs/departament.models', () => ({}));
jest.mock('../../../src/models/catalogs/roles.models', () => ({}));
jest.mock('../../../src/models/catalogs/company.models', () => ({}));
jest.mock('../../../src/models/catalogs/staffCompany.models', () => ({}));
jest.mock('../../../src/models/rrhh/regulation.models', () => ({}));
jest.mock('../../../src/models/rrhh/readRegulation.models', () => ({}));
jest.mock('../../../src/models/catalogs/documentation.models', () => ({}));
jest.mock('../../../src/models/catalogs/staffDocumentation.models', () => ({}));
jest.mock('../../../src/models/operations/surveys/shipmentDates.models', () => ({}));
jest.mock('../../../src/utils/Utils', () => ({}));
jest.mock('../../../src/utils/database', () => ({ transaction: jest.fn() }));

const db = require('../../../src/utils/database');
const Staff = require('../../../src/models/catalogs/staff.models');
const StaffService = require('../../../src/services/catalogs/staff.services');

describe('StaffService cédula única', () => {
    let tx;
    beforeEach(() => {
        jest.clearAllMocks();
        tx = { commit: jest.fn(), rollback: jest.fn() };
        db.transaction.mockResolvedValue(tx);
    });

    it('createStaff rechaza con 409 una cédula ya registrada', async () => {
        Staff.findOne.mockResolvedValue({ id: 1 });
        await expect(StaffService.createStaff({ ciStaff: ' 0912345678 ' }))
            .rejects.toMatchObject({ statusCode: 409 });
        expect(Staff.findOne.mock.calls[0][0].where.ciStaff).toBe('0912345678');
        expect(Staff.create).not.toHaveBeenCalled();
        expect(tx.rollback).toHaveBeenCalled();
    });

    it('updateStaff excluye al propio colaborador del chequeo', async () => {
        Staff.findOne.mockResolvedValue(null);
        Staff.update.mockRejectedValue(new Error('stop'));
        await expect(StaffService.updateStaff({ ciStaff: '1' }, 7)).rejects.toThrow('stop');
        expect(Staff.findOne.mock.calls[0][0].where.id).toBeDefined();
    });
});
