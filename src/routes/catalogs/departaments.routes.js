const { Router } = require('express');
const DepartamentsController = require('../../controllers/catalogs/departaments.controller');

const router = Router();

/**
 * @openapi
 * /departaments:
 *   get:
 *     summary: Listar todos los departamentos
 *     tags: [Departaments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de departamentos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     description: ID de departamento codificado (hashids)
 *                   name:
 *                     type: string
 *                   indicators:
 *                     type: boolean
 */
router.get('/', DepartamentsController.getDepartaments);

/**
 * @openapi
 * /departaments/{departament_id}:
 *   get:
 *     summary: Obtener un departamento por ID
 *     tags: [Departaments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: departament_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de departamento codificado (hashids)
 *     responses:
 *       200:
 *         description: Departamento encontrado
 *       404:
 *         description: Departamento no encontrado
 */
router.get('/:departament_id', DepartamentsController.getDepartament);

/**
 * @openapi
 * /departaments/process/{departament_id}:
 *   get:
 *     summary: Obtener un proceso por su propio ID
 *     tags: [Departaments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: departament_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de proceso codificado (hashids) — pese al nombre del parámetro, no es el ID del departamento
 *     responses:
 *       200:
 *         description: Proceso encontrado
 *       404:
 *         description: Proceso no encontrado
 */
router.get('/process/:departament_id', DepartamentsController.getProcessById);

/**
 * @openapi
 * /departaments/createDepartament:
 *   post:
 *     summary: Crear un departamento
 *     tags: [Departaments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               indicators:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Departamento creado
 *       500:
 *         description: Error inesperado
 */
router.post('/createDepartament', DepartamentsController.createDepartament);

/**
 * @openapi
 * /departaments/updateDepartament/{departament_id}:
 *   put:
 *     summary: Actualizar un departamento
 *     tags: [Departaments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: departament_id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               indicators:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Departamento actualizado
 */
router.put('/updateDepartament/:departament_id', DepartamentsController.updateDepartament);

/**
 * @openapi
 * /departaments/{departament_id}:
 *   delete:
 *     summary: Eliminar un departamento
 *     tags: [Departaments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: departament_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Departamento eliminado
 */
router.delete('/:departament_id', DepartamentsController.deleteDepartament);


module.exports = router;
