const { Sequelize, Op, where } = require("sequelize");
const Order = require('../../../models/operations/orders/order.models');
const orderItems = require('../../../models/operations/orders/orderItems.models');
const Staff = require('../../../models/catalogs/staff.models');
const Utils = require('../../../utils/Utils');
const Company = require('../../../models/catalogs/company.models');
const db = require("../../../utils/database");
const Register = require('../../../models/operations/inventory/register.models');
const Transaction = require('../../../models/operations/inventory/transaction.models');
const Product = require('../../../models/operations/inventory/product.models');
const AppError = require('../../../errors/AppError');
const { TRANSIT_WAREHOUSE_ID } = require('../../../utils/warehouses');

class OrderService {
    static async getAllOrders() {
        try {
            const result = await Order.findAll({
                include: [{
                    model: Company,
                    as: 'company',
                }, {
                    model: orderItems,
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
                    model: orderItems,
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

            await orderItems.bulkCreate(productsOrder, { transaction });

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

    // Cuadre pedido vs. despachos a tránsito, por SKU. Lo despachado es el neto que
    // entró a tránsito por los registros del pedido: despachos, menos lo devuelto al
    // origen al resolver una novedad, más lo regularizado cuando llegó de más.
    static async getDispatchSummary(orderId, transaction) {
        const normalizeSku = (sku) => String(sku ?? '').replace(/^0+/, '');

        const items = await orderItems.findAll({ where: { orderId }, transaction });
        const registers = await Register.findAll({ where: { orderId }, attributes: ['id'], transaction });
        const lines = registers.length ? await Transaction.findAll({
            where: {
                registerId: registers.map(register => String(register.id)),
                [Op.or]: [
                    { warehouseToId: TRANSIT_WAREHOUSE_ID },
                    { warehouseFromId: TRANSIT_WAREHOUSE_ID, type: 'ADJUST' }
                ]
            },
            transaction
        }) : [];

        const skus = [...new Set(items.map(item => normalizeSku(item.sku)))];
        const products = await Product.findAll({ where: { sku: skus }, attributes: ['id', 'sku', 'mergedIntoId'], transaction });
        // El SKU de un producto fusionado cuenta como el producto vigente.
        const productBySku = new Map(products.map(product => [product.sku, { id: product.mergedIntoId ?? product.id }]));

        const dispatchedByProduct = new Map();
        for (const line of lines) {
            const sign = line.warehouseToId === TRANSIT_WAREHOUSE_ID ? 1 : -1;
            dispatchedByProduct.set(line.productId, (dispatchedByProduct.get(line.productId) || 0) + sign * Number(line.quantity));
        }

        const rows = new Map();
        for (const item of items) {
            const sku = normalizeSku(item.sku);
            const row = rows.get(sku) ?? { sku, product: item.product, productId: productBySku.get(sku)?.id ?? null, ordered: 0, entered: 0 };
            row.ordered += Number(item.originalQuantity ?? item.quantity) || 0;
            if (item.status === 'ingresado') row.entered += Number(item.quantity) || 0;
            rows.set(sku, row);
        }

        return [...rows.values()].map(row => {
            const dispatched = dispatchedByProduct.get(row.productId) || 0;
            return { ...row, dispatched, pending: Math.max(row.entered - dispatched, 0) };
        });
    }

    // Un pedido ya procesado pasa a "Distribuido" cuando no queda nada por despachar.
    static async markDistributedIfComplete(orderId, transaction) {
        const order = await Order.findByPk(orderId, { transaction });
        if (!order) {
            throw new AppError('Pedido no encontrado', 400);
        }
        if (order.status !== 'Procesado') return;

        const summary = await OrderService.getDispatchSummary(orderId, transaction);
        if (summary.length && summary.every(row => row.pending === 0)) {
            await order.update({ status: 'Distribuido' }, { transaction });
        }
    }

    // Items by orders

    static async deleteItem(itemId) {
        try {
            const result = await orderItems.destroy({
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