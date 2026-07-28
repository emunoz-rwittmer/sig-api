const { Router } = require('express');
const FormatController = require('../../controllers/rrhh/formats.controller');
const { uploadPdfFile } = require('../../utils/uploadConfiguration');
const multer = require("multer");
const router = Router();
const upload = multer();

//request

/**
 * @openapi
 * /formats/request:
 *   get:
 *     summary: Listar todos los formatos de solicitud
 *     tags: [Formats]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de formatos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     description: ID de formato codificado (hashids)
 *                   name:
 *                     type: string
 *                   content:
 *                     type: string
 *                   companies:
 *                     type: array
 *                     items:
 *                       type: string
 *   post:
 *     summary: Crear un formato de solicitud
 *     tags: [Formats]
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
 *               content:
 *                 type: string
 *               companies:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Formato creado
 */
router.get('/request', FormatController.getAllFormats);

/**
 * @openapi
 * /formats/request/{format_id}:
 *   get:
 *     summary: Obtener un formato de solicitud por ID
 *     tags: [Formats]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: format_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de formato codificado (hashids)
 *     responses:
 *       200:
 *         description: Formato encontrado
 *       404:
 *         description: Formato no encontrado
 *   put:
 *     summary: Actualizar un formato de solicitud
 *     tags: [Formats]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: format_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de formato codificado (hashids)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               content:
 *                 type: string
 *               companies:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Formato actualizado
 *   delete:
 *     summary: Eliminar un formato de solicitud
 *     tags: [Formats]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: format_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de formato codificado (hashids)
 *     responses:
 *       200:
 *         description: Formato eliminado
 */
router.get('/request/:format_id', FormatController.getFormat);
router.post('/request', FormatController.createFormat);
router.put('/request/:format_id', FormatController.updateFormat);
router.delete('/request/:format_id', FormatController.deleteFormat);

//docs

/**
 * @openapi
 * /formats/forms:
 *   get:
 *     summary: Listar todos los formatos médicos
 *     tags: [DoctorFormats]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de formatos médicos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     description: ID de formato médico codificado (hashids)
 *                   name:
 *                     type: string
 *                   file:
 *                     type: string
 *                   companies:
 *                     type: array
 *                     items:
 *                       type: string
 *   post:
 *     summary: Crear un formato médico (requiere adjuntar un PDF)
 *     tags: [DoctorFormats]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [name, file, companies]
 *             properties:
 *               name:
 *                 type: string
 *               companies:
 *                 type: string
 *                 description: Array de IDs de compañías codificados, serializado como JSON
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Formato médico creado
 *       400:
 *         description: No se subió archivo o companies no es un JSON válido
 */
router.get('/forms', FormatController.getAllDoctorFormats);

/**
 * @openapi
 * /formats/forms/{format_id}:
 *   get:
 *     summary: Obtener un formato médico por ID
 *     tags: [DoctorFormats]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: format_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de formato médico codificado (hashids)
 *     responses:
 *       200:
 *         description: Formato médico encontrado
 *       404:
 *         description: Formato médico no encontrado
 *   put:
 *     summary: Actualizar un formato médico (el archivo es opcional)
 *     tags: [DoctorFormats]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: format_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de formato médico codificado (hashids)
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               companies:
 *                 type: string
 *                 description: Array de IDs de compañías codificados, serializado como JSON
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Formato médico actualizado
 *       400:
 *         description: companies no es un JSON válido
 *   delete:
 *     summary: Eliminar un formato médico
 *     tags: [DoctorFormats]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: format_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de formato médico codificado (hashids)
 *     responses:
 *       200:
 *         description: Formato médico eliminado
 */
router.get('/forms/:format_id', FormatController.getDoctorFormat);
router.post('/forms', uploadPdfFile, FormatController.createDoctorFormat);
router.put('/forms/:format_id', uploadPdfFile, FormatController.updateDoctorFormat);
router.delete('/forms/:format_id', FormatController.deleteDoctorFormat);

// REQUEST STAFFS

/**
 * @openapi
 * /formats/{format_id}/request/{staff_id}:
 *   get:
 *     summary: Listar las solicitudes de un staff para un formato
 *     tags: [RequestStaffs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: format_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de formato codificado (hashids)
 *       - in: path
 *         name: staff_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de staff codificado (hashids)
 *     responses:
 *       200:
 *         description: Lista de solicitudes
 */
router.get('/:format_id/request/:staff_id', FormatController.getAllFormatsByStaff);

/**
 * @openapi
 * /formats/create_request/format/{format_id}/staff/{staff_id}:
 *   post:
 *     summary: Generar una solicitud en PDF para un staff a partir de un formato y enviarla por correo
 *     tags: [RequestStaffs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: format_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de formato codificado (hashids)
 *       - in: path
 *         name: staff_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de staff codificado (hashids)
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [compania, contenido]
 *             properties:
 *               compania:
 *                 type: string
 *                 description: Nombre de la compañía (debe existir)
 *               yate:
 *                 type: string
 *               contenido:
 *                 type: string
 *                 description: Plantilla HTML con placeholders a reemplazar
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Adjunto opcional además del PDF generado
 *     responses:
 *       200:
 *         description: Solicitud creada
 *       404:
 *         description: Staff, formato o compañía no encontrados
 */
router.post('/create_request/format/:format_id/staff/:staff_id', upload.single("file"), FormatController.createRequesForStaff);



module.exports = router;
