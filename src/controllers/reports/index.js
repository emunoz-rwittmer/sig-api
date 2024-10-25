const { generateRequestExcel } = require("./generateRequestExcel");
const { generateOrderExcel } = require("./generateOrderExcel");
const { generateStockExcel } = require("./generateStockExcel");
const { generateTransactionsExcel } = require('./generateTransactionsExcel');

const excelReports = {
    generateRequestExcel,
    generateOrderExcel,
    generateStockExcel,
    generateTransactionsExcel
}
module.exports = excelReports
