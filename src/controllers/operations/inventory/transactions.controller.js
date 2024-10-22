const axios = require('axios');
const TransactionService = require('../../../services/operations/inventory/transactions.services');
const OrderService = require('../../../services/operations/orders/orders.services');
const Utils = require('../../../utils/Utils');
const escpos = require('escpos');

const productEntryInWarehouse = async (req, res) => {
    try {
        const warehouseId = parseInt(req.params.warehouse_id);
        const data = req.body;

        const productData = {
            name: data.product,
            sku: data.sku
        }

        const stockData = {
            warehouseId,
            quantity: parseInt(data.quantity)
        }

        const transactionData = {
            type: 'Entrada',
            warehouseToId: warehouseId,
            quantity: parseInt(data.quantity),
            userId: Utils.decode(data.user)
        }

        const result = await TransactionService.productEntryInWarehouse(productData, stockData, transactionData);
        if (result) {
            await OrderService.updateStatusAndQuantityItemOfOrder(Utils.decode(data.id), data.quantity)
            res.status(200).json({ data: result.message });
        }
    } catch (error) {
        console.log(error)
        res.status(400).json(error.message)
    }
}

const transactionWarehouse = async (req, res) => {
    try {
        const { products, userName, company } = req.body;
        const warehouseFromId = Utils.decode(req.body.warehouseFromId)
        const warehouseToId = Utils.decode(req.body.warehouseToId)
        const userId = Utils.decode(req.body.userId)

        const transactions = await TransactionService.transactionWarehouse({
            products,
            warehouseFromId,
            warehouseToId,
            userId
        });
        if (transactions) {
            axios.post('http://190.12.15.164:8925/print/transactions', { products, userName, company })
            res.status(200).json({ data: 'transactions register success' });
        }
    } catch (error) {
        console.log(error.message)
        res.status(400).json(error.message);
    }
}

const incomeProductsInWarehouse = async (req, res) => {
    try {
        const { products } = req.body;
        const warehouseToId = Utils.decode(req.body.warehouseToId)
        const userId = Utils.decode(req.body.userId)

        const transactions = await TransactionService.incomeProductsInWarehouse({
            products,
            warehouseToId,
            userId
        });
        if (transactions) {
            res.status(200).json({ data: 'transactions register success' });
        }
    } catch (error) {
        console.log(error.message)
        res.status(400).json(error.message);
    }
}

//yacht recuest 

const requestWarehouse = async (req, res) => {
    try {
        const { products, name, status } = req.body;
        const warehouseId = Utils.decode(req.body.warehouseId)
        const userId = Utils.decode(req.body.userId)
        const requestData = {
            warehouseId,
            userId,
            name,
            status
        }

        const result = await TransactionService.requestWarehouse({
            products,
            requestData
        });

        res.status(200).json({ data: result.message }); 
    } catch (error) {
        console.log(error.message)
        res.status(400).json(error.message);
    }
}

const TransactionController = {
    productEntryInWarehouse,
    transactionWarehouse,
    incomeProductsInWarehouse,
    requestWarehouse
}
module.exports = TransactionController