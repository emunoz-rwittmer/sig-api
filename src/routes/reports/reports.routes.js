const { Router } = require('express');
const excelReports = require ('../../controllers/reports');
const desempenoDashboard = require('../../controllers/reports/desempenoDashboard.controller');
const authJwt = require('../../middlewares/auth.middleware');
const router = Router();

const DESEMPENO_DASHBOARD_ROLES = ['admin', 'psicologos', 'gerencia_gps', 'gerencia_uio'];

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
 * /reports/desempeno/overview:
 *   get:
 *     summary: KPIs y tendencias mensuales de desempeño de tripulación por año
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: yate
 *         schema:
 *           type: string
 *         description: Nombre del yate para filtrar (opcional, sin filtro = todos)
 *     responses:
 *       200:
 *         description: KPIs por año y series mensuales de calificación/compliance
 *       403:
 *         description: Token no proporcionado o rol no autorizado
 */
router.get('/desempeno/overview', authJwt.verifyToken, authJwt.hasAnyRole(DESEMPENO_DASHBOARD_ROLES), desempenoDashboard.getDesempenoOverview);

/**
 * @openapi
 * /reports/desempeno/yates:
 *   get:
 *     summary: Promedio de calificación por yate y detalle mensual de un yate
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: yate
 *         schema:
 *           type: string
 *         description: Nombre del yate para filtrar los KPIs (opcional)
 *     responses:
 *       200:
 *         description: Promedio por yate + KPIs y series mensuales
 *       403:
 *         description: Token no proporcionado o rol no autorizado
 */
router.get('/desempeno/yates', authJwt.verifyToken, authJwt.hasAnyRole(DESEMPENO_DASHBOARD_ROLES), desempenoDashboard.getDesempenoYates);

/**
 * @openapi
 * /reports/desempeno/personas:
 *   get:
 *     summary: KPIs, series mensuales y promedios por yate, calificación por evaluado y compliance por evaluador, con comentarios de texto libre
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: yate
 *         schema:
 *           type: string
 *       - in: query
 *         name: evaluado
 *         schema:
 *           type: string
 *       - in: query
 *         name: funcion
 *         schema:
 *           type: string
 *       - in: query
 *         name: area
 *         schema:
 *           type: string
 *       - in: query
 *         name: anio
 *         schema:
 *           type: integer
 *         description: Año para filtrar (opcional). Si se omite, los datos de distintos años se combinan en el mismo mes — se recomienda siempre pasar este filtro en producción.
 *     responses:
 *       200:
 *         description: KPIs (kpisByYear, kpis con calificacionMax/calificacionMin), promedios y series mensuales (avgByYate, monthlyCalificacion, monthlyCompliance, monthlyCalificacionByYate), tablas por evaluado/evaluador y comentarios de texto libre. A diferencia de /yates, aquí avgByYate y monthlyCalificacionByYate respetan el filtro yate actual (no siempre muestran las 4 embarcaciones).
 *       403:
 *         description: Token no proporcionado o rol no autorizado
 */
router.get('/desempeno/personas', authJwt.verifyToken, authJwt.hasAnyRole(DESEMPENO_DASHBOARD_ROLES), desempenoDashboard.getDesempenoPersonas);

/**
 * @openapi
 * /reports/desempeno/preguntas:
 *   get:
 *     summary: Desglose de calificación por pregunta/competencia, con series mensuales generales y por función
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: evaluado
 *         schema:
 *           type: string
 *       - in: query
 *         name: funcion
 *         schema:
 *           type: string
 *       - in: query
 *         name: anio
 *         schema:
 *           type: integer
 *         description: Año para filtrar (opcional). porMes y porFuncionMes ya separan cada año en su propia fila, así que omitirlo no mezcla años.
 *     responses:
 *       200:
 *         description: Competencias + desglose mensual (porMes), desglose mensual por función (porFuncionMes) y por evaluador (porEvaluador)
 *       403:
 *         description: Token no proporcionado o rol no autorizado
 */
router.get('/desempeno/preguntas', authJwt.verifyToken, authJwt.hasAnyRole(DESEMPENO_DASHBOARD_ROLES), desempenoDashboard.getDesempenoPreguntas);

module.exports = router;
