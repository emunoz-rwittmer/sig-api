jest.mock('../../../src/models/catalogs/company.models', () => ({}));
jest.mock('../../../src/models/catalogs/departament.models', () => ({}));
jest.mock('../../../src/models/catalogs/positions.models', () => ({}));
jest.mock('../../../src/models/catalogs/staff.models', () => ({}));
jest.mock('../../../src/models/catalogs/staffCompany.models', () => ({}));
jest.mock('../../../src/models/rrhh/readRegulation.models', () => ({ update: jest.fn() }));
jest.mock('../../../src/models/rrhh/regulation.models', () => ({ findByPk: jest.fn() }));
jest.mock('../../../src/utils/database', () => ({}));

const StaffReadRegulation = require('../../../src/models/rrhh/readRegulation.models');
const Regulation = require('../../../src/models/rrhh/regulation.models');
const RegulationService = require('../../../src/services/rrhh/regulations.services');

describe('RegulationService.resetReads', () => {
    beforeEach(() => jest.clearAllMocks());

    it('devuelve a pendiente solo las lecturas ya hechas del reglamento', async () => {
        Regulation.findByPk.mockResolvedValue({ id: 5 });
        StaffReadRegulation.update.mockResolvedValue([3]);

        await expect(RegulationService.resetReads(5)).resolves.toBe(3);
        expect(StaffReadRegulation.update).toHaveBeenCalledWith(
            { read: false },
            { where: { regulationId: 5, read: true } },
        );
    });

    it('responde 404 si el reglamento no existe y no toca lecturas', async () => {
        Regulation.findByPk.mockResolvedValue(null);

        await expect(RegulationService.resetReads(99)).rejects.toMatchObject({ statusCode: 404 });
        expect(StaffReadRegulation.update).not.toHaveBeenCalled();
    });
});
