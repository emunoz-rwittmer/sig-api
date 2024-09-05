const OrderService = require('../../../services/operations/orders/orders.services');
const Utils = require('../../../utils/Utils');
const CompanyService = require('../../../services/catalogs/company.services');
const XLSX = require('xlsx');

const getAllCompaniesWhitOrders = async (req, res) => {
    try {
        const result = await OrderService.getAllCompaniesWhitOrders();
        if (result instanceof Array) {
            result.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
            });
        }
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json(error.message)
    }
}

const getOrdersByCompany = async (req, res) => {
    try {
        const companyId = Utils.decode(req.params.company_id);
        const company = await CompanyService.getCompanyById(companyId);
        if (company instanceof Array) {
            company.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
            });
        }
        const result = await OrderService.getOrdersByCompany(companyId);
        if (result instanceof Array) {
            result.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
            });
        }
        res.status(200).json({ company, result });
    } catch (error) {
        res.status(400).json(error.message)
    }
}

const uploadOrder = async (req, res) => {
    try {
        const data = req.body;
        data.companyId = Utils.decode(data.companyId)
        data.userId = Utils.decode(data.userId)
        const result = await OrderService.createOrder(data);
        const orderId = result.id;
        const file = req.file;
        if (result) {
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
                mappedRow.orderId = orderId;
                mappedRow.status = 'en espera';
                return mappedRow;
            });
            const result = await OrderService.createItemsOfOrder(mappedData);
            if (result) {
                res.status(200).json({ data: 'resource created successfully' });
            }
        }
    } catch (error) {
        console.log(error)
        res.status(400).json(error.message);
    }
}

const createOrder = async (req, res) => {
    try {
        const data = req.body;
        const order = {
            companyId: Utils.decode(data.companyId),
            userId: Utils.decode(data.userId),
            name: data.name,
            status: data.status
        }

        const result = await OrderService.createOrder(order);
        const orderId = result.id;

        const products = data.product;
        const quantitys = data.quantity;
        const originalQuantitys = data.originalQuantity;
        const items = []

        for (let i = 0; i < products.length; i++) {
            const product = products[i];
            const quantity = quantitys[i];
            const originalQuantity = originalQuantitys[i];
            const item = {
                product,
                quantity,
                originalQuantity,
                orderId
            }
            items.push(item)
        }

        if (result) {
            const result = await OrderService.createItemsOfOrder(items);
            if (result) {
                res.status(200).json({ data: 'resource created successfully' });
            }
        }

    } catch (error) {
        console.log(error)
        res.status(400).json(error.message);
    }
}

const updateOrder = async (req, res) => {
    try {

        const { body, params } = req;

        const ids = body.id;
        const products = body.product;
        const quantitys = body.quantity;
        const originalQuantitys = body.originalQuantity;

        const items = []
        for (let i = 0; i < ids.length; i++) {
            const id = ids[i];
            const product = products[i];
            const quantity = quantitys[i];
            const originalQuantity = originalQuantitys[i];
            const item = {
                id,
                product,
                quantity,
                originalQuantity,
            }
            items.push(item)
        }

        const itemsUpdate = items.filter(item => item.id !== "");
        const result = await OrderService.updateOrder(itemsUpdate);

        const newItems = items.filter(item => item.id === "");
        if (newItems.length > 0) {
            const orderId = Utils.decode(params.order_id);
            const itemsCreate = newItems.map(({ id, ...rest }) => ({
                ...rest,
                orderId: orderId
            }));
            await OrderService.createItemsOfOrder(itemsCreate);
        }

        if (result) {
            res.status(200).json({ data: 'resource created successfully' });
        }

    } catch (error) {
        console.log(error)
        res.status(400).json(error.message);
    }
}

const updateStatusOrder= async (req, res) => {
    const orderId = Utils.decode(req.params.order_id);
    const status = req.body.status
    const result = await OrderService.updateStatusOrder(orderId, status);
    if (result) {
        res.status(200).json({ data: 'resource updated successfully' });
    }
    
}

const getItemsByOrder = async (req, res) => {
    try {
        const orderId = Utils.decode(req.params.order_id);
        const result = await OrderService.getItemsByOrder(orderId)
        if (result instanceof Array) {
            result.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
            });
        }
        res.status(200).json(result);
    } catch (error) {
        console.log(error)
        res.status(400).json(error.message)
    }
}

const deleteItem = async (req, res) => {
    try {
        const itemId = Utils.decode(req.params.item_id);
        const result = await OrderService.deleteItem(itemId);
        res.status(200).json({ data: result })
    } catch (error) {
        console.log(error)
        res.status(400).json(error.message);
    }
}



const OrderController = {
    getAllCompaniesWhitOrders,
    getOrdersByCompany,
    uploadOrder,
    createOrder,
    updateStatusOrder,
    updateOrder,
    getItemsByOrder,
    deleteItem
}
module.exports = OrderController