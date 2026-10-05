jest.mock('../../../src/models/rrhh/trading.models', () => ({
    findAll: jest.fn(),
    count: jest.fn(),
}));
jest.mock('../../../src/models/rrhh/staffTradingView.models', () => ({
    findAll: jest.fn(),
    findOrCreate: jest.fn(),
}));

const Trading = require('../../../src/models/rrhh/trading.models');
const StaffTradingView = require('../../../src/models/rrhh/staffTradingView.models');
const TradingService = require('../../../src/services/rrhh/trading.services');

const row = (id) => ({ id, dataValues: { id } });

describe('TradingService staff views', () => {
    beforeEach(() => jest.clearAllMocks());

    describe('getAllForStaff', () => {
        it('marca como revisados solo los contenidos que el colaborador ya abrió', async () => {
            Trading.findAll.mockResolvedValue([row(1), row(2), row(3)]);
            StaffTradingView.findAll.mockResolvedValue([{ tradingId: 2 }]);

            const result = await TradingService.getAllForStaff(7);

            expect(StaffTradingView.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: { staffId: 7 } }));
            expect(result.map((item) => item.dataValues.viewed)).toEqual([false, true, false]);
        });
    });

    describe('markViewed', () => {
        it('registra la revisión una sola vez por colaborador y contenido', async () => {
            Trading.count.mockResolvedValue(1);
            StaffTradingView.findOrCreate.mockResolvedValue([{}, true]);

            await expect(TradingService.markViewed(7, 3)).resolves.toBe(true);

            expect(StaffTradingView.findOrCreate).toHaveBeenCalledWith(
                expect.objectContaining({ where: { staffId: 7, tradingId: 3 } })
            );
        });

        it('devuelve false sin registrar nada si el contenido no existe', async () => {
            Trading.count.mockResolvedValue(0);

            await expect(TradingService.markViewed(7, 99)).resolves.toBe(false);

            expect(StaffTradingView.findOrCreate).not.toHaveBeenCalled();
        });
    });
});
