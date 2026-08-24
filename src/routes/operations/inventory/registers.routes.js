const { Router } = require('express');
const RegisterController  = require ('../../../controllers/operations/inventory/registers.controller');

const router = Router();

/**
 * @openapi
 * /registers:
 *   get:
 *     summary: Listar todos los registros de inventario
 *     tags: [Registers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de registros
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     description: ID de registro codificado (hashids)
 *                   counter:
 *                     type: string
 *                   companyId:
 *                     type: string
 *                     description: ID de empresa codificado (hashids)
 *                   userId:
 *                     type: string
 *                     description: ID de usuario codificado (hashids)
 *                   products:
 *                     type: number
 *                   isResived:
 *                     type: boolean
 *       500:
 *         description: Error inesperado
 */
router.get('/', RegisterController.getAllRegisters);

module.exports = router;
