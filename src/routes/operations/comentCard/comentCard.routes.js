const { Router } = require('express');
const ComentCardController = require('../../../controllers/operations/comentCard/comentCard.controller');
const authJwt = require('../../../middlewares/auth.middleware');

const router = Router();

/**
 * @openapi
 * /coment_cards:
 *   get:
 *     summary: Listar asignaciones de comment cards a yates
 *     tags: [Comment Cards]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de asignaciones con sus comment cards y yates
 *       403:
 *         description: Token no proporcionado o inválido
 *       500:
 *         description: Error inesperado
 */
router.get('/', authJwt.verifyToken, ComentCardController.getAllComentCards);

/**
 * @openapi
 * /coment_cards/{card_id}:
 *   get:
 *     summary: Obtener una comment card
 *     tags: [Comment Cards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: card_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID codificado de la comment card
 *     responses:
 *       200:
 *         description: Comment card con preguntas y yates
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Comment card no encontrada
 *       500:
 *         description: Error inesperado
 */
router.get('/:card_id', authJwt.verifyToken, ComentCardController.getComentCard);

/**
 * @openapi
 * /coment_cards/createComentCard:
 *   post:
 *     summary: Crear una comment card
 *     tags: [Comment Cards]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, preguntas]
 *             properties:
 *               name:
 *                 type: string
 *               preguntas:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [title, type]
 *                   properties:
 *                     title:
 *                       type: string
 *                     type:
 *                       type: string
 *                     required:
 *                       type: boolean
 *                     scaleMin:
 *                       type: integer
 *                       nullable: true
 *                     scaleMax:
 *                       type: integer
 *                       nullable: true
 *                     options:
 *                       type: array
 *                       items: {}
 *     responses:
 *       200:
 *         description: Comment card creada
 *       400:
 *         description: Payload inválido
 *       500:
 *         description: Error inesperado
 */
router.post('/createComentCard', authJwt.verifyToken, ComentCardController.createComentCard);

/**
 * @openapi
 * /coment_cards/updateComentCard/{card_id}:
 *   put:
 *     summary: Actualizar una comment card y sus preguntas
 *     tags: [Comment Cards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: card_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID codificado de la comment card
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, preguntas]
 *             properties:
 *               name:
 *                 type: string
 *               preguntas:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [title, type]
 *                   properties:
 *                     id:
 *                       type: integer
 *                       description: ID numérico de una pregunta existente; omitir para crearla
 *                     title:
 *                       type: string
 *                     type:
 *                       type: string
 *                     required:
 *                       type: boolean
 *                     scaleMin:
 *                       type: integer
 *                       nullable: true
 *                     scaleMax:
 *                       type: integer
 *                       nullable: true
 *                     options:
 *                       type: array
 *                       items: {}
 *     responses:
 *       200:
 *         description: Comment card actualizada
 *       400:
 *         description: ID o payload inválido
 *       404:
 *         description: Comment card no encontrada
 *       500:
 *         description: Error inesperado
 */
router.put('/updateComentCard/:card_id', authJwt.verifyToken, ComentCardController.updateComentCard);

/**
 * @openapi
 * /coment_cards/{card_id}:
 *   delete:
 *     summary: Eliminar una comment card
 *     tags: [Comment Cards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: card_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID codificado de la comment card
 *     responses:
 *       200:
 *         description: Comment card eliminada
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Comment card no encontrada
 *       500:
 *         description: Error inesperado
 */
router.delete('/:card_id', authJwt.verifyToken, ComentCardController.deleteComentCard);

/**
 * @openapi
 * /coment_cards/{card_id}/cards_yachts/yachts:
 *   get:
 *     summary: Listar yates asignados a una comment card
 *     tags: [Comment Cards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: card_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID codificado de la comment card
 *     responses:
 *       200:
 *         description: Lista de asignaciones a yates
 *       400:
 *         description: ID inválido
 *       500:
 *         description: Error inesperado
 */
router.get('/:card_id/cards_yachts/yachts', authJwt.verifyToken, ComentCardController.getYachtsWithComentCard);

/**
 * @openapi
 * /coment_cards/access_links/relation/{card_yacht_id}:
 *   get:
 *     summary: Listar links y respuestas de una asignación comment card/yate
 *     tags: [Comment Cards]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: card_yacht_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID codificado de la asignación
 *     responses:
 *       200:
 *         description: Lista de links de acceso
 *       400:
 *         description: ID inválido
 *       500:
 *         description: Error inesperado
 */
router.get('/access_links/relation/:card_yacht_id', ComentCardController.getAllAccessLinks);

/**
 * @openapi
 * /coment_cards/coment_cards_link/{link_id}:
 *   get:
 *     summary: Listar respuestas enviadas mediante un link
 *     tags: [Comment Cards]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: link_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID codificado del link
 *     responses:
 *       200:
 *         description: Respuestas con sus preguntas, ordenadas por ID de pregunta
 *       400:
 *         description: ID inválido
 *       500:
 *         description: Error inesperado
 */
router.get('/coment_cards_link/:link_id', ComentCardController.getAllComentCardsForLink);

/**
 * @openapi
 * /coment_cards/coment_card_by_yacht/dates/{yacht_id}:
 *   get:
 *     summary: Obtener el link activo de un yate para una fecha
 *     tags: [Comment Cards]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: yacht_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID codificado del yate
 *       - in: query
 *         name: toDay
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Link activo
 *       400:
 *         description: ID o fecha inválida
 *       404:
 *         description: No existe un link para la fecha
 *       500:
 *         description: Error inesperado
 */
router.get('/coment_card_by_yacht/dates/:yacht_id', ComentCardController.getComentCardByDates);

/**
 * @openapi
 * /coment_cards/coment_card_by_qr/{comet_card_qr}:
 *   get:
 *     summary: Obtener el formulario público mediante un QR
 *     tags: [Comment Cards]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: comet_card_qr
 *         required: true
 *         schema:
 *           type: string
 *         description: ID codificado del QR
 *     responses:
 *       200:
 *         description: Comment card pública con sus preguntas
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Link no encontrado
 *       500:
 *         description: Error inesperado
 */
router.get('/coment_card_by_qr/:comet_card_qr', ComentCardController.getComentCardByQr);

/**
 * @openapi
 * /coment_cards/respond_coment_card/{comet_card_qr}:
 *   post:
 *     summary: Enviar respuestas de una comment card pública
 *     tags: [Comment Cards]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: comet_card_qr
 *         required: true
 *         schema:
 *           type: string
 *         description: ID codificado del QR
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, cabin, answers]
 *             properties:
 *               name:
 *                 type: string
 *               cabin:
 *                 oneOf:
 *                   - type: integer
 *                   - type: string
 *               readPolitics:
 *                 type: boolean
 *               answers:
 *                 type: object
 *                 additionalProperties: true
 *                 description: Mapa questionId -> respuesta
 *     responses:
 *       200:
 *         description: Respuesta registrada
 *       400:
 *         description: ID o payload inválido
 *       404:
 *         description: Link no encontrado
 *       500:
 *         description: Error inesperado
 */
router.post('/respond_coment_card/:comet_card_qr', ComentCardController.respondComentCard);

/**
 * @openapi
 * /coment_cards/reports/{yacht_id}:
 *   get:
 *     summary: Consultar respuestas para reportes por yate y fechas
 *     tags: [Comment Cards]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: yacht_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID codificado del yate; admite "undefined" para todos
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Respuestas para el reporte
 *       400:
 *         description: ID o rango de fechas inválido
 *       500:
 *         description: Error inesperado
 */
router.get('/reports/:yacht_id', ComentCardController.getReportingByYacht);

module.exports = router;
