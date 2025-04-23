const Product = require('../../../models/operations/orders/product.models');
const Stock = require('../../../models/operations/inventory/stock.models');
const Transaction = require('../../../models/operations/inventory/transaction.models');
const db = require('../../../utils/database');
const Request = require('../../../models/operations/yachtRequest/request.models');
const itemsRequest = require('../../../models/operations/yachtRequest/itemsRequest.models');
const itemsOrder = require('../../../models/operations/orders/itemsOrder.models');
const Register = require('../../../models/operations/inventory/register.models');
const Staff = require('../../../models/catalogs/staff.models');

class RegisterService {

    static async getAllRegisters() {
        try {
            const result = await Register.findAll({
                include: [
                    {
                        model: Staff,
                        as: 'responsable',
                        attributes: ['firstName', 'lastName'],
                    },
                    {
                        model: Transaction,
                        as: 'transactiones',
                        attributes: ['id', 'quantity' ],
                        include: [
                            {
                                model: Product,
                                as: 'product',
                                attributes: ['id', 'name', 'sku'],
                            },
                        ],
                    },
                ],
            })
            return result;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = RegisterService;