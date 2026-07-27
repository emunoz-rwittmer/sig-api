const { Router } = require('express');
const PositionsController = require('../../controllers/catalogs/positions.controller');

const router = Router();

/**
 * @openapi
 * /positions:
 *   get:
 *     summary: Listar todas las posiciones
 *     tags: [Positions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de posiciones
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     description: ID de posición codificado (hashids)
 *                   name:
 *                     type: string
 */
router.get('/', PositionsController.getPositions);

/**
 * @openapi
 * /positions/{position_id}:
 *   get:
 *     summary: Obtener una posición por ID
 *     tags: [Positions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: position_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de posición codificado (hashids)
 *     responses:
 *       200:
 *         description: Posición encontrada
 *       404:
 *         description: Posición no encontrada
 */
router.get('/:position_id', PositionsController.getPosition);

/**
 * @openapi
 * /positions/createPosition:
 *   post:
 *     summary: Crear una posición
 *     tags: [Positions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Posición creada
 *       500:
 *         description: Error inesperado
 */
router.post('/createPosition', PositionsController.createPosition);

/**
 * @openapi
 * /positions/updatePosition/{position_id}:
 *   put:
 *     summary: Actualizar una posición
 *     tags: [Positions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: position_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de posición codificado (hashids)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Posición actualizada
 */
router.put('/updatePosition/:position_id', PositionsController.updatePosition);

/**
 * @openapi
 * /positions/{position_id}:
 *   delete:
 *     summary: Eliminar una posición
 *     tags: [Positions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: position_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de posición codificado (hashids)
 *     responses:
 *       200:
 *         description: Posición eliminada
 */
router.delete('/:position_id', PositionsController.deletePosition);


module.exports = router;
