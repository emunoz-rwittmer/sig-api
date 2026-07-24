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
 *       400:
 *         description: Error al obtener la empresa
 */
router.get('/:company_id', CompanyController.getCompany);
router.post('/createCompany', uploadSingleImage, CompanyController.createCompany);
router.put('/updateCompany/:company_id', uploadSingleImage, CompanyController.updateCompany);
router.delete('/:company_id', CompanyController.deleteCompany);


module.exports = router;