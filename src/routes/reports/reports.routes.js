const { Router } = require('express');
const excelReports = require ('../../controllers/reports');
const router = Router();

/**
 * @openapi
 * /reports/order/{order_id}:
 *   get:
 *     summary: Generar el reporte Excel de una orden
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: order_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de orden codificado (hashids)
 *     responses:
 *       200:
 *         description: Archivo Excel generado
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: La orden no tiene items
 *       404:
 *         description: Orden no encontrada
 */
router.get('/order/:order_id', excelReports.generateOrderExcel);

/**
 * @openapi
 * /reports/stockWarehouse:
 *   post:
 *     summary: Generar el reporte Excel de stock de una bodega
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [warehouseName, products]
 *             properties:
 *               warehouseName:
 *                 type: string
 *               products:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Archivo Excel generado
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: products es requerido
 */
router.post('/stockWarehouse', excelReports.generateStockExcel);

/**
 * @openapi
 * /reports/transactions/stock/{stock_id}:
 *   get:
 *     summary: Generar el reporte Excel de transacciones de un stock
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: stock_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de stock codificado (hashids)
 *     responses:
 *       200:
 *         description: Archivo Excel generado
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Stock no encontrado
 */
router.get('/transactions/stock/:stock_id', excelReports.generateTransactionsExcel);

/**
 * @openapi
 * /reports/evaluations/generalReport/{company_id}:
 *   get:
 *     summary: Generar el reporte Excel general de evaluaciones de una compañía
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: company_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de compañía codificado (hashids)
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Archivo Excel generado
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: No hay registros
 */
router.get('/evaluations/generalReport/:company_id', excelReports.generateGeneralReportEvaluations);

/**
 * @openapi
 * /reports/evaluations/reportByEmployed:
 *   post:
 *     summary: Generar el reporte Excel de evaluaciones de un empleado
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reportingEvaluationsByCrewState, dataForReport]
 *             properties:
 *               reportingEvaluationsByCrewState:
 *                 type: object
 *               dataForReport:
 *                 type: object
 *     responses:
 *       200:
 *         description: Archivo Excel generado
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: dataForReport.averageReviews es requerido
 */
router.post('/evaluations/reportByEmployed', excelReports.generatReportEvaluationsByEmployed);

/**
 * @openapi
 * /reports/comentCards/generateReport/{yacht_id}:
 *   get:
 *     summary: Generar el reporte Excel de comment cards de un yate
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: yacht_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de yate codificado (hashids)
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Archivo Excel generado
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: No hay registros
 */
router.get('/comentCards/generateReport/:yacht_id', excelReports.generateReportComentCards);

module.exports = router;
