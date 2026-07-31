const DateFormat = require('../../../src/utils/dateFormat');

describe('dateFormat utils', () => {
    it('formatDateToLocal formatea una fecha como D/M/YYYY', () => {
        expect(DateFormat.formatDateToLocal(new Date(2026, 2, 5))).toBe('5/3/2026');
    });

    it('normalizeDateToDayStart elimina la hora para exportaciones de Excel', () => {
        const normalized = DateFormat.normalizeDateToDayStart('2026-03-05T15:45:30.000Z');

        expect(normalized.getFullYear()).toBe(2026);
        expect(normalized.getMonth()).toBe(2);
        expect(normalized.getDate()).toBe(5);
        expect(normalized.getHours()).toBe(0);
        expect(normalized.getMinutes()).toBe(0);
        expect(normalized.getSeconds()).toBe(0);
        expect(normalized.getMilliseconds()).toBe(0);
    });

    it('formatMonthYear formatea una fecha como "D de mes del YYYY"', () => {
        expect(DateFormat.formatMonthYear('2026-03-05')).toBe('05 de marzo del 2026');
    });

    it('formatMonthYear devuelve string vacío si no hay fecha', () => {
        expect(DateFormat.formatMonthYear(null)).toBe('');
        expect(DateFormat.formatMonthYear(undefined)).toBe('');
    });
});
