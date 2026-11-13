const { generateOrderExcel } = require("./generateOrderExcel");
const { generateStockExcel } = require("./generateStockExcel");
const { generateTransactionsExcel } = require('./generateTransactionsExcel');
const { generateTransactionHistoryExcel } = require('./generateTransactionHistoryExcel');
const { generateGeneralReportEvaluations } = require("./generateGeneralReportEvaluations");
const { generatReportEvaluationsByEmployed } = require("./generatReportEvaluationsByEmployed");
const { generateReportComentCards } = require("./generateReportComentCards");

const excelReports = {
    generateOrderExcel,
    generateStockExcel,
    generateTransactionsExcel,
    generateTransactionHistoryExcel,
    generateGeneralReportEvaluations,
    generatReportEvaluationsByEmployed,
    generateReportComentCards
}
module.exports = excelReports
