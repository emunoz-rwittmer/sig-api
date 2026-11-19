jest.mock('../../../src/models/operations/surveys/weeklyEvaluationSetting.models', () => ({
    findAll: jest.fn(),
    findOrCreate: jest.fn()
}));

const moment = require('moment');
const WeeklyEvaluationSetting = require('../../../src/models/operations/surveys/weeklyEvaluationSetting.models');
const control = require('../../../src/utils/weeklyEvaluationCrewControl');

describe('weeklyEvaluationCrewControl utils', () => {
    beforeEach(() => jest.clearAllMocks());

    it('devuelve las empresas desactivadas guardadas en la base', async () => {
        WeeklyEvaluationSetting.findAll.mockResolvedValue([{ companyId: 3 }]);

        const disabled = await control.getDisabledCompanyIds();

        expect(WeeklyEvaluationSetting.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: { enabled: false } }));
        expect([...disabled]).toEqual([3]);
    });

    it('activa una empresa que estaba desactivada', async () => {
        const setting = { enabled: false, update: jest.fn() };
        WeeklyEvaluationSetting.findOrCreate.mockResolvedValue([setting, false]);

        await expect(control.setWeeklyEvaluationCrewEnabled({ companyId: 3, enabled: true })).resolves.toBe(true);
        expect(setting.update).toHaveBeenCalledWith({ enabled: true });
    });

    it('no reescribe la fila si el estado no cambia', async () => {
        const setting = { enabled: false, update: jest.fn() };
        WeeklyEvaluationSetting.findOrCreate.mockResolvedValue([setting, true]);

        await control.setWeeklyEvaluationCrewEnabled({ companyId: 8, enabled: false });

        expect(setting.update).not.toHaveBeenCalled();
    });

    it.each([
        [{ enabled: true }],
        [{ companyId: '2', enabled: true }],
        [{ companyId: 0, enabled: true }]
    ])('rechaza identificadores inválidos: %p', async (target) => {
        await expect(control.setWeeklyEvaluationCrewEnabled(target)).rejects.toThrow('companyId');
    });

    it('rechaza un estado enabled que no sea booleano', async () => {
        await expect(control.setWeeklyEvaluationCrewEnabled({ companyId: 2, enabled: 'false' }))
            .rejects.toThrow('enabled debe ser booleano');
    });

    it.each([
        ['2026-11-19T15:00:00', '2026-11-13_2026-11-20'],
        ['2026-11-20T08:00:00', '2026-11-20_2026-11-27'],
    ])('calcula la semana evaluada (viernes a viernes) para %s', (now, expected) => {
        expect(control.getEvaluationPeriod(moment(now))).toBe(expected);
    });
});
