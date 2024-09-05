const TransactionService = require('../../../services/operations/inventory/transactions.services');
const OrderService = require('../../../services/operations/orders/orders.services');
const Utils = require('../../../utils/Utils');

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
            quantity: data.quantity
        }

        const transactionData = {
            type: 'Ingreso',
            warehouseToId: warehouseId,
            quantity: data.quantity
        }
        
        const result = await TransactionService.productEntryInWarehouse(productData, stockData, transactionData);
        if (result) {
            await OrderService.updateStatusItemOfOrder(Utils.decode(data.id))
            res.status(200).json({ data: result.message });
        }
    } catch (error) {
        console.log(error)
        res.status(400).json(error.message)
    }
}



const TransactionController = {
    productEntryInWarehouse,
}
module.exports = TransactionController