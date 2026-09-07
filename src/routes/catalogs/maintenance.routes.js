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

// RULES

/**
 * @openapi
 * /maintenance/rules:
 *   get:
 *     summary: Listar reglas de mantenimiento (catálogo informativo)
 *     tags: [Mantenimiento]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de reglas con sus materiales recomendados
 *       403:
 *         description: Token no proporcionado o inválido
 *       500:
 *         description: Error inesperado
 */
router.get('/rules', MaintenanceController.getAllRules);

/**
 * @openapi
 * /maintenance/rules:
 *   post:
 *     summary: Crear una regla de mantenimiento
 *     tags: [Mantenimiento]
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
 *               periodicityValue:
 *                 type: number
 *                 nullable: true
 *               periodicityUnit:
 *                 type: string
 *                 enum: [horas, dias, meses, anios]
 *                 nullable: true
 *               instructions:
 *                 type: string
 *                 nullable: true
 *               recommendedMaterials:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [productId, recommendedQuantity]
 *                   properties:
 *                     productId:
 *                       type: string
 *                     recommendedQuantity:
 *                       type: integer
 *     responses:
 *       200:
 *         description: Regla creada
 *       400:
 *         description: Payload inválido
 *       500:
 *         description: Error inesperado
 */
router.post('/rules', MaintenanceController.createRule);

/**
 * @openapi
 * /maintenance/rules/{rule_id}:
 *   put:
 *     summary: Actualizar una regla de mantenimiento
 *     tags: [Mantenimiento]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rule_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID codificado de la regla
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
 *               periodicityValue:
 *                 type: number
 *                 nullable: true
 *               periodicityUnit:
 *                 type: string
 *                 enum: [horas, dias, meses, anios]
 *                 nullable: true
 *               instructions:
 *                 type: string
 *                 nullable: true
 *               active:
 *                 type: boolean
 *               recommendedMaterials:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [productId, recommendedQuantity]
 *                   properties:
 *                     productId:
 *                       type: string
 *                     recommendedQuantity:
 *                       type: integer
 *     responses:
 *       200:
 *         description: Regla actualizada
 *       400:
 *         description: Payload o ID inválido
 *       404:
 *         description: Regla no encontrada
 *       500:
 *         description: Error inesperado
 */
router.put('/rules/:rule_id', MaintenanceController.updateRule);

module.exports = router;
