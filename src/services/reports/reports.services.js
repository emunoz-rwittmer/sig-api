const { Op } = require("sequelize");
const Company = require("../../models/catalogs/company.models");
const Staff = require("../../models/catalogs/staff.models");
const Warehouse = require("../../models/catalogs/wareHouse.models");
const Transaction = require("../../models/operations/inventory/transaction.models");
const itemsOrder = require("../../models/operations/orders/itemsOrder.models");
const Order = require('../../models/operations/orders/order.models');
const Product = require("../../models/operations/orders/product.models");
const Request = require("../../models/operations/yachtRequest/request.models");
const requestItems = require("../../models/operations/yachtRequest/requestItems.models");

class ReportService {
    static async getOrderReport(id) {
        try {
            const result = await Order.findOne({
                where: { id },
                attributes: ['id', 'name', 'status', 'guide', 'createdAt'],
                include:[{
                    model:Company,
                    as: 'company',
                    attributes: ['name', 'ruc', 'logo','adress']
                },{
                    model:Staff,
                    as: 'responsible',
                    attributes: ['firstName', 'lastName']
                },{
                    model:itemsOrder,
                    as: 'orderItems',
                    attributes: ['product', 'quantity', 'status']
                }]
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getTransactionsReport(warehouseId, startDate, endDate, type) {
        try {

            let filters = {
                [Op.or]: [
                    { warehouseToId: warehouseId },
                    { warehouseFromId: warehouseId }
                ]
            };

            if (startDate && endDate) {
                filters.createdAt = { [Op.between]: [new Date(startDate), new Date(endDate)] };
            }

            if (type) {
                filters.type = type;
            }

            const result = await Transaction.findAll({
                where: filters,
                order: [['createdAt', 'DESC']],
                attributes: ['warehouseToId', 'type', 'quantity', 'createdAt'],
                include: [{
                    model: Product,
                    as: 'product',
                    attributes: ['name']
                }, {
                    model: Warehouse,
                    as: 'warehouseTo',
                    attributes: ['name']
                }, {
                    model: Staff,
                    as: 'responsible',
                    attributes: ['firstName', 'lastName']
                }]
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getRequestReport(id) {
        try {
            const result = await Request.findOne({
                where: { id },
                attributes: ['id', 'name', 'status','warehouseId','createdAt'],
                include:[{
                    model:Staff,
                    as: 'responsible',
                    attributes: ['firstName', 'lastName']
                },{
                    model:requestItems,
                    as: 'requestItems',
                    attributes: ['stock', 'order', 'quantity'],
                    // include: [{
                    //     model: PlacesYacht,
                    //     as: 'placeYacht',
                    //     attributes: ['name'],
                    //     include: [{
                    //         model: Product,
                    //         as: 'product',
                    //         attributes: ['id', 'name'],
                    //     }]
                    // }],
                }]
            });
            return result;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = ReportService;