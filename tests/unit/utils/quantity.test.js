const Quantity = require('../../../src/utils/quantity');

describe('quantity utils', () => {
    describe('normalizeQuantity', () => {
        it('multiplica por presentationQuantity para productos CONSUMABLE', () => {
            const product = { type: 'CONSUMABLE', presentationQuantity: 12, name: 'Cerveza' };
            expect(Quantity.normalizeQuantity(product, 2)).toBe(24);
        });

        it('devuelve el número tal cual para productos DISCRETE', () => {
            const product = { type: 'DISCRETE', name: 'Silla' };
            expect(Quantity.normalizeQuantity(product, '5')).toBe(5);
        });

        it('lanza error si el producto CONSUMABLE no tiene presentationQuantity', () => {
            const product = { type: 'CONSUMABLE', name: 'Cerveza' };
            expect(() => Quantity.normalizeQuantity(product, 2)).toThrow('sin presentationQuantity');
        });
    });

    describe('viewCorrectQuantity', () => {
        it('divide por presentationQuantity para productos CONSUMABLE', () => {
            const product = { type: 'CONSUMABLE', presentationQuantity: 12, name: 'Cerveza' };
            expect(Quantity.viewCorrectQuantity(product, 24)).toBe('2.00');
        });

        it('devuelve la cantidad tal cual para productos DISCRETE', () => {
            const product = { type: 'DISCRETE', name: 'Silla' };
            expect(Quantity.viewCorrectQuantity(product, 5)).toBe(5);
        });

        it('lanza error si el producto CONSUMABLE no tiene presentationQuantity', () => {
            const product = { type: 'CONSUMABLE', name: 'Cerveza' };
            expect(() => Quantity.viewCorrectQuantity(product, 24)).toThrow('sin presentationQuantity');
        });
    });
});
