const { Router } = require('express');
const DocumentsController = require('../../controllers/catalogs/documentation.controller');

const router = Router();

/**
 * @openapi
 * /documentation:
 *   get:
 *     summary: Listar todos los documentos
 *     tags: [Documentation]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de documentos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     description: ID de documento codificado (hashids)
 *                   name:
 *                     type: string
 *                   description:
 *                     type: string
 *                   required:
 *                     type: boolean
 *                   positions:
 *                     type: array
 *                     items:
 *                       type: string
 *                     description: IDs de posiciones codificados (hashids)
 */
router.get('/', DocumentsController.getDocuments);

/**
 * @openapi
 * /documentation/{document_id}:
 *   get:
 *     summary: Obtener un documento por ID
 *     tags: [Documentation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: document_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de documento codificado (hashids)
 *     responses:
 *       200:
 *         description: Documento encontrado
 *       404:
 *         description: Documento no encontrado
 */
router.get('/:document_id', DocumentsController.getDocument);

/**
 * @openapi
 * /documentation/createDocument:
 *   post:
 *     summary: Crear un documento (genera StaffDocumentation pendientes para el staff con las posiciones indicadas)
 *     tags: [Documentation]
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
 *               description:
 *                 type: string
 *               required:
 *                 type: boolean
 *               positions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: IDs de posiciones codificados (hashids) — staff con estas posiciones recibe un StaffDocumentation pendiente
 *     responses:
 *       200:
 *         description: Documento creado
 *       500:
 *         description: Error inesperado
 */
router.post('/createDocument', DocumentsController.createDocument);

/**
 * @openapi
 * /documentation/updateDocument/{document_id}:
 *   put:
 *     summary: Actualizar un documento (reconcilia StaffDocumentation según el cambio de posiciones)
 *     tags: [Documentation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: document_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de documento codificado (hashids)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               required:
 *                 type: boolean
 *               positions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: IDs de posiciones codificados (hashids)
 *     responses:
 *       200:
 *         description: Documento actualizado
 */
router.put('/updateDocument/:document_id', DocumentsController.updateDocument);

/**
 * @openapi
 * /documentation/{document_id}:
 *   delete:
 *     summary: Eliminar un documento
 *     tags: [Documentation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: document_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de documento codificado (hashids)
 *     responses:
 *       200:
 *         description: Documento eliminado
 */
router.delete('/:document_id', DocumentsController.deleteDocument);


module.exports = router;
