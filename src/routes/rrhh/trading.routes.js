const { Router } = require('express');
const TradingController = require('../../controllers/rrhh/trading.controller');
const { uploadPdfFile } = require('../../utils/uploadConfiguration');
const router = Router();

/**
 * @openapi
 * /tradings:
 *   get:
 *     summary: Listar todos los tradings
 *     tags: [Tradings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de tradings
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     description: ID de trading codificado (hashids)
 *                   name:
 *                     type: string
 *                   type:
 *                     type: string
 *                   url:
 *                     type: string
 *   post:
 *     summary: Crear un trading
 *     tags: [Tradings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [name, type, file]
 *             properties:
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Trading creado
 *       400:
 *         description: No se ha subido ningún archivo
 */
/**
 * @openapi
 * /tradings/me:
 *   get:
 *     summary: Listar los tradings con el estado de revision del colaborador autenticado
 *     tags: [Tradings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de tradings, cada uno con el campo booleano viewed
 */
router.get('/me', TradingController.getMyTradings);

/**
 * @openapi
 * /tradings/{trading_id}/view:
 *   put:
 *     summary: Marcar un trading como revisado por el colaborador autenticado
 *     tags: [Tradings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: trading_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Trading marcado como revisado
 *       404:
 *         description: Trading no encontrado
 */
router.put('/:trading_id/view', TradingController.markTradingViewed);

router.get('/', TradingController.getAllTradings);
router.post('/', uploadPdfFile, TradingController.createTrading);

/**
 * @openapi
 * /tradings/{trading_id}:
 *   get:
 *     summary: Obtener un trading por ID
 *     tags: [Tradings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: trading_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de trading codificado (hashids)
 *     responses:
 *       200:
 *         description: Trading encontrado
 *       404:
 *         description: Trading no encontrado
 *   put:
 *     summary: Actualizar un trading
 *     tags: [Tradings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: trading_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de trading codificado (hashids)
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Trading actualizado
 *   delete:
 *     summary: Eliminar un trading
 *     tags: [Tradings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: trading_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de trading codificado (hashids)
 *     responses:
 *       200:
 *         description: Trading eliminado
 */
router.get('/:trading_id', TradingController.getTrading);
router.put('/:trading_id', uploadPdfFile, TradingController.updateTrading);
router.delete('/:trading_id', TradingController.deleteTrading);


module.exports = router;
