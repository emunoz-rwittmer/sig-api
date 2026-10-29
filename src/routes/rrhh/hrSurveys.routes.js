const { Router } = require('express');
const HrSurveyController = require('../../controllers/rrhh/hrSurveys.controller');
const HrSurveyResponseController = require('../../controllers/rrhh/hrSurveyResponses.controller');
const authJwt = require('../../middlewares/auth.middleware');
const { uploadHrSurveyQuestionsMatrix } = require('../../utils/uploadConfiguration');

const router = Router();
const requireRRHH = authJwt.hasAnyRole(['admin', 'rrhh', 'psicologos' ]);

// Las rutas fijas (/questions/*, y luego /me y /:survey_id/results) van antes de /:survey_id.

/**
 * @openapi
 * /hr-surveys/questions/template:
 *   get:
 *     summary: Descargar la matriz de Excel para cargar preguntas de una encuesta
 *     tags: [HrSurveys]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Archivo .xlsx con encabezados, ejemplos e instrucciones
 */
router.get('/questions/template', requireRRHH, HrSurveyController.downloadQuestionsTemplate);

/**
 * @openapi
 * /hr-surveys/questions/import:
 *   post:
 *     summary: Leer una matriz de Excel y devolver sus preguntas (no guarda nada)
 *     tags: [HrSurveys]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: "{ questions: [{ statement, type, required, scaleMin, scaleMax, options }], errors: [{ row, message }] }"
 *       400:
 *         description: Archivo faltante, ilegible o sin preguntas
 */
router.post('/questions/import', requireRRHH, uploadHrSurveyQuestionsMatrix, HrSurveyController.importQuestions);

/**
 * @openapi
 * /hr-surveys/me:
 *   get:
 *     summary: Listar las encuestas del colaborador autenticado (asignadas a su cargo o ya respondidas)
 *     tags: [HrSurveys]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de encuestas (id, name, description, startsAt, endsAt, status, answered)
 */
// Portal del colaborador: sin guardia de rol (solo verifyToken, aplicado al montar).
router.get('/me', HrSurveyResponseController.listMine);

/**
 * @openapi
 * /hr-surveys/me/{survey_id}:
 *   get:
 *     summary: Obtener una encuesta para responderla (las opciones no incluyen puntaje)
 *     tags: [HrSurveys]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: survey_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Encuesta con sus preguntas y el indicador answered
 *       404:
 *         description: Encuesta no visible para el colaborador
 */
router.get('/me/:survey_id', HrSurveyResponseController.getMineDetail);

/**
 * @openapi
 * /hr-surveys/me/{survey_id}/responses:
 *   post:
 *     summary: Enviar la respuesta anónima del colaborador
 *     tags: [HrSurveys]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: survey_id
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
 *                     value: { type: integer }
 *                     text: { type: string }
 *     responses:
 *       200:
 *         description: "{ ok: true }"
 *       400:
 *         description: Encuesta no abierta o respuestas inválidas
 *       403:
 *         description: Usuario inactivo, sin departamento o encuesta no asignada a su cargo
 *       409:
 *         description: Ya respondiste esta encuesta
 */
router.post('/me/:survey_id/responses', HrSurveyResponseController.submit);

/**
 * @openapi
 * /hr-surveys:
 *   get:
 *     summary: Listar las encuestas con estado, cargos y participación
 *     tags: [HrSurveys]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de encuestas (id, name, startsAt, endsAt, active, status, positions, responded, assigned)
 *   post:
 *     summary: Crear una encuesta (borrador o publicada)
 *     tags: [HrSurveys]
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
 *               name: { type: string }
 *               description: { type: string }
 *               startsAt: { type: string, format: date }
 *               endsAt: { type: string, format: date }
 *               active: { type: boolean }
 *               positionIds:
 *                 type: array
 *                 items: { type: string }
 *               questions:
 *                 type: array
 *                 items: { type: object }
 *     responses:
 *       201:
 *         description: Encuesta creada
 *       400:
 *         description: Datos inválidos (al publicar se exigen fechas, cargos y preguntas válidas)
 */
router.get('/', requireRRHH, HrSurveyController.getAll);
router.post('/', requireRRHH, HrSurveyController.create);

/**
 * @openapi
 * /hr-surveys/{survey_id}/results:
 *   get:
 *     summary: Resultados agregados y anónimos de una encuesta (roles admin y rrhh)
 *     tags: [HrSurveys]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: survey_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: "{ survey, participation: [{ departamentId, name, responded, assigned }], questions: [{ questionId, statement, type, overall, byDepartament, distribution?, comments? }] }"
 *       403:
 *         description: Rol no autorizado (solo admin y rrhh)
 *       404:
 *         description: Encuesta no encontrada
 */
router.get('/:survey_id/results', authJwt.hasAnyRole(['admin', 'rrhh']), HrSurveyController.getResults);

/**
 * @openapi
 * /hr-surveys/{survey_id}:
 *   get:
 *     summary: Obtener una encuesta con sus preguntas y cargos
 *     tags: [HrSurveys]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: survey_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Encuesta encontrada
 *       404:
 *         description: Encuesta no encontrada
 *   put:
 *     summary: Actualizar una encuesta (con respuestas solo nombre, descripción, cierre y cargos nuevos)
 *     tags: [HrSurveys]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: survey_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Encuesta actualizada
 *       400:
 *         description: Datos inválidos o cambio no permitido por tener respuestas
 *   delete:
 *     summary: Eliminar una encuesta sin respuestas
 *     tags: [HrSurveys]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: survey_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Encuesta eliminada
 *       400:
 *         description: La encuesta ya tiene respuestas
 */
router.get('/:survey_id', requireRRHH, HrSurveyController.getById);
router.put('/:survey_id', requireRRHH, HrSurveyController.update);
router.delete('/:survey_id', requireRRHH, HrSurveyController.remove);

module.exports = router;
