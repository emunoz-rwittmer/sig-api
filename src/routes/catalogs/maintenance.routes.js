const { Router } = require('express');
const MaintenanceController = require('../../controllers/catalogs/maintenance.controller');

const router = Router();

// EQUIPMENT

/**
 * @openapi
 * /maintenance/equipment:
 *   get:
 *     summary: Listar equipos de mantenimiento
 *     tags: [Mantenimiento]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: yachtId
 *         schema:
 *           type: string
 *         description: ID codificado del yate para filtrar
 *     responses:
 *       200:
 *         description: Lista de equipos
 *       400:
 *         description: yachtId inválido
 *       403:
 *         description: Token no proporcionado o inválido
 *       500:
 *         description: Error inesperado
 */
router.get('/equipment', MaintenanceController.getAllEquipment);

/**
 * @openapi
 * /maintenance/equipment:
 *   post:
 *     summary: Crear un equipo de mantenimiento
 *     tags: [Mantenimiento]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [yachtId, name]
 *             properties:
 *               yachtId:
 *                 type: string
 *               name:
 *                 type: string
 *               brand:
 *                 type: string
 *               model:
 *                 type: string
 *               serialNumber:
 *                 type: string
 *               power:
 *                 type: string
 *               rpm:
 *                 type: string
 *     responses:
 *       200:
 *         description: Equipo creado
 *       400:
 *         description: Payload inválido
 *       500:
 *         description: Error inesperado
 */
router.post('/equipment', MaintenanceController.createEquipment);

/**
 * @openapi
 * /maintenance/equipment/{equipment_id}:
 *   put:
 *     summary: Actualizar un equipo de mantenimiento
 *     tags: [Mantenimiento]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: equipment_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID codificado del equipo
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [yachtId, name]
 *             properties:
 *               yachtId:
 *                 type: string
 *               name:
 *                 type: string
 *               brand:
 *                 type: string
 *               model:
 *                 type: string
 *               serialNumber:
 *                 type: string
 *               power:
 *                 type: string
 *               rpm:
 *                 type: string
 *               active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Equipo actualizado
 *       400:
 *         description: Payload o ID inválido
 *       404:
 *         description: Equipo no encontrado
 *       500:
 *         description: Error inesperado
 */
router.put('/equipment/:equipment_id', MaintenanceController.updateEquipment);

module.exports = router;
