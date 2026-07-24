const DateFormat = require('../../../src/utils/dateFormat');

describe('dateFormat utils', () => {
    it('formatDateToLocal formatea una fecha como D/M/YYYY', () => {
        expect(DateFormat.formatDateToLocal('2026-03-05')).toBe('5/3/2026');
    });

    it('formatMonthYear formatea una fecha como "D de mes del YYYY"', () => {
        expect(DateFormat.formatMonthYear('2026-03-05')).toBe('05 de marzo del 2026');
    });

    it('formatMonthYear devuelve string vacío si no hay fecha', () => {
        expect(DateFormat.formatMonthYear(null)).toBe('');
        expect(DateFormat.formatMonthYear(undefined)).toBe('');
    });
});
