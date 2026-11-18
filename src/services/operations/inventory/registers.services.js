const Product = require('../../../models/operations/inventory/product.models');
const Transaction = require('../../../models/operations/inventory/transaction.models');
const Register = require('../../../models/operations/inventory/register.models');
const Staff = require('../../../models/catalogs/staff.models');
const Company = require('../../../models/catalogs/company.models');
const Order = require('../../../models/operations/orders/order.models');
const { TRANSIT_WAREHOUSE_ID } = require('../../../utils/warehouses');
const { Op } = require('sequelize');

class RegisterService {

    // Solo despachos a tránsito: son los únicos que GPS recibe en la pantalla Registros.
    // transactiones = líneas despachadas, recepciones = lo ingresado a GPS,
    // ajustes = regularización de la novedad.
    static async getAllRegisters() {
        const registers = await Register.findAll({
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
                    model: Staff,
                    as: 'receptor',
                    attributes: ['firstName', 'lastName'],
                },
                {
                    model: Staff,
                    as: 'resolutor',
                    attributes: ['firstName', 'lastName'],
                },
                {
                    model: Order,
                    as: 'pedido',
                    attributes: ['name', 'guide'],
                },
                {
                    model: Transaction,
                    as: 'transactiones',
                    attributes: ['id', 'quantity', 'type', 'warehouseFromId', 'warehouseToId'],
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
        });

        return registers.filter(register => {
            const lines = register.transactiones ?? [];
            const dispatched = lines.filter(line => line.type === 'OUT' && line.warehouseToId === TRANSIT_WAREHOUSE_ID);
            register.setDataValue('transactiones', dispatched);
            register.setDataValue('recepciones', lines.filter(line => line.type === 'OUT' && line.warehouseFromId === TRANSIT_WAREHOUSE_ID));
            register.setDataValue('ajustes', lines.filter(line => line.type === 'ADJUST'));
            return dispatched.length > 0;
        });
    }
}

module.exports = RegisterService;