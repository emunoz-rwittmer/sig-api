const { parseDisplayOrder } = require('../../../src/utils/displayOrder');

describe('parseDisplayOrder', () => {
    it('undefined conserva, vacío limpia', () => {
        expect(parseDisplayOrder(undefined)).toBeUndefined();
        expect(parseDisplayOrder('')).toBeNull();
        expect(parseDisplayOrder(null)).toBeNull();
    });

    it('acepta enteros positivos (también como texto de FormData)', () => {
        expect(parseDisplayOrder('3')).toBe(3);
        expect(parseDisplayOrder(12)).toBe(12);
    });

    it.each(['0', '-1', '2.5', 'abc', '10000'])('rechaza %s con 400', (value) => {
        expect(() => parseDisplayOrder(value)).toThrow(expect.objectContaining({ statusCode: 400 }));
    });
});
