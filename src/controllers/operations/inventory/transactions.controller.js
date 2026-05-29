const axios = require('axios');
const TransactionService = require('../../../services/operations/inventory/transactions.services');
const Utils = require('../../../utils/Utils');
const CompanyService = require('../../../services/catalogs/company.services');
const Consecutivo = require('../../../models/catalogs/consecutivo.model');

const productEntryInWarehouse = async (req, res) => {
    try {
        const warehouseId = Number(req.params.warehouse_id);
        const { id: orderItemId, product, sku, quantity, companyId, user } = req.body;

        if (!warehouseId || !orderItemId) {
            return res.status(400).json({ message: 'Invalid warehouse or order item' });
        }

        const parsedQuantity = Number(quantity);
        if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
            return res.status(400).json({ message: 'Invalid quantity' });
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
            userId: Utils.decode(user),
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
        res.status(400).json(error.message)
    }
};

const transactionWarehouse = async (req, res) => {
    try {
        const { products, userName, location } = req.body;
        const companyId = Utils.decode(req.body.companyId) || null;
        const warehouseFromId = Utils.decode(req.body.warehouseFromId);
        const warehouseToId = Utils.decode(req.body.warehouseToId);
        const userId = Utils.decode(req.body.userId);

        const consecutivo = await Consecutivo.findOne({ where: {} });
        if (consecutivo === null) {
            await Consecutivo.create({ valor: 1 });
        }

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
        res.status(400).json(error.message);
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

const updateStatusItem = async (req, res) => {
    try {
        const itemId = Utils.decode(req.params.item_id);
        const data = req.body;
        const result = await TransactionService.updateStatusItem(data, {
            where: { id: itemId },
        });
        if (result) {
            res.status(200).json({ data: 'resource updated successfully' });
        }

    } catch (error) {

        res.status(400).json(error.message);
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