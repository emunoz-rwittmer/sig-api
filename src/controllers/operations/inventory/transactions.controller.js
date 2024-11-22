const axios = require('axios');
const TransactionService = require('../../../services/operations/inventory/transactions.services');
const OrderService = require('../../../services/operations/orders/orders.services');
const Utils = require('../../../utils/Utils');
const WarehouseService = require('../../../services/operations/inventory/warehouse.services');
const { sendConfirmationEmail, sendEmailNewRequest } = require('../../../utils/mailer');
const Staffervice = require('../../../services/catalogs/staff.services');

const productEntryInWarehouse = async (req, res) => {
    try {
        const warehouseId = parseInt(req.params.warehouse_id);
        const data = req.body;

        const productData = {
            name: data.product,
            sku: data.sku.replace(/^0+/, '')
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
        const { products, userName, company, location } = req.body;
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
            if (location === 'UIO') {
                axios.post('http://190.12.15.164:5859/print/transactions', { products, userName, company })
            }
            if (location === 'GPS') {
                console.log('ipimiendo en galapagos')
                //axios.post('http://localhost:3000/print/transactions', { products, userName, company })
            }
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
        console.log(error.message)
        res.status(400).json(error.message);
    }
}

//yacht recuest 

const createRequestWarehouse = async (req, res) => {
    try {
        const { products, name, status, group } = req.body;
        products.map(product => {
            product.placeYachtId = product.productId
            product.stock = product.stock === '' ? 0 : product.stock
            product.order = product.order === '' ? 0 : product.order

        })
        const warehouseId = Utils.decode(req.body.warehouseId)
        const userId = Utils.decode(req.body.userId)
        const requestData = {
            warehouseId,
            userId,
            name,
            group,
            status
        }

        const result = await TransactionService.createRequestWarehouse({
            products,
            requestData
        });

        const company = await WarehouseService.getWarehouseById(warehouseId)
        const staff = await Staffervice.getStaffById(userId)
        action = 'requerimiento'
        sendEmailNewRequest(company.name);
        sendConfirmationEmail(action, company.name, staff)

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
    updateStatusItem,
    createRequestWarehouse
}
module.exports = TransactionController