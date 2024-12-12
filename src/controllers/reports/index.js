const { generateRequestExcel } = require("./generateRequestExcel");
const { generateOrderExcel } = require("./generateOrderExcel");
const { generateStockExcel } = require("./generateStockExcel");
const { generateTransactionsExcel } = require('./generateTransactionsExcel');
const { generateGeneralReportEvaluations } = require("./generateGeneralReportEvaluations");
const { generatReportEvaluationsByEmployed } = require("./generatReportEvaluationsByEmployed");

const excelReports = {
    generateRequestExcel,
    generateOrderExcel,
    generateStockExcel,
    generateTransactionsExcel,
    generateGeneralReportEvaluations,
    generatReportEvaluationsByEmployed
}
module.exports = excelReports
