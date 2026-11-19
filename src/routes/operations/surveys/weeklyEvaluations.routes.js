const { Router } = require('express');
const WeeklyEvaluationsController = require('../../../controllers/operations/surveys/weeklyEvaluations.controller');

const router = Router();

/**
 * @openapi
 * /weekly-evaluations:
 *   get:
 *     summary: Estado del envío semanal de evaluaciones por barco
 *     tags: [Evaluations]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', WeeklyEvaluationsController.getStatus);

/**
 * @openapi
 * /weekly-evaluations/{company_id}:
 *   put:
 *     summary: Activar o desactivar el envío semanal de un barco
 *     tags: [Evaluations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               enabled:
 *                 type: boolean
 */
router.put('/:company_id', WeeklyEvaluationsController.setEnabled);

/**
 * @openapi
 * /weekly-evaluations/send:
 *   post:
 *     summary: Crear ahora las evaluaciones de la semana para los barcos elegidos
 *     tags: [Evaluations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               companyIds:
 *                 type: array
 *                 items:
 *                   type: string
 */
router.post('/send', WeeklyEvaluationsController.sendNow);

module.exports = router;
