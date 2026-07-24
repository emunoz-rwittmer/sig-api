const { Router } = require('express');
const StaffController  = require ('../../controllers/catalogs/staff.controller');
const { uploadImageFile, uploadManyFiles, uploadPdfFile } = require('../../utils/uploadConfiguration');

const router = Router();

/**
 * @openapi
 * /staffs:
 *   get:
 *     summary: Listar todo el personal
 *     tags: [Staff]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de personal
 */
router.get('/',StaffController.getAllStaffs);

/**
 * @openapi
 * /staffs/{staff_id}:
 *   get:
 *     summary: Obtener un miembro del personal por ID
 *     tags: [Staff]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: staff_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de personal codificado (hashids)
 *     responses:
 *       200:
 *         description: Miembro del personal encontrado
 */
router.get('/:staff_id',StaffController.getStaff);

/**
 * @openapi
 * /staffs/{staff_id}/companies:
 *   get:
 *     summary: Listar las empresas asignadas a un miembro del personal
 *     tags: [Staff]
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
 *         description: Lista de empresas con datos de yate
 */
router.get('/:staff_id/companies',StaffController.getStaffCompanies);

/**
 * @openapi
 * /staffs/createStaff:
 *   post:
 *     summary: Crear un miembro del personal
 *     tags: [Staff]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [firstName, lastName, email, cellPhone, contractType, departamentId, positionId]
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *               cellPhone:
 *                 type: string
 *               contractType:
 *                 type: string
 *               departamentId:
 *                 type: string
 *                 description: ID de departamento codificado (hashids)
 *               positionId:
 *                 type: string
 *                 description: ID de posicion codificado (hashids)
 *     responses:
 *       200:
 *         description: Personal creado
 *       500:
 *         description: Error inesperado
 */
router.post('/createStaff',StaffController.createStaff);

/**
 * @openapi
 * /staffs/updateStaff/{staff_id}:
 *   put:
 *     summary: Actualizar un miembro del personal
 *     tags: [Staff]
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
 *         description: Personal actualizado
 */
router.put('/updateStaff/:staff_id',StaffController.updateStaff);

/**
 * @openapi
 * /staffs/{staff_id}/uploadImageFile:
 *   put:
 *     summary: Subir una imagen (foto o firma) de un miembro del personal
 *     tags: [Staff]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: staff_id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [type, file]
 *             properties:
 *               type:
 *                 type: string
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Imagen actualizada
 *       400:
 *         description: Archivo o campo type faltante
 */
router.put('/:staff_id/uploadImageFile', uploadImageFile, StaffController.uploadImage);

/**
 * @openapi
 * /staffs/update/documentation/{staff_id}:
 *   put:
 *     summary: Subir un documento (PDF) de un miembro del personal
 *     tags: [Staff]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: staff_id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [id, file]
 *             properties:
 *               id:
 *                 type: string
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Documentacion guardada
 *       400:
 *         description: Archivo faltante
 */
router.put('/update/documentation/:staff_id', uploadPdfFile, StaffController.uploadStaffDocumentation);

/**
 * @openapi
 * /staffs/{staff_id}:
 *   delete:
 *     summary: Eliminar un miembro del personal
 *     tags: [Staff]
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
 *         description: Personal eliminado
 */
router.delete('/:staff_id',StaffController.deleteStaff);

//evaluators and evaluated
/**
 * @openapi
 * /staffs/send_form/evaluators:
 *   get:
 *     summary: Listar evaluadores por IDs
 *     tags: [Staff]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Lista de IDs codificados separados por coma
 *     responses:
 *       200:
 *         description: Lista de evaluadores
 */
router.get('/send_form/evaluators',StaffController.getEvaluators);

/**
 * @openapi
 * /staffs/send_form/evaluatorsByFilters:
 *   get:
 *     summary: Listar evaluadores filtrados por empresa/departamento/posicion
 *     tags: [Staff]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: string
 *       - in: query
 *         name: departamentId
 *         schema:
 *           type: string
 *       - in: query
 *         name: positionId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de evaluadores filtrada
 */
router.get('/send_form/evaluatorsByFilters',StaffController.getEvaluatorsByFilters);

/**
 * @openapi
 * /staffs/send_form/evaluateds:
 *   get:
 *     summary: Listar evaluados por IDs
 *     tags: [Staff]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de evaluados
 */
router.get('/send_form/evaluateds',StaffController.getEvaluateds);

/**
 * @openapi
 * /staffs/send_form/evaluatedsByFilters:
 *   get:
 *     summary: Listar evaluados filtrados por empresa
 *     tags: [Staff]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de evaluados filtrada
 */
router.get('/send_form/evaluatedsByFilters',StaffController.getEvaluatedsByFilters);


module.exports = router;
