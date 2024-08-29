const Staff = require('../../../models/catalogs/staff.models');
const Users = require('../../../models/catalogs/user.models');
const Yachts = require('../../../models/catalogs/yacht.models');
const itemsOrder = require('../../../models/operations/orders/itemsOrder.models');
const Order = require('../../../models/operations/orders/order.models');
const { Sequelize, Op, where } = require("sequelize");



class OrderService {
    static async getYachtsWhitOrders() {
        try {
            const result = await Yachts.findAll({
                attributes: [
                    'id', 'name', 'code',
                    [Sequelize.fn('COUNT', Sequelize.col('Orders.id')), 'ordersCount']
                ],
                include: [{
                    model: Order,
                    as: 'orders',
                    attributes: []
                }],
                group: ['id']
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getOrdersByYacht(yachtId) {
        try {
            const result = await Order.findAll({
                where: { yachtId },
                attributes: [
                    'id', 'name', 'createdAt',
                    [Sequelize.fn('COUNT', Sequelize.col('items.id')), 'itemsCount']
                ],
                include: [{
                    model: itemsOrder,
                    as: 'items',
                    attributes: []
                },{
                    model: Users,
                    as: 'order_user',
                    attributes: ['firstName','lastName']
                }],
                group: ['id']
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async createOrder(order) {
        try {
            const result = await Order.create(order);
            return result;
        } catch (error) {
            throw error;

        }
    }

    static async createItemsOfOrder(items) {
        try {
            console.log(items)
            const result = await itemsOrder.bulkCreate(items);
            return result;
        } catch (error) {
            throw error;

        }
    }

    // Items by orders

    static async getItemsByOrder(orderId) {
        try {
            const result = await itemsOrder.findAll({
                where: { orderId },
                // attributes: [
                //     'id', 'name', 'createdAt',
                // ],
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    // static async updateYacht(yacht, id) {
    //     try {
    //         const result = await Yachts.update(yacht,id);
    //         return result;
    //     } catch (error) {
    //         throw error;  
    //     }
    // }

    // static async delete(id) {
    //     try {
    //         const result = await Yachts.destroy(id);
    //         return result;
    //     } catch (error) {
    //         throw error;
    //     }
    // }
}

module.exports = OrderService;