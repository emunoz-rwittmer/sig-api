const { Sequelize, Op, where } = require("sequelize");
const Order = require('../../../models/operations/orders/order.models');
const itemsOrder = require('../../../models/operations/orders/itemsOrder.models');
const Staff = require('../../../models/catalogs/staff.models');
const Utils = require('../../../utils/Utils');
const Company = require('../../../models/catalogs/company.models');
const db = require("../../../utils/database");

class OrderService {
    static async getAllOrders() {
        try {
            const result = await Order.findAll({
                include: [{
                    model: Company,
                    as: 'company',
                }, {
                    model: itemsOrder,
                    as: 'orderItems',
                }, {
                    model: Staff,
                    as: 'responsible',
                    attributes: ['id', 'firstName', 'lastName']
                }],
                order:[['createdAt', 'DESC']]
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getOrderById(orderId) {
        try {

            const result = await Order.findOne({
                where: { id: orderId },
                include: [{
                    model: itemsOrder,
                    as: 'orderItems',
                    attributes: ['id', 'sku', 'product', 'quantity', 'originalQuantity', 'status'],
                },
                {
                    model: Company,
                    as: 'company',
                    attributes: ['name']
                },]
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async createOrder(order, items) {
        const transaction = await db.transaction();

        try {
            const result = await Order.create(order, { transaction });

            const productsOrder = items.map(item => ({
                ...item,
                orderId: result.id,
                status: 'en espera',
            }));

            await itemsOrder.bulkCreate(productsOrder, { transaction });

            await transaction.commit();
            return result;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    static async updateOrder(data, id) {
        try {
            const result = await Order.update(data, id);
            return result;
        } catch (error) {
            throw error;

        }
    }

    // Items by orders

    static async deleteItem(itemId) {
        try {
            const result = await itemsOrder.destroy({
                where: { id: itemId }
            });
            if (result) {
                return 'resource deleted successfully'
            }
        } catch (error) {
            throw error;
        }
    }

}

module.exports = OrderService;