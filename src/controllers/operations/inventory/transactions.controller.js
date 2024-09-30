const TransactionService = require('../../../services/operations/inventory/transactions.services');
const OrderService = require('../../../services/operations/orders/orders.services');
const Utils = require('../../../utils/Utils');
const thermalPrinter = require('node-thermal-printer');
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
            quantity: data.quantity
        }

        const transactionData = {
            type: 'Entrada',
            warehouseToId: warehouseId,
            quantity: data.quantity,
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
        const { products } = req.body;
        const warehouseFromId = Utils.decode(req.body.warehouseFromId)
        const warehouseToId = Utils.decode(req.body.warehouseToId)

        const transactions = await TransactionService.createTransaction({
            products,
            warehouseFromId,
            warehouseToId,
        });
        res.status(200).json({ data: 'transactions register success.' });
    } catch (error) {
        console.log(error.message)
        res.status(400).json(error.message);
    }
}

const printTransactions = async (req, res) => {
    try {

        const { products, company, companyAdress } = req.body;

        escpos.USB = require('escpos-usb');
        const device = new escpos.USB(0x04B8, 0x0202);
        const printer = new escpos.Printer(device);

        device.open(function () {
            printer
                .align('CT')
                .text(company)
                .text(companyAdress)
                .text('')
                .align('LT')
                .text('DATE: 12/12/2023')
                .text('TIME: 23:20:08')
                .text('--------------------------------')
            printer
                .align('CT')
                .tableCustom([
                    { text: 'CANT.', align: "LEFT", width: 0.15 }, // 30% de la línea
                    { text: 'PRODUCTO', align: "LEFT", width: 0.85 }, // 70% de la línea
                ])

            products.forEach((product) => {
                printer.tableCustom([
                    { text: product.quantity.toString(), align: "LEFT", width: 0.15 }, // 30% de la línea
                    { text: product.name, align: "LEFT", width: 0.85 }, // 70% de la línea
                ]);
                //printer.text(fila);

            });

            // Cerrar la impresora y cortar el papel
            printer
                .text('--------------------------------')
                .text('DESPACHADO POR')
                .text('EDISON MU;OZ')
                .cut()
                .close();

        });


    } catch (err) {
        console.error('Error al imprimir:', err);
        res.status(500).send('Error al imprimir');
    }
}

const TransactionController = {
    productEntryInWarehouse,
    transactionWarehouse,
    printTransactions
}
module.exports = TransactionController