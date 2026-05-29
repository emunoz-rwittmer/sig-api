const ConsumerCard = require('../../models/bar/consumerCard.models');
const ConsumerCardItems = require('../../models/bar/consumerCardItems.models');
const CortecyCard = require('../../models/bar/cortecyCard.models');
const CortecyCardItems = require('../../models/bar/cortecyCardItems.models');
const Cruise = require('../../models/bar/cruises.models');
const Passenger = require('../../models/bar/passenger.models');
const ProductBar = require('../../models/bar/productBar.models');
const Recipe = require('../../models/bar/recipe.models');
const RecipeDetail = require('../../models/bar/recipeDetail.models');
const Warehouse = require('../../models/catalogs/wareHouse.models');
const Yacht = require('../../models/catalogs/yacht.models');
const Product = require('../../models/operations/inventory/product.models');
const db = require('../../utils/database');
const { Op } = require('sequelize');
const Sequelize = require('sequelize');
const { deductDirectStock, deductRecipeStock } = require('./consumerCard.helpers');

class ConsumerCardService {


    static async getAllConsumerCards(yachtId, year, start, end) {
        try {
            const whereClause = {
                totalCount: {
                    [Op.gt]: 0
                }
            };
            const cruiseWhereClause = {};
            const passengerWhereClause = {};

            if (yachtId) {
                cruiseWhereClause.yachtId = yachtId;
            }

            if (year) {
                const yearNum = parseInt(year, 10);
                if (!isNaN(yearNum)) {
                    if (!whereClause[Op.and]) {
                        whereClause[Op.and] = [];
                    }
                    whereClause[Op.and].push(
                        Sequelize.where(Sequelize.fn('YEAR', Sequelize.col('consumer_card.createdAt')), Op.eq, yearNum)
                    );
                }
            }

            // FILTER POR RANGO QUE INTERSECTE EL CRUCERO
            if ((start && (start !== "undefined" && start !== 'null')) && (end && (end !== "undefined" && end !== 'null'))) {

                cruiseWhereClause[Op.and] = [
                    where(fn('DATE', col('cruise.startDate')), {
                        [Op.gte]: start.split(' ')[0]
                    }),
                    where(fn('DATE', col('cruise.startDate')), {
                        [Op.lt]: end.split(' ')[0]
                    })
                ];
            }

            const result = await ConsumerCard.findAll({
                where: whereClause,
                include: [
                    {
                        model: Passenger,
                        as: 'passenger',
                        attributes: ['id', 'name', 'gender', 'email', 'identificationNumber', 'cabin', 'type', 'nationality', 'country'],
                        where: Object.keys(passengerWhereClause).length > 0 ? passengerWhereClause : undefined,
                        required: true,
                        include: [
                            {
                                model: Cruise,
                                as: 'cruise',
                                attributes: ['id', 'name', 'yachtId', 'code', 'startDate', 'endDate'],
                                where: Object.keys(cruiseWhereClause).length > 0 ? cruiseWhereClause : undefined,
                                required: Object.keys(cruiseWhereClause).length > 0,
                            }
                        ]
                    },
                    {
                        model: ConsumerCardItems,
                        as: 'items',
                        attributes: ['id', 'productId', 'quantity', 'price'],
                        required: false,
                        include: [
                            {
                                model: ProductBar,
                                as: 'product',
                                attributes: ['id', 'name', 'price']
                            }
                        ]
                    }
                ],
                attributes: ['id', 'numberCard', 'passengerId', 'paymentType', 'totalCount', 'image', 'receiptNumber', 'paidAccount', 'createdAt', 'updatedAt']
            });

            return result;
        } catch (error) {
            console.log(error)
            throw error;
        }
    }

    static async getAllCortecyCards(yachtId, year, start, end) {
        try {
            const whereClause = {
                totalCount: {
                    [Op.gt]: 0
                }
            };
            const cruiseWhereClause = {};
            const passengerWhereClause = {};

            if (yachtId) {
                cruiseWhereClause.yachtId = yachtId;
            }

            if (year) {
                const yearNum = parseInt(year, 10);
                if (!isNaN(yearNum)) {
                    if (!whereClause[Op.and]) {
                        whereClause[Op.and] = [];
                    }
                    whereClause[Op.and].push(
                        Sequelize.where(Sequelize.fn('YEAR', Sequelize.col('cortecy_card.createdAt')), Op.eq, yearNum)
                    );
                }
            }

            // FILTER POR RANGO QUE INTERSECTE EL CRUCERO
            if ((start && (start !== "undefined" && start !== 'null')) && (end && (end !== "undefined" && end !== 'null'))) {
                console.log('entre aqui')

                cruiseWhereClause[Op.and] = [
                    { startDate: { [Op.gte]: new Date(start) } },
                    { endDate: { [Op.lte]: new Date(end) } }
                ]
            }

            const result = await CortecyCard.findAll({
                where: whereClause,
                include: [
                    {
                        model: Cruise,
                        as: 'cruise',
                        attributes: ['id', 'name', 'yachtId', 'code', 'startDate', 'endDate'],
                        where: Object.keys(cruiseWhereClause).length > 0 ? cruiseWhereClause : undefined,
                        required: Object.keys(cruiseWhereClause).length > 0,

                    },
                    {
                        model: CortecyCardItems,
                        as: 'items',
                        attributes: ['id', 'productId', 'quantity', 'price', 'observation'],
                        required: false,
                        include: [
                            {
                                model: ProductBar,
                                as: 'product',
                                attributes: ['id', 'name', 'price']
                            }
                        ]
                    }
                ],
                attributes: ['id', 'numberCard', 'type', 'totalCount', 'image', 'createdAt', 'updatedAt']
            });

            return result;
        } catch (error) {
            throw error;
        }
    }

    static async createConsumerCard(data) {
        const transaction = await db.transaction();
        try {
            const { consumerCardId, cardItems, userId, counter } = data;

            if (!consumerCardId || !cardItems || cardItems.length === 0) {
                throw new Error('Invalid consumer card data: consumerCardId and cardItems are required');
            }

            const consumerCard = await ConsumerCard.findOne({
                where: { id: consumerCardId },
                include: [{
                    model: Passenger,
                    as: 'passenger',
                    attributes: ['email', 'name'],
                    include: [{
                        model: Cruise,
                        as: 'cruise',
                        attributes: ['name', 'yachtId'],
                        include: [{
                            model: Yacht,
                            as: 'yacht',
                            attributes: ['code']
                        }]
                    }]
                }],
                transaction,
                lock: transaction.LOCK.UPDATE
            });

            if (!consumerCard) {
                throw new Error(`Consumer card with id ${consumerCardId} not found`);
            }

            const consumerCardPlain = consumerCard.get({ plain: true });
            const yachtId = consumerCardPlain.passenger.cruise.yachtId;
            const numberCard = consumerCardPlain.numberCard;

            const totalConsumption = cardItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const newTotal = Number(consumerCard.totalCount) + totalConsumption;

            const warehouse = await Warehouse.findOne({
                where: { type: 'Bar', yachtId },
                transaction
            });

            if (!warehouse) {
                throw new Error(`Bar warehouse not found for yacht ${yachtId}`);
            }

            // Process items with optimized batch operations
            for (const item of cardItems) {
                const productBar = await ProductBar.findOne({
                    where: { id: item.id },
                    include: [{
                        model: Recipe,
                        as: 'recipe',
                        include: [{
                            model: RecipeDetail,
                            as: 'recipe_details'
                        }]
                    }],
                    transaction
                });

                if (!productBar) {
                    throw new Error(`Product bar with id ${item.id} not found`);
                }

                const productBarPlain = productBar.get({ plain: true });

                if (productBarPlain.type === 'DIRECT') {
                    await deductDirectStock(
                        warehouse.id,
                        productBarPlain,
                        item,
                        userId,
                        numberCard,
                        transaction
                    );
                } else if (productBarPlain.type === 'RECIPE') {
                    await deductRecipeStock(
                        warehouse.id,
                        productBarPlain,
                        item,
                        userId,
                        numberCard,
                        transaction
                    );
                }

                await ConsumerCardItems.create({
                    consumerCardId: consumerCard.id,
                    productId: item.id,
                    quantity: item.quantity,
                    price: item.price * item.quantity,
                }, { transaction });
            }

            await consumerCard.update({ totalCount: newTotal }, { transaction });
            await transaction.commit();

            return consumerCardPlain;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    static async updateConsumerCard(data, id) {
        const transaction = await db.transaction();
        try {
            if (!id) {
                throw new Error('Consumer card ID is required for update');
            }

            if (!data || Object.keys(data).length === 0) {
                throw new Error('No data provided for update');
            }

            const card = await ConsumerCard.findByPk(id, {
                transaction,
                lock: transaction.LOCK.UPDATE
            });

            if (!card) {
                throw new Error(`Consumer card with id ${id} not found`);
            }

            // Safer update payload handling
            const updatePayload = {
                ...data,
                paidAccount: data.paidAccount !== undefined ? data.paidAccount : true
            };

            await card.update(updatePayload, { transaction });

            // Optimized query with selective attributes
            const updatedCard = await ConsumerCard.findByPk(id, {
                attributes: {
                    exclude: ['createdAt', 'updatedAt']
                },
                include: [
                    {
                        model: Passenger,
                        as: 'passenger',
                        attributes: ['id', 'name', 'email', 'identificationNumber', 'cabin', 'type', 'nationality', 'country']
                    },
                    {
                        model: ConsumerCardItems,
                        as: 'items',
                        attributes: ['id', 'productId', 'quantity', 'price'],
                        include: [{
                            model: ProductBar,
                            as: 'product',
                            attributes: ['id', 'name', 'price']
                        }]
                    }
                ],
                transaction
            });

            await transaction.commit();
            return updatedCard;

        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    static async createCortecyCard(data) {
        const transaction = await db.transaction();
        try {
            const { id, items, userId, observation, counter } = data;

            if (!id || !items || items.length === 0) {
                throw new Error('Invalid cortecyCard data: id and items are required');
            }

            const cortecyCard = await CortecyCard.findOne({
                where: { id },
                include: [{
                    model: Cruise,
                    as: 'cruise',
                    attributes: ['name', 'yachtId'],
                }],
                transaction,
                lock: transaction.LOCK.UPDATE
            });

            if (!cortecyCard) {
                throw new Error(`Cortecycard with id ${id} not found`);
            }

            const cortecyCardPlain = cortecyCard.get({ plain: true });
            const yachtId = cortecyCardPlain.cruise.yachtId;
            const numberCard = cortecyCardPlain.numberCard;

            const totalConsumption = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const newTotal = Number(cortecyCard.totalCount) + totalConsumption;

            const warehouse = await Warehouse.findOne({
                where: { type: 'Bar', yachtId },
                transaction
            });

            if (!warehouse) {
                throw new Error(`Bar warehouse not found for yacht ${yachtId}`);
            }

            // Process items with optimized batch operations
            for (const item of items) {
                const productBar = await ProductBar.findOne({
                    where: { id: item.id },
                    include: [{
                        model: Recipe,
                        as: 'recipe',
                        include: [{
                            model: RecipeDetail,
                            as: 'recipe_details'
                        }]
                    }],
                    transaction
                });

                if (!productBar) {
                    throw new Error(`Product bar with id ${item.id} not found`);
                }

                const productBarPlain = productBar.get({ plain: true });

                if (productBarPlain.type === 'DIRECT') {
                    await deductDirectStock(
                        warehouse.id,
                        productBarPlain,
                        item,
                        userId,
                        numberCard,
                        transaction
                    );
                } else if (productBarPlain.type === 'RECIPE') {
                    await deductRecipeStock(
                        warehouse.id,
                        productBarPlain,
                        item,
                        userId,
                        numberCard,
                        transaction
                    );
                }

                await CortecyCardItems.create({
                    cortecyCardId: cortecyCardPlain.id,
                    productId: item.id,
                    quantity: item.quantity,
                    price: item.price * item.quantity,
                    observation
                },
                    { transaction }
                );
            }

            await cortecyCard.update({ totalCount: newTotal }, { transaction });
            await transaction.commit();

            return cortecyCardPlain;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    static async updateCortecyCard(data, id) {
        const transaction = await db.transaction();
        try {
            if (!id) {
                throw new Error('Cortecy card ID is required for update');
            }

            if (!data || Object.keys(data).length === 0) {
                throw new Error('No data provided for update');
            }

            const card = await CortecyCard.findByPk(id, {
                transaction,
                lock: transaction.LOCK.UPDATE
            });

            if (!card) {
                throw new Error(`Cortecy card with id ${id} not found`);
            }

            await card.update(data, { transaction });

            await transaction.commit();
            return card;

        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
}

module.exports = ConsumerCardService;
