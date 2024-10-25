const { generateRequestExcel } = require("./generateRequestExcel");
const { generateOrderExcel } = require("./generateOrderExcel");
const { generateStockExcel } = require("./generateStockExcel");

const excelReports = {
    generateRequestExcel,
    generateOrderExcel,
    generateStockExcel
}
module.exports = excelReports
