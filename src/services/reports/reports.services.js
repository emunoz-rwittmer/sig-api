const Company = require("../../models/catalogs/company.models");
const Staff = require("../../models/catalogs/staff.models");
const orderItems = require("../../models/operations/orders/orderItems.models");
const Order = require('../../models/operations/orders/order.models');

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
                    model:orderItems,
                    as: 'orderItems',
                    attributes: ['product', 'quantity', 'status']
                }]
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

}

module.exports = ReportService;