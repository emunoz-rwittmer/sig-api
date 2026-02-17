const OrderService = require('../../../services/operations/orders/orders.services');
const Utils = require('../../../utils/Utils');
const CompanyService = require('../../../services/catalogs/company.services');
const XLSX = require('xlsx');
const { sendEmailNewOrder, sendConfirmationEmail, sendDispatchEmail } = require('../../../mails/mailer');
const Staffervice = require('../../../services/catalogs/staff.services');

const getAllOrders = async (req, res) => {
    try {
        const result = await OrderService.getAllOrders();
        if (result instanceof Array) {
            result.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
                x.dataValues.companyId = Utils.encode(x.dataValues.companyId);
            });
        }
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json(error.message)
    }
}

const getOrderById = async (req, res) => {
    try {
        const orderId = Utils.decode(req.params.order_id);
        const result = await OrderService.getOrderById(orderId)
        if (result instanceof Object) {
            result.id = Utils.encode(result.id);
        }
        res.status(200).json(result);
    } catch (error) {

        res.status(400).json(error.message)
    }
}

const createOrder = async (req, res) => {
    try {
        const data = req.body;
        data.companyId = Utils.decode(data.companyId)
        data.userId = Utils.decode(data.userId)

        const file = req.file;
        const fieldMapping = {
            'sku': 'sku',
            'product': 'product',
            'quantity': 'quantity',
            'originalQuantity': 'originalQuantity',
        };

        const workbook = XLSX.readFile(file.path);
        const sheet_name_list = workbook.SheetNames;
        const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]]);
        const mappedData = jsonData.map(row => {
            const mappedRow = {};
            for (const [excelField, modelField] of Object.entries(fieldMapping)) {
                mappedRow[modelField] = row[excelField];
            }

            return mappedRow;
        });

        await OrderService.createOrder(data, mappedData);

        const company = await CompanyService.getCompanyById(data.companyId)
        const staff = await Staffervice.getStaffById(data.userId)
        action = 'pedido'
        sendEmailNewOrder(company.name);
        sendConfirmationEmail(action, company.name, staff)
        res.status(200).json({ data: 'resource created successfully' });
    } catch (error) {
        res.status(400).json(error.message);
    }
}

const updateOrder = async (req, res) => {
    try {
        const orderId = Utils.decode(req.params.order_id);
        const data = req.body
        await OrderService.updateOrder(data, {
            where: { id: orderId }
        });

        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {

        res.status(400).json(error.message)
    }
}

const deleteItem = async (req, res) => {
    try {
        const itemId = Utils.decode(req.params.item_id);
        const result = await OrderService.deleteItem(itemId);
        res.status(200).json({ data: result })
    } catch (error) {
        res.status(400).json(error.message);
    }
}

const OrderController = {
    getAllOrders,
    getOrderById,
    createOrder,
    updateOrder,
    deleteItem
}
module.exports = OrderController