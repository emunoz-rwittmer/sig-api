jest.mock('../../../src/models/bar/consumerCard.models', () => ({ findOne: jest.fn() }));
jest.mock('../../../src/models/bar/consumerCardItems.models', () => ({ create: jest.fn() }));
jest.mock('../../../src/models/bar/consumerCardItemIngredient.models', () => ({ bulkCreate: jest.fn() }));
jest.mock('../../../src/models/bar/cortecyCard.models', () => ({}));
jest.mock('../../../src/models/bar/cortecyCardItems.models', () => ({}));
jest.mock('../../../src/models/bar/cruises.models', () => ({}));
jest.mock('../../../src/models/bar/passenger.models', () => ({}));
jest.mock('../../../src/models/bar/productBar.models', () => ({ findOne: jest.fn() }));
jest.mock('../../../src/models/bar/recipe.models', () => ({}));
jest.mock('../../../src/models/bar/recipeDetail.models', () => ({}));
jest.mock('../../../src/models/catalogs/wareHouse.models', () => ({ findOne: jest.fn() }));
jest.mock('../../../src/models/catalogs/yacht.models', () => ({}));
jest.mock('../../../src/models/operations/inventory/product.models', () => ({}));
jest.mock('../../../src/utils/database', () => ({ transaction: jest.fn() }));
jest.mock('../../../src/services/bar/consumerCard.helpers', () => ({
    deductDirectStock: jest.fn(),
    deductRecipeStock: jest.fn(),
}));

const db = require('../../../src/utils/database');
const ConsumerCard = require('../../../src/models/bar/consumerCard.models');
const ConsumerCardItems = require('../../../src/models/bar/consumerCardItems.models');
const ConsumerCardItemIngredient = require('../../../src/models/bar/consumerCardItemIngredient.models');
const ProductBar = require('../../../src/models/bar/productBar.models');
const Warehouse = require('../../../src/models/catalogs/wareHouse.models');
const { deductDirectStock, deductRecipeStock } = require('../../../src/services/bar/consumerCard.helpers');
const ConsumerCardService = require('../../../src/services/bar/consumerCard.services');

describe('ConsumerCardService.createConsumerCard · cóctel personalizado', () => {
    let tx;
    const ingredients = [{ productId: 10, quantity: 2 }, { productId: 11, quantity: 1 }];

    beforeEach(() => {
        jest.clearAllMocks();
        tx = { commit: jest.fn(), rollback: jest.fn(), LOCK: { UPDATE: 'UPDATE' } };
        db.transaction.mockResolvedValue(tx);

        const card = {
            id: 1,
            numberCard: 'C-1',
            totalCount: 0,
            update: jest.fn(),
            get: () => ({ numberCard: 'C-1', passenger: { cruise: { yachtId: 7 } } }),
        };
        ConsumerCard.findOne.mockResolvedValue(card);
        Warehouse.findOne.mockResolvedValue({ id: 99 });
        ProductBar.findOne.mockResolvedValue({ get: () => ({ id: 500, type: 'RECIPE' }) });
        ConsumerCardItems.create.mockResolvedValue({ id: 321 });
    });

    it('descuenta los ingredientes como receta y los guarda ligados al renglón', async () => {
        await ConsumerCardService.createConsumerCard({
            consumerCardId: 1,
            userId: 3,
            cardItems: [{ id: 500, quantity: 2, price: 8, ingredients }],
        });

        const [warehouseId, syntheticProduct, item] = deductRecipeStock.mock.calls[0];
        expect(warehouseId).toBe(99);
        expect(syntheticProduct.recipe.recipe_details).toEqual(ingredients);
        expect(item.quantity).toBe(2);
        expect(deductDirectStock).not.toHaveBeenCalled();

        expect(ConsumerCardItems.create).toHaveBeenCalledWith(
            expect.objectContaining({ productId: 500, quantity: 2, price: 16 }),
            expect.anything(),
        );
        expect(ConsumerCardItemIngredient.bulkCreate).toHaveBeenCalledWith(
            [
                { consumerCardItemId: 321, productId: 10, quantity: 2 },
                { consumerCardItemId: 321, productId: 11, quantity: 1 },
            ],
            expect.anything(),
        );
        expect(tx.commit).toHaveBeenCalled();
    });

    it('un producto normal no guarda ingredientes', async () => {
        ProductBar.findOne.mockResolvedValue({ get: () => ({ id: 5, type: 'DIRECT', productId: 40 }) });

        await ConsumerCardService.createConsumerCard({
            consumerCardId: 1,
            userId: 3,
            cardItems: [{ id: 5, quantity: 1, price: 4 }],
        });

        expect(deductDirectStock).toHaveBeenCalled();
        expect(ConsumerCardItemIngredient.bulkCreate).not.toHaveBeenCalled();
    });

    it('si falta stock revierte y no guarda nada', async () => {
        deductRecipeStock.mockRejectedValue(new Error('Insufficient ingredient stock'));

        await expect(ConsumerCardService.createConsumerCard({
            consumerCardId: 1,
            userId: 3,
            cardItems: [{ id: 500, quantity: 1, price: 8, ingredients }],
        })).rejects.toThrow('Insufficient');

        expect(ConsumerCardItemIngredient.bulkCreate).not.toHaveBeenCalled();
        expect(tx.rollback).toHaveBeenCalled();
    });
});
