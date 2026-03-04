const Product = require('../../../models/operations/orders/product.models');
const Transaction = require('../../../models/operations/inventory/transaction.models');
const Register = require('../../../models/operations/inventory/register.models');
const Staff = require('../../../models/catalogs/staff.models');
const Company = require('../../../models/catalogs/company.models');
const { Op } = require('sequelize');

class RegisterService {

    static async getAllRegisters() {
        try {

            const result = await Register.findAll({
                where: {
                    companyId: {
                        [Op.not]: null
                    }
                },
                include: [
                    {
                        model: Company,
                        as: 'empresa',
                        attributes: ['id', 'name'],
                    },
                    {
                        model: Staff,
                        as: 'responsable',
                        attributes: ['firstName', 'lastName'],
                    },
                    {
                        model: Transaction,
                        as: 'transactiones',
                        attributes: ['id', 'quantity'],
                        include: [
                            {
                                model: Product,
                                as: 'product',
                                attributes: ['id', 'name', 'sku'],
                            },
                        ],
                    },
                ],
                order:[['createdAt','DESC']]
            })
            return result;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = RegisterService;