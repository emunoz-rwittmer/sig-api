const { Router } = require('express');
const RolesController = require('../../controllers/catalogs/roles.controller');

const router = Router();

/**
 * @openapi
 * /roles:
 *   get:
 *     summary: Listar todos los roles (requiere rol admin)
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de roles
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     description: ID de rol codificado (hashids)
 *                   name:
 *                     type: string
 *       403:
 *         description: Requiere rol admin
 */
router.get('/', RolesController.getRoles);


module.exports = router;