const Product = require('../../../models/operations/orders/product.models');
const Transaction = require('../../../models/operations/inventory/transaction.models');
const Register = require('../../../models/operations/inventory/register.models');
const Staff = require('../../../models/catalogs/staff.models');
const Company = require('../../../models/catalogs/company.models');

class RegisterService {

    static async getAllRegisters(filter) {
        try {

            const parsedFilter = filter === 'true' ? true : filter === 'false' ? false : '';
            const where = {};

            if (filter !== '') {
                where.isResived = parsedFilter;
            }

            const result = await Register.findAll({
                where,
                include: [
                    {
                        model: Company,
                        as: 'empresa',
                        attributes: ['id','name'],
                    },
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