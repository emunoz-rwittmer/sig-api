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
 *               deliveryPort:
 *                 type: string
 *                 maxLength: 100
 *                 description: Puerto de entrega solicitado (opcional)
 *               requiredDate:
 *                 type: string
 *                 format: date
 *                 description: Fecha en que se requiere el abastecimiento (opcional)
 *               note:
 *                 type: string
 *                 maxLength: 1000
 *                 description: Nota para bodega (opcional)
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
 *         description: ID codificado inválido, products no es un arreglo o deliveryPort/requiredDate/note inválidos
 *       403:
 *         description: Token no proporcionado o inválido
 *       500:
 *         description: Error inesperado
 */
router.get('/',YachtRequestController.getAllRequests);

/**
 * @openapi
 * /requests/search:
 *   get:
 *     summary: Listado paginado y filtrado de requerimientos de yate, con totales
 *     description: Filtra y pagina en SQL y devuelve los totales del año (por estado, tipo y yate) sin traer los items de cada requerimiento.
 *     tags: [Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         schema: { type: integer }
 *         description: Año (hora de Ecuador). Por defecto el año actual
 *       - in: query
 *         name: warehouseIds
 *         schema: { type: string }
 *         description: Bodegas visibles separadas por coma (hashids). Limita todo el resultado
 *       - in: query
 *         name: warehouseId
 *         schema: { type: string }
 *         description: Un yate (hashid) para filtrar la tabla y los KPIs
 *       - in: query
 *         name: group
 *         schema: { type: string }
 *         description: Tipo (food_request, drink_request, lingerie_request)
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [Pendiente, Procesado] }
 *       - in: query
 *         name: q
 *         schema: { type: string, maxLength: 100 }
 *         description: Texto en el nombre del requerimiento o del solicitante
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1 }
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer, minimum: 1, maximum: 100 }
 *     responses:
 *       200:
 *         description: "{ rows, total, years, types, yachts, summary }"
 *       400:
 *         description: Algún parámetro es inválido
 *       403:
 *         description: Token no proporcionado o inválido
 */
router.get('/search', YachtRequestController.searchRequests);

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