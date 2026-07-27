const { Router } = require('express');
const CompanyController = require('../../controllers/catalogs/company.controller');
const { uploadSingleImage } = require('../../utils/uploadConfiguration');

const router = Router();

/**
 * @openapi
 * /companies:
 *   get:
 *     summary: Listar todas las empresas
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de empresas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   ruc:
 *                     type: string
 *                   adress:
 *                     type: string
 *                   active:
 *                     type: boolean
 */
router.get('/', CompanyController.getAllCompanys);

/**
 * @openapi
 * /companies/{company_id}:
 *   get:
 *     summary: Obtener una empresa por ID
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: company_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de empresa codificado (hashids)
 *     responses:
 *       200:
 *         description: Empresa encontrada
 *       404:
 *         description: Empresa no encontrada
 */
router.get('/:company_id', CompanyController.getCompany);

/**
 * @openapi
 * /companies/createCompany:
 *   post:
 *     summary: Crear una empresa
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [name, ruc, adress, logo]
 *             properties:
 *               name:
 *                 type: string
 *               ruc:
 *                 type: string
 *               adress:
 *                 type: string
 *               logo:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Empresa creada
 *       400:
 *         description: No se ha subido ningún archivo de logo
 */
router.post('/createCompany', uploadSingleImage, CompanyController.createCompany);

/**
 * @openapi
 * /companies/updateCompany/{company_id}:
 *   put:
 *     summary: Actualizar una empresa
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: company_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de empresa codificado (hashids)
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               ruc:
 *                 type: string
 *               adress:
 *                 type: string
 *               logo:
 *                 type: string
 *                 format: binary
 *                 description: Opcional — si no se envía, el logo actual no cambia
 *     responses:
 *       200:
 *         description: Empresa actualizada
 */
router.put('/updateCompany/:company_id', uploadSingleImage, CompanyController.updateCompany);

/**
 * @openapi
 * /companies/{company_id}:
 *   delete:
 *     summary: Eliminar una empresa
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: company_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de empresa codificado (hashids)
 *     responses:
 *       200:
 *         description: Empresa eliminada
 */
router.delete('/:company_id', CompanyController.deleteCompany);


module.exports = router;