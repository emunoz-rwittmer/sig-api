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
jest.mock('../../../src/models/catalogs/staffDocumentation.models', () => ({ findAll: jest.fn() }));
jest.mock('../../../src/models/operations/surveys/shipmentDates.models', () => ({ findAll: jest.fn() }));
jest.mock('../../../src/utils/Utils', () => ({}));
jest.mock('../../../src/utils/database', () => ({ transaction: jest.fn() }));

const StaffDocumentation = require('../../../src/models/catalogs/staffDocumentation.models');
const ShipmentDates = require('../../../src/models/operations/surveys/shipmentDates.models');
const StaffService = require('../../../src/services/catalogs/staff.services');

const DOCUMENT_EXPIRY_WINDOW_DAYS = 30;

describe('StaffService.getExpiringDocumentsReport', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        StaffDocumentation.findAll.mockResolvedValue([]);
    });

    it('usa la misma ventana de 30 días y el mismo filtro de staff activo que el cron checkExpiringStaffDocuments', async () => {
        const { Op } = require('sequelize');
        const before = Date.now();
        await StaffService.getExpiringDocumentsReport();
        const after = Date.now();

        expect(StaffDocumentation.findAll).toHaveBeenCalledTimes(1);
        const call = StaffDocumentation.findAll.mock.calls[0][0];

        const gte = call.where.expiryDate[Op.gte];
        const lte = call.where.expiryDate[Op.lte];

        expect(gte.getTime()).toBeGreaterThanOrEqual(before);
        expect(gte.getTime()).toBeLessThanOrEqual(after);
        expect(lte.getTime() - gte.getTime()).toBe(DOCUMENT_EXPIRY_WINDOW_DAYS * 24 * 60 * 60 * 1000);

        const staffInclude = call.include.find((inc) => inc.as === 'staff');
        expect(staffInclude.required).toBe(true);
        expect(staffInclude.where).toEqual({ active: true });
    });
});

describe('StaffService.getEmbarkedTodayReport', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        ShipmentDates.findAll.mockResolvedValue([]);
    });

    it('usa el mismo criterio "on board" (shipmentDate <= now <= dischargeDate) que getEmbarkedTodayCount', async () => {
        const { Op } = require('sequelize');
        const before = Date.now();
        await StaffService.getEmbarkedTodayReport();
        const after = Date.now();

        expect(ShipmentDates.findAll).toHaveBeenCalledTimes(1);
        const call = ShipmentDates.findAll.mock.calls[0][0];

        const shipmentDateCutoff = call.where.shipmentDate[Op.lte];
        expect(shipmentDateCutoff.getTime()).toBeGreaterThanOrEqual(before);
        expect(shipmentDateCutoff.getTime()).toBeLessThanOrEqual(after);

        const orClause = call.where[Op.or];
        expect(orClause).toContainEqual({ dischargeDate: null });
        expect(orClause.some((clause) => clause.dischargeDate && clause.dischargeDate[Op.gte])).toBe(true);

        const empresaInclude = call.include.find((inc) => inc.as === 'empresa');
        expect(empresaInclude.required).toBe(true);
        const staffInclude = empresaInclude.include.find((inc) => inc.as === 'staff');
        expect(staffInclude.required).toBe(true);
        expect(staffInclude.where).toEqual({ active: true });
    });
});
