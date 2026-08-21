const axios = require('axios');
const TransactionService = require('../../../services/operations/inventory/transactions.services');
const Utils = require('../../../utils/Utils');
const CompanyService = require('../../../services/catalogs/company.services');
const Consecutivo = require('../../../models/catalogs/consecutivo.model');
const AppError = require('../../../errors/AppError');

const decodeId = (value, fieldName) => {
    let id;
    try {
        id = Utils.decode(value);
    } catch {
        throw new AppError(`${fieldName} inválido`, 400);
    }
    if (!Number.isInteger(id) || id <= 0) {
        throw new AppError(`${fieldName} inválido`, 400);
    }
    return id;
};

const productEntryInWarehouse = async (req, res, next) => {
    try {
        const warehouseId = Number(req.params.warehouse_id);
        const { id: orderItemId, product, sku, quantity, companyId, user } = req.body;

        if (!warehouseId || !orderItemId) {
            throw new AppError('Invalid warehouse or order item', 400);
        }

        const parsedQuantity = Number(quantity);
        if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
            throw new AppError('Invalid quantity', 400);
        }

        if (!sku) {
            throw new AppError('sku es requerido', 400);
        }

        const productData = {
            name: product,
            sku: sku.replace(/^0+/, '')
        };

        const stockData = {
            warehouseId,
            quantity: parsedQuantity,
            companyId
        };

        const transactionData = {
            type: 'IN',
            warehouseToId: warehouseId,
            quantity: parsedQuantity,
            userId: user ? decodeId(user, 'user') : undefined,
            referenceId: `ORDER_ITEM_${orderItemId}`
        };

        const result = await TransactionService.productEntryInWarehouse(
            productData,
            stockData,
            transactionData,
            orderItemId
        );

        res.status(200).json({ data: result.message });

    } catch (error) {
        next(error);
    }
};

const transactionWarehouse = async (req, res, next) => {
    try {
        const { products, userName, location } = req.body;
        const companyId = req.body.companyId ? decodeId(req.body.companyId, 'companyId') : null;
        const warehouseFromId = decodeId(req.body.warehouseFromId, 'warehouseFromId');
        const warehouseToId = decodeId(req.body.warehouseToId, 'warehouseToId');
        const userId = decodeId(req.body.userId, 'userId');

        const consecutivo = await Consecutivo.findOne({ where: {} }) ?? await Consecutivo.create({ valor: 1 });

        const formattedCounter = `000-${consecutivo.valor.toString().padStart(3, '0')}`;
        await Consecutivo.update({ valor: consecutivo.valor + 1 }, { where: {} });

        const transactions = await TransactionService.transactionWarehouse({
            products,
            warehouseFromId,
            warehouseToId,
            userId,
            companyId,
            formattedCounter
        });

        if (transactions.success) {
            if (location === 'UIO') {
                const result = await CompanyService.getCompanyById(companyId);
                axios.post('http://190.12.15.164:5859/print/transactions', { products, userName, company: result?.name, formattedCounter })
            }
            // if (location === 'GPS') {
            //     console.log('imprimiendo en galapagos')
            //     //axios.post('http://localhost:3000/print/transactions', { products, userName, company })
            // }
            res.status(200).json({ data: transactions.message });
        }
    } catch (error) {
        console.log(error)
        next(error);
    }
}

const incomeProductsInWarehouse = async (req, res) => {
    try {
        const { products } = req.body;
        const warehouseToId = Utils.decode(req.body.warehouseToId)
        const companyId = Utils.decode(req.body.companyId)
        const userId = Utils.decode(req.body.userId)

        const transactions = await TransactionService.incomeProductsInWarehouse({
            products,
            warehouseToId,
            companyId,
            userId
        });
        if (transactions) {
            res.status(200).json({ data: 'Transacción completada correctamente.' });
        }
    } catch (error) {
        res.status(400).json(error.message);
    }
}

const updateStatusItem = async (req, res, next) => {
    try {
        const itemId = decodeId(req.params.item_id, 'item_id');
        const data = req.body;
        await TransactionService.updateStatusItem(data, itemId);
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        next(error);
    }
}

const incomeProductsRegister = async (req, res) => {
    try {
        const { transactiones, observations } = req.body;
        const warehouseToId = 2
        const companyId = Utils.decode(req.body.companyId);
        const userId = Utils.decode(req.body.userId);
        const registerId = Utils.decode(req.body.id);

        await TransactionService.incomeProductsRegister({
            transactiones,
            warehouseToId,
            companyId,
            userId,
            registerId,
            observations
        });

        res.status(200).json({ data: 'Transacción completada correctamente.' });

    } catch (error) {
        res.status(400).json(error.message);
    }
}

const printRegister = async (req, res) => {
    try {
        const formattedCounter = req.body.counter
        const company = req.body.empresa?.name
        const userName = req.body.responsable?.firstName + ' ' + req.body.responsable?.lastName
        const products = req.body.transactiones.map(transaccion => {
            return { name: transaccion.product.name, quantity: transaccion.quantity }
        })

        const result = await axios.post('http://190.12.15.164:5859/print/transactions', { products, userName, company, formattedCounter })

        if (result.status === 200) {
            res.status(200).json({ data: 'Transacción completada correctamente.' });
        } else {
            res.status(400).json({ data: 'Error al imprimir el registro.' });
        }

    } catch (error) {
        res.status(400).json(error.message);
    }
}

const TransactionController = {
    productEntryInWarehouse,
    transactionWarehouse,
    incomeProductsInWarehouse,
    incomeProductsRegister,
    printRegister,
    updateStatusItem,
}
module.exports = TransactionController