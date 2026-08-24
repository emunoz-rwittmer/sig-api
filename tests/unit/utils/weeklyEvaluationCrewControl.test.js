describe('weeklyEvaluationCrewControl utils', () => {
    let control;

    beforeEach(() => {
        jest.resetModules();
        control = require('../../../src/utils/weeklyEvaluationCrewControl');
    });

    it('inicia companyId 1 desactivado', () => {
        expect(control.isWeeklyEvaluationCrewEnabled({ companyId: 1 })).toBe(false);
    });

    it('habilita por defecto una compañía no configurada', () => {
        expect(control.isWeeklyEvaluationCrewEnabled({ companyId: 4 })).toBe(true);
    });

    it('puede activar manualmente TipTop II', () => {
        control.setWeeklyEvaluationCrewEnabled({ companyId: 2, enabled: true });

        expect(control.isWeeklyEvaluationCrewEnabled({ companyId: 2 })).toBe(true);
    });

    it('puede desactivar otra compañía sin afectar las demás', () => {
        control.setWeeklyEvaluationCrewEnabled({ companyId: 8, enabled: false });

        expect(control.isWeeklyEvaluationCrewEnabled({ companyId: 8 })).toBe(false);
        expect(control.isWeeklyEvaluationCrewEnabled({ companyId: 9 })).toBe(true);
    });

    it.each([
        [{}],
        [{ companyId: '2' }],
        [{ companyId: 0 }]
    ])('rechaza identificadores inválidos: %p', (target) => {
        expect(() => control.isWeeklyEvaluationCrewEnabled(target)).toThrow('companyId');
    });

    it('rechaza un estado enabled que no sea booleano', () => {
        expect(() => control.setWeeklyEvaluationCrewEnabled({
            companyId: 2,
            enabled: 'false'
        })).toThrow('enabled debe ser booleano');
    });
});
