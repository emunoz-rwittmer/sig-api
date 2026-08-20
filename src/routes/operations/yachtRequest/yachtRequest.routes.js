const { Router } = require('express');
const YachtRequestController  = require ('../../../controllers/operations/yachtRequest/yachtRequest.controller');

const router = Router();

/**
 * @openapi
 * /requests:
 *   get:
 *     summary: Listar todas las solicitudes de yate
 *     tags: [Requests]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de solicitudes con su bodega, items y responsable
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     description: ID de solicitud codificado (hashids)
 *                   warehouseId:
 *                     type: string
 *                     description: ID de bodega codificado (hashids)
 *                   name:
 *                     type: string
 *                   group:
 *                     type: string
 *                   status:
 *                     type: string
 *                   warehouse:
 *                     type: object
 *                   requestItems:
 *                     type: array
 *                     items:
 *                       type: object
 *                   responsible:
 *                     type: object
 *       403:
 *         description: Token no proporcionado o inválido
 *       500:
 *         description: Error inesperado
 *   post:
 *     summary: Crear una solicitud de yate
 *     tags: [Requests]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [warehouseId, userId, status, products]
 *             properties:
 *               warehouseId:
 *                 type: string
 *                 description: ID de bodega codificado (hashids)
 *               userId:
 *                 type: string
 *                 description: ID de staff responsable codificado (hashids)
 *               name:
 *                 type: string
 *               group:
 *                 type: string
 *               status:
 *                 type: string
 *               products:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     configurationId:
 *                       type: integer
 *                     stock:
 *                       type: integer
 *                     order:
 *                       type: integer
 *                     quantity:
 *                       type: integer
 *     responses:
 *       200:
 *         description: Solicitud creada
 *       400:
 *         description: ID codificado inválido o products no es un arreglo
 *       403:
 *         description: Token no proporcionado o inválido
 *       500:
 *         description: Error inesperado
 */
router.get('/',YachtRequestController.getAllRequests);

/**
 * @openapi
 * /requests/{request_id}:
 *   get:
 *     summary: Obtener una solicitud de yate por ID
 *     tags: [Requests]
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
 *         description: Solicitud encontrada con sus items, bodega y responsable
 *       400:
 *         description: ID codificado inválido
 *       403:
 *         description: Token no proporcionado o inválido
 *       404:
 *         description: Solicitud no encontrada
 *       500:
 *         description: Error inesperado
 *   put:
 *     summary: Actualizar una solicitud de yate (y opcionalmente las cantidades de sus items)
 *     tags: [Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: request_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de solicitud codificado (hashids)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *               name:
 *                 type: string
 *               items:
 *                 type: array
 *                 description: Items cuya cantidad se desea actualizar
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       description: ID interno (sin codificar) del item
 *                     quantity:
 *                       type: integer
 *     responses:
 *       200:
 *         description: Solicitud actualizada
 *       400:
 *         description: ID codificado inválido o cantidad de item inválida
 *       403:
 *         description: Token no proporcionado o inválido
 *       404:
 *         description: Solicitud no encontrada
 *       500:
 *         description: Error inesperado
 */
router.get('/:request_id',YachtRequestController.getRequestById);
router.post('/', YachtRequestController.createRequest);
router.put('/:request_id', YachtRequestController.updateRequest);

/**
 * @openapi
 * /requests/updateRequest/{request_id}:
 *   put:
 *     summary: Alias de PUT /requests/{request_id} (actualizar solicitud de yate)
 *     tags: [Requests]
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
 *         description: Solicitud actualizada
 *       400:
 *         description: ID codificado inválido o cantidad de item inválida
 *       403:
 *         description: Token no proporcionado o inválido
 *       404:
 *         description: Solicitud no encontrada
 *       500:
 *         description: Error inesperado
 */
router.put('/updateRequest/:request_id', YachtRequestController.updateRequest);



module.exports = router;