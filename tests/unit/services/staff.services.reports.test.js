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
        await StaffService.getExpiringDocumentsReport();

        expect(StaffDocumentation.findAll).toHaveBeenCalledTimes(1);
        const call = StaffDocumentation.findAll.mock.calls[0][0];

        // Días calendario: desde el inicio de hoy (incluye lo que vence hoy) hasta
        // hoy + 30 días inclusive, igual que computeExpiryStage del cron.
        const gte = call.where.expiryDate[Op.gte];
        const lt = call.where.expiryDate[Op.lt];
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        expect(gte.getTime()).toBe(startOfToday.getTime());
        const expectedEnd = new Date(startOfToday);
        expectedEnd.setDate(startOfToday.getDate() + DOCUMENT_EXPIRY_WINDOW_DAYS + 1);
        expect(lt.getTime()).toBe(expectedEnd.getTime());

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
