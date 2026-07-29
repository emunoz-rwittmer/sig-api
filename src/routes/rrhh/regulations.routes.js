const { Router } = require('express');
const RegulationController = require('../../controllers/rrhh/regulations.controller');
const { uploadSingleImage, uploadPdfFile } = require('../../utils/uploadConfiguration');

const router = Router();

/**
 * @openapi
 * /regulations/{company_id}:
 *   get:
 *     summary: Listar los reglamentos de una compañía
 *     tags: [Regulations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: company_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de compañía codificado (hashids)
 *     responses:
 *       200:
 *         description: Lista de reglamentos
 */
router.get('/:company_id', RegulationController.getAllRegulations);

/**
 * @openapi
 * /regulations/{company_id}/staffs:
 *   get:
 *     summary: Listar el personal de una compañía con el estado de lectura de sus reglamentos
 *     tags: [Regulations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: company_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de compañía codificado (hashids)
 *     responses:
 *       200:
 *         description: Lista de personal con sus lecturas de reglamento
 */
router.get('/:company_id/staffs', RegulationController.getAllStaffsRegulations);

/**
 * @openapi
 * /regulations/staff/{staff_id}:
 *   get:
 *     summary: Listar los reglamentos asignados a un staff
 *     tags: [Regulations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: staff_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de staff codificado (hashids)
 *     responses:
 *       200:
 *         description: Lista de lecturas de reglamento del staff
 */
router.get('/staff/:staff_id', RegulationController.getAllRegulationsBystaff);

/**
 * @openapi
 * /regulations/createRegulation:
 *   post:
 *     summary: Crear un reglamento
 *     tags: [Regulations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [name, companyId, file]
 *             properties:
 *               name:
 *                 type: string
 *               companyId:
 *                 type: string
 *                 description: ID de compañía codificado (hashids)
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Reglamento creado
 *       400:
 *         description: No se ha subido ningún archivo
 */
router.post('/createRegulation', uploadPdfFile, RegulationController.createRegulation);

/**
 * @openapi
 * /regulations/updateRegulation/{regulation_id}:
 *   put:
 *     summary: Actualizar un reglamento
 *     tags: [Regulations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: regulation_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de reglamento codificado (hashids)
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               companyId:
 *                 type: string
 *                 description: ID de compañía codificado (hashids)
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Reglamento actualizado
 */
router.put('/updateRegulation/:regulation_id', uploadPdfFile, RegulationController.updateRegulation);

/**
 * @openapi
 * /regulations/{regulation_id}:
 *   delete:
 *     summary: Eliminar un reglamento
 *     tags: [Regulations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: regulation_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de reglamento codificado (hashids)
 *     responses:
 *       200:
 *         description: Reglamento eliminado
 */
router.delete('/:regulation_id', RegulationController.deleteRegulation);

//READ REGULATIONS

/**
 * @openapi
 * /regulations/regulation_staff/{regulation_id}:
 *   get:
 *     summary: Obtener el registro de lectura de un reglamento por staff
 *     tags: [Regulations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: regulation_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del registro de lectura (staff_read_regulation) codificado (hashids)
 *     responses:
 *       200:
 *         description: Registro de lectura encontrado
 *       404:
 *         description: Registro de lectura no encontrado
 */
router.get('/regulation_staff/:regulation_id', RegulationController.getRegulationStaffById);

/**
 * @openapi
 * /regulations/aceptar_reglamento/{regulation_id}:
 *   put:
 *     summary: Marcar como leído un reglamento por parte del staff y enviar correo de confirmación
 *     tags: [Regulations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: regulation_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del registro de lectura (staff_read_regulation) codificado (hashids)
 *     responses:
 *       200:
 *         description: Lectura confirmada
 *       404:
 *         description: Registro de lectura no encontrado
 */
router.put('/aceptar_reglamento/:regulation_id', uploadPdfFile, RegulationController.readAceptRegulation);


module.exports = router;
