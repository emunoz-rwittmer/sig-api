const OrderService = require('../../../services/operations/orders/orders.services');
const YachtService = require('../../../services/catalogs/yachts.services');
const Utils = require('../../../utils/Utils');
const XLSX = require('xlsx');

const getAllYachtWhitOrders = async (req, res) => {
    try {
        const result = await OrderService.getYachtsWhitOrders();
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

const getOrdersByYacht = async (req, res) => {
    try {
        const yachtId = Utils.decode(req.params.yacht_id);
        const yacht = await YachtService.getYachtById(yachtId)
        if (yacht instanceof Array) {
            yacht.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
            });
        }
        const result = await OrderService.getOrdersByYacht(yachtId);
        if (result instanceof Array) {
            result.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
            });
        }
        res.status(200).json({ yacht, result });
    } catch (error) {
        res.status(400).json(error.message)
    }
}

const uploadOrder = async (req, res) => {
    try {
        const data = req.body;
        data.yachtId = Utils.decode(data.yachtId)
        data.userId = Utils.decode(data.userId)
        const result = await OrderService.createOrder(data);
        const orderId = result.id;
        const file = req.file;
        if (result) {
            const fieldMapping = {
                'barCode': 'barCode',
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

// const respondOrder = async (req, res) => {
//     try {
//         const OrderId = Utils.decode(req.body.Order_id)
//         const Order = req.body
//         const result = await OrderService.createAnswers(OrderId, Order);
//         const response = await OrderService.updateStatusHeaderAnswers(OrderId)
//         if (response) {
//             res.status(200).json({ data: 'resource created successfully' });
//         }
//     } catch (error) {
//         console.log(error)
//         res.status(400).json(error.message);
//     }
// }

// //OrderS REPORTING

// const getReportingByYacht = async (req, res) => {
//     try {
//         const yachtId = Utils.decode(req.params.yacht_id);
//         const startDate = req.query.startDate;
//         const endDate = req.query.endDate;
//         const yacht = await YachtService.getYachtById(yachtId)
//         const Orders = await OrderService.getOrdersByYacht(yachtId, startDate, endDate)
//         if (Orders instanceof Array) {
//             Orders.map((x) => {
//                 x.dataValues.id = Utils.encode(x.dataValues.id);
//                 x.dataValues.evaluatedId = Utils.encode(x.dataValues.evaluatedId);
//             });
//         }
//         const result = await OrderService.getReportingByYacht(yachtId);
//         if (result instanceof Array) {
//             result.map((x) => {
//                 x.staff_yacht.dataValues.id = Utils.encode(x.staff_yacht.dataValues.id);
//             });
//         }
//         res.status(200).json({ yacht, result, Orders });
//     } catch (error) {
//         console.log(error)
//         res.status(400).json(error.message)
//     }
// }

// const getReportingByDepartament = async (req, res) => {
//     try {
//         const departamentId = Utils.decode(req.params.departament_id);
//         const startDate = req.query.startDate;
//         const endDate = req.query.endDate;
//         const yacht = await DepartamentService.getDepartamentById(departamentId);
//         const Orders = await OrderService.getOrdersByDepartament(departamentId, startDate, endDate);
//         if (Orders instanceof Array) {
//             Orders.map((x) => {
//                 x.dataValues.id = Utils.encode(x.dataValues.id);
//                 x.dataValues.evaluatedId = Utils.encode(x.dataValues.evaluatedId);
//             });
//         }
//         const result = await OrderService.getReportingByDepartament(departamentId);
//         if (result instanceof Array) {
//             result.map((x) => {
//                x.dataValues.id = Utils.encode(x.dataValues.id);
//             });
//         }
//         res.status(200).json({ yacht, result, Orders });
//     } catch (error) {
//         console.log(error)
//         res.status(400).json(error.message)
//     }
// }

// const getReportingOrdersByCrew = async (req, res) => {
//     try {
//         const crewId = Utils.decode(req.params.crew_id);
//         const yachtId = Utils.decode(req.query.yachtId)
//         const startDate = req.query.startDate;
//         const endDate = req.query.endDate;
//         const staff = await Staffervice.getStaffById(crewId)
//         const Orders = await OrderService.getOrderByEvaluated(crewId, startDate, endDate, yachtId)
//         res.status(200).json({ staff, Orders });

//     } catch (error) {
//         console.log(error)
//         res.status(400).json(error.message)
//     }
// }

// isTempPasswordExpired = (expirationDate) => {
//     return moment().isAfter(moment(expirationDate));
// };

const OrderController = {
    getAllYachtWhitOrders,
    getOrdersByYacht,
    uploadOrder,
    // getOrdersToDay,
    // respondOrder,
    // getReportingByYacht,
    // getReportingByDepartament,
    // getReportingOrdersByCrew
}
module.exports = OrderController