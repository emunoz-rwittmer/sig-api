const ConsumerCard = require('../../models/bar/consumerCard.models');
const { Sequelize, Op } = require('sequelize');
const ConsumerCardItems = require('../../models/bar/consumerCardItems.models');
const db = require('../../utils/database');
const { Console } = require('escpos');
const CortecyCard = require('../../models/bar/cortecyCard.models');
const CortecyCardItems = require('../../models/bar/cortecyCardItems.models');

class ConsumerCardService {

    static async createConsumerCard(data) {
        const transaction = await db.transaction();
        try {
            const { consumerCardId, cardItems, passengerId, counter } = data;

            const result = await ConsumerCard.findOne({
                where: { id: consumerCardId }
            }, { transaction });


            const totalCount = result.totalCount + cardItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

            await result.update({ totalCount }, { transaction });

            await Promise.all(cardItems.map(item => {
                return ConsumerCardItems.create({
                    consumerCardId: result.id,
                    productId: item.id,
                    quantity: item.quantity,
                    price: item.price * item.quantity,
                }, { transaction });
            }));

            await transaction.commit();
            return result;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    static async updateConsumerCard(data, id) {
        try {
            const result = await ConsumerCard.update(data,
                {
                    where: { id },
                }
            );
            return result
        } catch (error) {
            throw error;
        }
    }

    static async createCortecyCard(data) {
        const transaction = await db.transaction();
        try {
            const { id, items, observation, counter } = data;

            const result = await CortecyCard.findOne({
                where: { id }
            }, { transaction });


            const totalCount = result.totalCount + items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

            await result.update({ totalCount, observation }, { transaction });

            await Promise.all(items.map(item => {
                return CortecyCardItems.create({
                    cortecyCardId: result.id,
                    productId: item.id,
                    quantity: item.quantity,
                    price: item.price * item.quantity,
                }, { transaction });
            }));

            await transaction.commit();
            return result;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }


}

module.exports = ConsumerCardService;