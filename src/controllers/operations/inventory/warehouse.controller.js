const WarehouseService = require('../../../services/operations/inventory/warehouse.services');
const Utils = require('../../../utils/Utils');

const getAllWarehouses = async (req, res) => {
    try {
        const result = await WarehouseService.getAllWarehouses();
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

const getStockInWarehouse = async (req, res) => {
    try {
        const warehouseId = Utils.decode(req.params.warehouse_id);
        const warehouse = await WarehouseService.getWarehouseById(warehouseId);
        if (warehouse instanceof Object) {
            warehouse.dataValues.id = Utils.encode(warehouse.dataValues.id);
        }
        const result = await WarehouseService.getStockInWarehouse(warehouseId);
        res.status(200).json({ warehouse, result });
    } catch (error) {
        res.status(400).json(error.message)
    }
}

// const uploadWarehouse = async (req, res) => {
//     try {
//         const data = req.body;
//         data.warehouseId = Utils.decode(data.warehouseId)
//         data.userId = Utils.decode(data.userId)
//         const result = await WarehouseService.createWarehouse(data);
//         const WarehouseId = result.id;
//         const file = req.file;
//         if (result) {
//             const fieldMapping = {
//                 'sku': 'sku',
//                 'product': 'product',
//                 'quantity': 'quantity',
//                 'originalQuantity': 'originalQuantity',
//             };

//             const workbook = XLSX.readFile(file.path);
//             const sheet_name_list = workbook.SheetNames;
//             const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]]);
//             const mappedData = jsonData.map(row => {
//                 const mappedRow = {};
//                 for (const [excelField, modelField] of Object.entries(fieldMapping)) {
//                     mappedRow[modelField] = row[excelField];
//                 }
//                 mappedRow.WarehouseId = WarehouseId;
//                 mappedRow.status = 'en espera';
//                 return mappedRow;
//             });
//             const result = await WarehouseService.createItemsOfWarehouse(mappedData);
//             if (result) {
//                 res.status(200).json({ data: 'resource created successfully' });
//             }
//         }
//     } catch (error) {
//         console.log(error)
//         res.status(400).json(error.message);
//     }
// }

// const createWarehouse = async (req, res) => {
//     try {
//         const data = req.body;
//         const Warehouse = {
//             warehouseId: Utils.decode(data.warehouseId),
//             userId: Utils.decode(data.userId),
//             name: data.name,
//             status: data.status
//         }

//         const result = await WarehouseService.createWarehouse(Warehouse);
//         const WarehouseId = result.id;

//         const products = data.product;
//         const quantitys = data.quantity;
//         const originalQuantitys = data.originalQuantity;
//         const statusItems = data.statusItems;
//         const items = []

//         for (let i = 0; i < products.length; i++) {
//             const product = products[i];
//             const quantity = quantitys[i];
//             const originalQuantity = originalQuantitys[i];
//             const statusI = statusItems[i];
//             const item = {
//                 product,
//                 quantity,
//                 originalQuantity,
//                 status: statusI,
//                 WarehouseId
//             }
//             items.push(item)
//         }

//         if (result) {
//             const result = await WarehouseService.createItemsOfWarehouse(items);
//             if (result) {
//                 res.status(200).json({ data: 'resource created successfully' });
//             }
//         }

//     } catch (error) {
//         console.log(error)
//         res.status(400).json(error.message);
//     }
// }

// const updateWarehouse = async (req, res) => {
//     try {

//         const { body, params } = req;

//         const ids = body.id;
//         const products = body.product;
//         const quantitys = body.quantity;
//         const originalQuantitys = body.originalQuantity;

//         const items = []
//         for (let i = 0; i < ids.length; i++) {
//             const id = ids[i];
//             const product = products[i];
//             const quantity = quantitys[i];
//             const originalQuantity = originalQuantitys[i];
//             const item = {
//                 id,
//                 product,
//                 quantity,
//                 originalQuantity,
//             }
//             items.push(item)
//         }

//         const itemsUpdate = items.filter(item => item.id !== "");
//         const result = await WarehouseService.updateWarehouse(itemsUpdate);

//         const newItems = items.filter(item => item.id === "");
//         if (newItems.length > 0) {
//             const WarehouseId = Utils.decode(params.Warehouse_id);
//             const itemsCreate = newItems.map(({ id, ...rest }) => ({
//                 ...rest,
//                 WarehouseId: WarehouseId
//             }));
//             await WarehouseService.createItemsOfWarehouse(itemsCreate);
//         }

//         if (result) {
//             res.status(200).json({ data: 'resource created successfully' });
//         }

//     } catch (error) {
//         console.log(error)
//         res.status(400).json(error.message);
//     }
// }

// const updateStatusWarehouse= async (req, res) => {
//     const WarehouseId = Utils.decode(req.params.Warehouse_id);
//     const status = req.body.status
//     const result = await WarehouseService.updateStatusWarehouse(WarehouseId, status);
//     if (result) {
//         res.status(200).json({ data: 'resource updated successfully' });
//     }
    
// }

// const getItemsByWarehouse = async (req, res) => {
//     try {
//         const WarehouseId = Utils.decode(req.params.Warehouse_id);
//         const result = await WarehouseService.getItemsByWarehouse(WarehouseId)
//         if (result instanceof Array) {
//             result.map((x) => {
//                 x.dataValues.id = Utils.encode(x.dataValues.id);
//             });
//         }
//         res.status(200).json(result);
//     } catch (error) {
//         console.log(error)
//         res.status(400).json(error.message)
//     }
// }

// const deleteItem = async (req, res) => {
//     try {
//         const itemId = Utils.decode(req.params.item_id);
//         const result = await WarehouseService.deleteItem(itemId);
//         res.status(200).json({ data: result })
//     } catch (error) {
//         console.log(error)
//         res.status(400).json(error.message);
//     }
// }



const WarehouseController = {
    getAllWarehouses,
    getStockInWarehouse,
    // uploadWarehouse,
    // createWarehouse,
    // updateStatusWarehouse,
    // updateWarehouse,
    // getItemsByWarehouse,
    // deleteItem
}
module.exports = WarehouseController