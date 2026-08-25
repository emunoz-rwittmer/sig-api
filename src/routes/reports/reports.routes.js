const { Router } = require('express');
const excelReports = require ('../../controllers/reports');
const powerbiReports = require('../../controllers/reports/powerbi.controller');
const authJwt = require('../../middlewares/auth.middleware');
const { verifyPowerBIDatasetKey } = require('../../middlewares/apiKey.middleware');
const router = Router();

const POWERBI_ALLOWED_ROLES = ['admin', 'psicologos', 'gerencia_gps', 'gerencia_uio'];

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
router.get('/order/:order_id', authJwt.verifyToken, excelReports.generateOrderExcel);

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
router.post('/stockWarehouse', authJwt.verifyToken, excelReports.generateStockExcel);

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
router.get('/transactions/stock/:stock_id', authJwt.verifyToken, excelReports.generateTransactionsExcel);

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
router.get('/evaluations/generalReport/:company_id', authJwt.verifyToken, excelReports.generateGeneralReportEvaluations);

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
router.post('/evaluations/reportByEmployed', authJwt.verifyToken, excelReports.generatReportEvaluationsByEmployed);

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
router.get('/comentCards/generateReport/:yacht_id', authJwt.verifyToken, excelReports.generateReportComentCards);

/**
 * @openapi
 * /reports/powerbi/{reportKey}/embed:
 *   get:
 *     summary: Obtener la configuración de embed (token corto) de un reporte Power BI
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reportKey
 *         required: true
 *         schema:
 *           type: string
 *         description: Clave del reporte configurada en POWERBI_REPORTS_MAP (ej. "desempeno")
 *     responses:
 *       200:
 *         description: Configuración de embed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 embedUrl:
 *                   type: string
 *                 embedToken:
 *                   type: string
 *                 reportId:
 *                   type: string
 *                 expiration:
 *                   type: string
 *       403:
 *         description: Token no proporcionado o rol no autorizado
 *       404:
 *         description: reportKey no configurado
 */
router.get('/powerbi/:reportKey/embed', authJwt.verifyToken, authJwt.hasAnyRole(POWERBI_ALLOWED_ROLES), powerbiReports.getPowerBIEmbedConfig);

/**
 * @openapi
 * /reports/evaluations/powerbi-dataset:
 *   get:
 *     summary: Dataset JSON de evaluaciones para el refresco programado de Power BI Service
 *     tags: [Reports]
 *     security:
 *       - powerbiApiKey: []
 *     responses:
 *       200:
 *         description: Filas planas de evaluaciones
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       401:
 *         description: X-PowerBI-Key ausente o inválido
 */
router.get('/evaluations/powerbi-dataset', verifyPowerBIDatasetKey, powerbiReports.getEvaluationsPowerBIDataset);

module.exports = router;
