const { Router } = require('express');
const InductionController = require('../../controllers/rrhh/inductions.controller');
const InductionAttemptController = require('../../controllers/rrhh/inductionAttempts.controller');
const authJwt = require('../../middlewares/auth.middleware');
const { uploadInductionMaterials } = require('../../utils/uploadConfiguration');

const router = Router();
const requireRRHH = authJwt.hasAnyRole(['admin', 'rrhh']);

// ---- Self-service (trabajador autenticado, identidad desde el token) ----

/**
 * @openapi
 * /inductions/me:
 *   get:
 *     summary: Listar las inducciones asignadas al trabajador autenticado
 *     tags: [Inductions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de inducciones con estado y avance del trabajador
 */
router.get('/me', InductionAttemptController.listMine);

/**
 * @openapi
 * /inductions/me/{induction_id}:
 *   get:
 *     summary: Detalle de una inducción asignada al trabajador (sin respuestas correctas)
 *     tags: [Inductions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: induction_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Detalle de la inducción
 *       403:
 *         description: La inducción no está asignada a la empresa del trabajador
 *       404:
 *         description: Inducción no encontrada
 */
router.get('/me/:induction_id', InductionAttemptController.getMineDetail);

/**
 * @openapi
 * /inductions/me/{induction_id}/viewed:
 *   put:
 *     summary: Marcar el material didáctico como revisado
 *     tags: [Inductions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: induction_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Material marcado como revisado
 */
router.put('/me/:induction_id/viewed', InductionAttemptController.markViewed);

/**
 * @openapi
 * /inductions/me/{induction_id}/attempts:
 *   post:
 *     summary: Registrar un intento de cuestionario del trabajador
 *     tags: [Inductions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: induction_id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [answers]
 *             properties:
 *               answers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     questionId: { type: string }
 *                     optionId: { type: string }
 *     responses:
 *       200:
 *         description: Resultado del intento (nota, aprobado, intentos restantes)
 *       400:
 *         description: Material no revisado, intentos agotados o respuesta inválida
 */
router.post('/me/:induction_id/attempts', InductionAttemptController.submitAttempt);

// ---- Administración RRHH ----

/**
 * @openapi
 * /inductions/staff/{staff_id}:
 *   get:
 *     summary: Listar las inducciones asignadas a un trabajador (ficha admin)
 *     tags: [Inductions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: staff_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de inducciones del trabajador con avance
 */
router.get('/staff/:staff_id', requireRRHH, InductionController.getForStaff);

/**
 * @openapi
 * /inductions:
 *   get:
 *     summary: Listar todas las inducciones con estadísticas de avance
 *     tags: [Inductions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de inducciones
 *   post:
 *     summary: Crear una inducción
 *     tags: [Inductions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, passingScore, maxAttempts, companyIds, questions]
 *     responses:
 *       200:
 *         description: Inducción creada
 *       400:
 *         description: Datos inválidos (empresa faltante, preguntas mal formadas)
 */
router.get('/', requireRRHH, InductionController.getAll);
router.post('/', requireRRHH, InductionController.create);

/**
 * @openapi
 * /inductions/{induction_id}:
 *   get:
 *     summary: Obtener una inducción (incluye respuestas correctas)
 *     tags: [Inductions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: induction_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Inducción encontrada
 *       404:
 *         description: Inducción no encontrada
 *   put:
 *     summary: Actualizar una inducción (reemplaza empresas/preguntas si se envían)
 *     tags: [Inductions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: induction_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Inducción actualizada
 *   delete:
 *     summary: Eliminar una inducción
 *     tags: [Inductions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: induction_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Inducción eliminada
 */
router.get('/:induction_id', requireRRHH, InductionController.getById);
router.put('/:induction_id', requireRRHH, InductionController.update);
router.delete('/:induction_id', requireRRHH, InductionController.remove);

/**
 * @openapi
 * /inductions/{induction_id}/materials:
 *   post:
 *     summary: Agregar material didáctico (archivos y/o enlaces) a una inducción
 *     tags: [Inductions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: induction_id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               materials:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *               links:
 *                 type: string
 *                 description: JSON stringificado de [{title, url}]
 *     responses:
 *       200:
 *         description: Materiales agregados
 */
router.post('/:induction_id/materials', requireRRHH, uploadInductionMaterials, InductionController.addMaterials);

/**
 * @openapi
 * /inductions/{induction_id}/materials/{material_id}:
 *   delete:
 *     summary: Eliminar un material didáctico
 *     tags: [Inductions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: induction_id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: material_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Material eliminado
 */
router.delete('/:induction_id/materials/:material_id', requireRRHH, InductionController.removeMaterial);

/**
 * @openapi
 * /inductions/{induction_id}/staffs:
 *   get:
 *     summary: Avance de todo el personal asignado a una inducción
 *     tags: [Inductions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: induction_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de trabajadores con su estado/nota/intentos
 */
router.get('/:induction_id/staffs', requireRRHH, InductionController.getStaffProgress);

/**
 * @openapi
 * /inductions/{induction_id}/staff/{staff_id}/extra-attempt:
 *   post:
 *     summary: Habilitar un intento adicional a un trabajador
 *     tags: [Inductions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: induction_id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: staff_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Intento adicional habilitado
 */
router.post('/:induction_id/staff/:staff_id/extra-attempt', requireRRHH, InductionController.grantExtraAttempt);

module.exports = router;
