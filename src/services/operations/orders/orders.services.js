const Staff = require('../../../models/catalogs/staff.models');
const Users = require('../../../models/catalogs/user.models');
const Yachts = require('../../../models/catalogs/yacht.models');
const itemsOrder = require('../../../models/operations/orders/itemsOrder.models');
const Order = require('../../../models/operations/orders/order.models');
const { Sequelize, Op, where } = require("sequelize");
const Utils = require('../../../utils/Utils');
const Company = require('../../../models/catalogs/company.models');



class OrderService {
    static async getAllCompaniesWhitOrders() {
        try {
            const result = await Company.findAll({
                attributes: [
                    'id', 'name', 'logo', 'ruc',
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

    static async getOrdersByCompany(companyId) {
        try {
            const result = await Order.findAll({
                where: { companyId },
                attributes: [
                    'id', 'name','status', 'createdAt',
                    [Sequelize.fn('COUNT', Sequelize.col('orderItems.id')), 'itemsCount']
                ],
                include: [{
                    model: itemsOrder,
                    as: 'orderItems',
                    attributes: []
                },{
                    model: Users,
                    as: 'responsible',
                    attributes: ['id','firstName','lastName']
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

    static async updateOrder(data) {
        try {
            const results = await Promise.all(data.map(async (item) => {
                const result = await itemsOrder.update({
                    product: item.product,
                    quantity: item.quantity,
                    originalQuantity: item.originalQuantity,
                },
                    {
                        where: { id: Utils.decode(item.id) }
                    });
                return result;
            }));
            return results;
        } catch (error) {
            console.log(error)
            throw error;
        }
    }

    static async updateStatusOrder(data, id) {
        try {
            const result = await Order.update(data, id);
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
                attributes:['id','sku', 'product', 'quantity', 'originalQuantity', 'status' ]
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async createItemsOfOrder(items) {
        try {
            const result = await itemsOrder.bulkCreate(items);
            return result;
        } catch (error) {
            throw error;

        }
    }

    static async updateStatusAndQuantityItemOfOrder(id, quantity) {
        try {
            const result = await itemsOrder.update({
                status: 'ingresado',
                quantity
            },{
                where: { id }
            });
            return result;
        } catch (error) {
            throw error;

        }
    }

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