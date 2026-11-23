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

/**
 * @openapi
 * /maintenance/equipment/{equipment_id}/hours:
 *   post:
 *     summary: Registrar una lectura de horómetro del equipo
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
 *             required: [reading]
 *             properties:
 *               reading:
 *                 type: number
 *                 description: Horas acumuladas; no puede ser menor a la última lectura conocida.
 *               readAt:
 *                 type: string
 *                 format: date-time
 *                 description: Cuándo se tomó la lectura (por defecto, ahora).
 *     responses:
 *       200:
 *         description: Lectura registrada
 *       400:
 *         description: Lectura inválida o menor a la última registrada
 *       404:
 *         description: Equipo no encontrado
 *       500:
 *         description: Error inesperado
 */
router.post('/equipment/:equipment_id/hours', MaintenanceController.createHourReading);

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
 *               secondaryValue:
 *                 type: number
 *                 nullable: true
 *                 description: Segundo intervalo por calendario (solo reglas por horas), lo que ocurra primero.
 *               secondaryUnit:
 *                 type: string
 *                 enum: [dias, meses, anios]
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
 *               secondaryValue:
 *                 type: number
 *                 nullable: true
 *                 description: Segundo intervalo por calendario (solo reglas por horas), lo que ocurra primero.
 *               secondaryUnit:
 *                 type: string
 *                 enum: [dias, meses, anios]
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

// RULE ASSIGNMENTS

/**
 * @openapi
 * /maintenance/equipment/{equipment_id}/rules:
 *   get:
 *     summary: Listar reglas asignadas a un equipo
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
 *     responses:
 *       200:
 *         description: Lista de asignaciones con su regla
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Equipo no encontrado
 *       500:
 *         description: Error inesperado
 */
router.get('/equipment/:equipment_id/rules', MaintenanceController.getEquipmentRules);

/**
 * @openapi
 * /maintenance/rule-assignments:
 *   post:
 *     summary: Asignar una regla de mantenimiento a un equipo
 *     tags: [Mantenimiento]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [equipmentId, ruleId]
 *             properties:
 *               equipmentId:
 *                 type: string
 *               ruleId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Asignación creada
 *       400:
 *         description: Payload inválido
 *       404:
 *         description: Equipo o regla no encontrados
 *       409:
 *         description: La regla ya está asignada a este equipo
 *       500:
 *         description: Error inesperado
 */
router.post('/rule-assignments', MaintenanceController.createRuleAssignment);

/**
 * @openapi
 * /maintenance/rule-assignments/{assignment_id}:
 *   put:
 *     summary: Activar/desactivar una asignación de regla
 *     tags: [Mantenimiento]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assignment_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID codificado de la asignación
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [active]
 *             properties:
 *               active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Asignación actualizada
 *       400:
 *         description: Payload o ID inválido
 *       404:
 *         description: Asignación no encontrada
 *       500:
 *         description: Error inesperado
 */
router.put('/rule-assignments/:assignment_id', MaintenanceController.updateRuleAssignment);

/**
 * @openapi
 * /maintenance/rule-assignments/{assignment_id}/postpone:
 *   post:
 *     summary: Posponer el vencimiento actual de una regla en un equipo (firma el usuario logueado)
 *     description: La posposición vale hasta el siguiente registro de esa regla en el equipo.
 *     tags: [Mantenimiento]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assignment_id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reason]
 *             properties:
 *               reason:
 *                 type: string
 *               untilDate:
 *                 type: string
 *                 format: date-time
 *                 description: Nueva fecha límite (futura). Requerida si no se envía untilHours.
 *               untilHours:
 *                 type: number
 *                 description: Nuevo horómetro límite. Requerido si no se envía untilDate.
 *     responses:
 *       200:
 *         description: Vencimiento pospuesto
 *       400:
 *         description: Falta el motivo o el nuevo límite, o la fecha no es futura
 *       404:
 *         description: Asignación no encontrada
 *       500:
 *         description: Error inesperado
 */
router.post('/rule-assignments/:assignment_id/postpone', MaintenanceController.postponeRuleAssignment);

// RECORDS (historial)

/**
 * @openapi
 * /maintenance/records:
 *   get:
 *     summary: Listar el historial de mantenimiento (filtrable)
 *     tags: [Mantenimiento]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: yachtId
 *         schema:
 *           type: string
 *       - in: query
 *         name: equipmentId
 *         schema:
 *           type: string
 *       - in: query
 *         name: ruleId
 *         schema:
 *           type: string
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Historial de mantenimiento, ordenado por performedAt descendente
 *       400:
 *         description: Algún filtro es inválido
 *       500:
 *         description: Error inesperado
 */
router.get('/records', MaintenanceController.getAllRecords);

/**
 * @openapi
 * /maintenance/records/{record_id}:
 *   get:
 *     summary: Obtener un registro del historial
 *     tags: [Mantenimiento]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: record_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Registro de historial
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Registro no encontrado
 *       500:
 *         description: Error inesperado
 */
router.get('/records/:record_id', MaintenanceController.getRecord);

/**
 * @openapi
 * /maintenance/records:
 *   post:
 *     summary: Registrar un mantenimiento realizado
 *     tags: [Mantenimiento]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [equipmentId, responsible, workPerformed, performedAt]
 *             properties:
 *               equipmentId:
 *                 type: string
 *               ruleId:
 *                 type: string
 *                 nullable: true
 *               responsible:
 *                 type: string
 *               workPerformed:
 *                 type: string
 *               performedAt:
 *                 type: string
 *                 format: date-time
 *               hoursReading:
 *                 type: number
 *                 nullable: true
 *               observation:
 *                 type: string
 *                 nullable: true
 *               maintenanceType:
 *                 type: string
 *                 enum: [preventivo, correctivo]
 *                 nullable: true
 *                 description: Si se omite, se infiere de si el registro tiene ruleId (preventivo) o no (correctivo).
 *               faultId:
 *                 type: string
 *                 nullable: true
 *                 description: Falla abierta del mismo equipo que este registro atiende; queda cerrada.
 *               cause:
 *                 type: string
 *                 nullable: true
 *                 description: Causa de la falla, si se conoce.
 *               materials:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [productId, quantity]
 *                   properties:
 *                     productId:
 *                       type: string
 *                     quantity:
 *                       type: integer
 *     responses:
 *       200:
 *         description: Registro creado
 *       400:
 *         description: Payload inválido
 *       404:
 *         description: Equipo no encontrado
 *       500:
 *         description: Error inesperado
 */
router.post('/records', MaintenanceController.createRecord);

/**
 * @openapi
 * /maintenance/records/{record_id}:
 *   put:
 *     summary: Editar un registro del historial (solo si no está aprobado)
 *     tags: [Mantenimiento]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: record_id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [equipmentId, responsible, workPerformed, performedAt]
 *             properties:
 *               equipmentId:
 *                 type: string
 *               ruleId:
 *                 type: string
 *                 nullable: true
 *               responsible:
 *                 type: string
 *               workPerformed:
 *                 type: string
 *               performedAt:
 *                 type: string
 *                 format: date-time
 *               hoursReading:
 *                 type: number
 *                 nullable: true
 *               observation:
 *                 type: string
 *                 nullable: true
 *               maintenanceType:
 *                 type: string
 *                 enum: [preventivo, correctivo]
 *                 nullable: true
 *                 description: Si se omite, se infiere de si el registro tiene ruleId (preventivo) o no (correctivo).
 *               materials:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [productId, quantity]
 *                   properties:
 *                     productId:
 *                       type: string
 *                     quantity:
 *                       type: integer
 *     responses:
 *       200:
 *         description: Registro actualizado
 *       400:
 *         description: Payload o ID inválido
 *       404:
 *         description: Registro o equipo no encontrado
 *       409:
 *         description: El registro ya fue aprobado y es inmutable
 *       500:
 *         description: Error inesperado
 */
router.put('/records/:record_id', MaintenanceController.updateRecord);

/**
 * @openapi
 * /maintenance/records/{record_id}/approve:
 *   put:
 *     summary: Aprobar un registro del historial (firma el usuario logueado; no puede ser quien lo cargó)
 *     tags: [Mantenimiento]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: record_id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               approvedBy:
 *                 type: string
 *                 description: Solo se usa si el token no trae el nombre del usuario.
 *     responses:
 *       200:
 *         description: Registro aprobado
 *       400:
 *         description: approvedBy faltante o ID inválido
 *       404:
 *         description: Registro no encontrado
 *       409:
 *         description: El registro ya estaba aprobado, o lo cargó el mismo usuario que intenta aprobarlo
 *       500:
 *         description: Error inesperado
 */
router.put('/records/:record_id/approve', MaintenanceController.approveRecord);

// FAULTS

/**
 * @openapi
 * /maintenance/faults:
 *   get:
 *     summary: Listar fallas reportadas (abiertas primero)
 *     tags: [Mantenimiento]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: yachtId
 *         schema:
 *           type: string
 *       - in: query
 *         name: equipmentId
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [abierta, cerrada]
 *     responses:
 *       200:
 *         description: Lista de fallas con su equipo
 *       400:
 *         description: Algún filtro es inválido
 *       500:
 *         description: Error inesperado
 */
router.get('/faults', MaintenanceController.getFaults);

/**
 * @openapi
 * /maintenance/faults:
 *   post:
 *     summary: Reportar una falla en un equipo (firma el usuario logueado)
 *     tags: [Mantenimiento]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [equipmentId, description, severity]
 *             properties:
 *               equipmentId:
 *                 type: string
 *               description:
 *                 type: string
 *               severity:
 *                 type: string
 *                 enum: [baja, media, alta, critica]
 *               reportedAt:
 *                 type: string
 *                 format: date-time
 *                 description: Cuándo se detectó (por defecto, ahora). No puede ser futura.
 *     responses:
 *       200:
 *         description: Falla reportada
 *       400:
 *         description: Payload inválido
 *       404:
 *         description: Equipo no encontrado
 *       500:
 *         description: Error inesperado
 */
router.post('/faults', MaintenanceController.createFault);

/**
 * @openapi
 * /maintenance/faults/{fault_id}:
 *   put:
 *     summary: Editar una falla mientras sigue abierta
 *     tags: [Mantenimiento]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fault_id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [description, severity]
 *             properties:
 *               description:
 *                 type: string
 *               severity:
 *                 type: string
 *                 enum: [baja, media, alta, critica]
 *     responses:
 *       200:
 *         description: Falla actualizada
 *       400:
 *         description: Payload o ID inválido
 *       404:
 *         description: Falla no encontrada
 *       409:
 *         description: La falla ya fue atendida
 *       500:
 *         description: Error inesperado
 */
router.put('/faults/:fault_id', MaintenanceController.updateFault);

// ALERTS

/**
 * @openapi
 * /maintenance/alerts:
 *   get:
 *     summary: Calcula el estado de cumplimiento de cada regla asignada (vencida, próxima a vencer, al día)
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
 *         description: >
 *           Lista de alertas por asignación regla-equipo activa. `status` es uno de:
 *           `vencida`, `proxima`, `al_dia`, `nunca_realizada`, `sin_horometro`, `sin_periodicidad`.
 *       400:
 *         description: yachtId inválido
 *       500:
 *         description: Error inesperado
 */
router.get('/alerts', MaintenanceController.getRuleAlerts);

// BOOK

/**
 * @openapi
 * /maintenance/yachts/{yacht_id}/book:
 *   get:
 *     summary: Libro de mantenimiento completo de un yate
 *     tags: [Mantenimiento]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: yacht_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID codificado del yate
 *     responses:
 *       200:
 *         description: Yate, sus equipos, las reglas/materiales recomendados de cada uno y su historial
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Yate no encontrado
 *       500:
 *         description: Error inesperado
 */
router.get('/yachts/:yacht_id/book', MaintenanceController.getMaintenanceBook);

module.exports = router;
