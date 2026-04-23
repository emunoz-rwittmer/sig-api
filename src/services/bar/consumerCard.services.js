const ConsumerCard = require('../../models/bar/consumerCard.models');
const { Sequelize, Op } = require('sequelize');
const ConsumerCardItems = require('../../models/bar/consumerCardItems.models');
const db = require('../../utils/database');
const { Console } = require('escpos');

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

}

module.exports = ConsumerCardService;