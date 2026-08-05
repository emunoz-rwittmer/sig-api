const { Router } = require('express');
const DownloadController = require('../../controllers/downloads/downloads.controller');
const ConsumerCardController = require('../../controllers/bar/consumerCard.controller');

const router = Router();

/**
 * @openapi
 * /downloads/{rule_id}/download:
 *   get:
 *     summary: Descargar el archivo de un reglamento
 *     tags: [Downloads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rule_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de reglamento codificado (hashids)
 *     responses:
 *       200:
 *         description: Archivo del reglamento
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: ID codificado inválido
 *       403:
 *         description: Token ausente o inválido
 *       404:
 *         description: Reglamento inexistente, sin archivo asociado o con archivo ausente en disco
 */
router.get('/:rule_id/download', DownloadController.downloadReglamento);

/**
 * @openapi
 * /downloads/guide/{guide_id}/download:
 *   get:
 *     summary: Descargar el archivo de una guía de remisión
 *     tags: [Downloads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: guide_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de guía de remisión codificado (hashids)
 *     responses:
 *       200:
 *         description: Archivo de la guía de remisión
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: ID codificado inválido
 *       403:
 *         description: Token ausente o inválido
 *       404:
 *         description: Guía inexistente, sin archivo asociado o con archivo ausente en disco
 */
router.get('/guide/:guide_id/download', DownloadController.downloadGuiaRemision);

/**
 * @openapi
 * /downloads/doctor_format/{format_id}/download:
 *   get:
 *     summary: Descargar el archivo de un formato médico
 *     tags: [Downloads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: format_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de formato médico codificado (hashids)
 *     responses:
 *       200:
 *         description: Archivo del formato médico
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: ID codificado inválido
 *       403:
 *         description: Token ausente o inválido
 *       404:
 *         description: Formato inexistente, sin archivo asociado o con archivo ausente en disco
 */
router.get('/doctor_format/:format_id/download', DownloadController.downloadFormato);

/**
 * @openapi
 * /downloads/staff/request/{request_id}/download:
 *   get:
 *     summary: Descargar una solicitud de staff
 *     tags: [Downloads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: request_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de solicitud codificado (hashids)
 *     responses:
 *       200:
 *         description: Archivo de la solicitud
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: ID codificado inválido
 *       403:
 *         description: Token ausente o inválido
 *       404:
 *         description: Solicitud inexistente, sin archivo asociado o con archivo ausente en disco
 */
router.get('/staff/request/:request_id/download', DownloadController.downloadSolicitud);

/**
 * @openapi
 * /downloads/cruise/{cruise_id}/download/pfd:
 *   get:
 *     summary: "Descargar el reporte PDF de un crucero (nota: 'pfd' es un typo histórico en la URL pública; se conserva por compatibilidad con el front)"
 *     tags: [Downloads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cruise_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de crucero codificado (hashids)
 *     responses:
 *       200:
 *         description: Reporte PDF del crucero
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: ID codificado inválido
 *       403:
 *         description: Token ausente o inválido
 *       404:
 *         description: Crucero inexistente, sin reporte asociado o con archivo ausente en disco
 */
router.get('/cruise/:cruise_id/download/pfd', DownloadController.downloadreportePdf);

/**
 * @openapi
 * /downloads/cruise/{cruise_id}/download/excel:
 *   get:
 *     summary: Descargar el reporte Excel de un crucero
 *     tags: [Downloads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cruise_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de crucero codificado (hashids)
 *     responses:
 *       200:
 *         description: Reporte Excel del crucero
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: ID codificado inválido
 *       403:
 *         description: Token ausente o inválido
 *       404:
 *         description: Crucero inexistente, sin reporte asociado o con archivo ausente en disco
 */
router.get('/cruise/:cruise_id/download/excel', DownloadController.downloadreporteExcel);

/**
 * @openapi
 * /downloads/consumer-cards/export/report:
 *   get:
 *     summary: Generar y descargar el reporte Excel de consumer cards de un yate
 *     tags: [Downloads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: yachtId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de yate codificado (hashids)
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Año de creación de las tarjetas
 *       - in: query
 *         name: start
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha inicial del rango de cruceros
 *       - in: query
 *         name: end
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha final del rango de cruceros
 *     responses:
 *       200:
 *         description: Reporte Excel generado
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: ID de yate codificado inválido
 *       403:
 *         description: Token ausente o inválido
 *       404:
 *         description: Yate no encontrado
 */
router.get('/consumer-cards/export/report', ConsumerCardController.exportConsumerCardReport);

module.exports = router;
