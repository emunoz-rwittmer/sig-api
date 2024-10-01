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
        const userId = Utils.decode(req.body.user)

        const transactions = await TransactionService.createTransaction({
            products,
            warehouseFromId,
            warehouseToId,
            userId
        });
        res.status(200).json({ data: 'transactions register success' });
    } catch (error) {
        console.log(error.message)
        res.status(400).json(error.message);
    }
}

const printTransactions = async (req, res) => {
    try {

        escpos.USB = require('escpos-usb');
        const device = new escpos.USB(0x04B8, 0x0202);
        const printer = new escpos.Printer(device);

        const { products, company, user } = req.body;
        const formattedDate = new Date();
        const suma = products.reduce((suma, product) => suma + product.quantity, 0);

        device.open(function () {
            printer
                .align('CT')
                .text(company)
                .text('')
                .align('LT')
                .text(`FECHA: ${Utils.formatDateToLocal(formattedDate)}`)
                .text(`DESPACHADOR: ${user}`)
                .text(`TOTAL PRODUCTOS EN GAVETA: ${suma}`)
                .text('----------------------------------------')
            printer
                .align('CT')
                .tableCustom([
                    { text: 'CANT', align: "LEFT", width: 0.13 },
                    { text: 'PRODUCTO', align: "LEFT", width: 0.87 },
                ])

            products.forEach((product) => {
                const maxLength = 27; // Define el límite máximo de caracteres
                const nombreCorto = product.name.length > maxLength
                    ? product.name.substring(0, maxLength) + '...'
                    : product.name;
                printer.tableCustom([
                    { text: product.quantity.toString(), align: "LEFT", width: 0.13 },
                    { text: nombreCorto, align: "LEFT", width: 0.87 },
                ]);
            });

            printer
                .text('--------------------------------')
                .text('EN ESTA GAVETA VAN PRODUCTOS VERIFICADOS Y CONTADOS')
                .cut()
                .close();

        });
        res.status(200).json({ data: 'print success' });
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