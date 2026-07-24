require('dotenv').config({ path: '.env.test' });
const Utils = require('../../../src/utils/Utils');

describe('Utils.encode / Utils.decode', () => {
    it('round-trips a numeric id', () => {
        const encoded = Utils.encode(42);
        expect(typeof encoded).toBe('string');
        expect(Utils.decode(encoded)).toBe(42);
    });

    it('produces different output for different ids', () => {
        expect(Utils.encode(1)).not.toBe(Utils.encode(2));
    });
});
