const { Router } = require('express');
const YachtController = require('../../controllers/catalogs/yachts.controller');

const router = Router();

/**
 * @openapi
 * /yachts:
 *   get:
 *     summary: Listar todos los yates
 *     tags: [Yachts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de yates
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     description: ID de yate codificado (hashids)
 *                   name:
 *                     type: string
 *                   code:
 *                     type: string
 *                   color:
 *                     type: string
 *                   companyId:
 *                     type: string
 *                     description: ID de empresa codificado (hashids)
 *                   email:
 *                     type: string
 *                   active:
 *                     type: boolean
 *                   company:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 */
router.get('/', YachtController.getAllYachts);

/**
 * @openapi
 * /yachts/{yacht_id}:
 *   get:
 *     summary: Obtener un yate por ID
 *     tags: [Yachts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: yacht_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de yate codificado (hashids)
 *     responses:
 *       200:
 *         description: Yate encontrado
 *       404:
 *         description: Yate no encontrado
 */
router.get('/:yacht_id', YachtController.getYacht);

/**
 * @openapi
 * /yachts/createYacht:
 *   post:
 *     summary: Crear un yate
 *     tags: [Yachts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [companyId, name, email, code, color]
 *             properties:
 *               companyId:
 *                 type: string
 *                 description: ID de empresa codificado (hashids)
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               code:
 *                 type: string
 *               color:
 *                 type: string
 *     responses:
 *       200:
 *         description: Yate creado
 *       500:
 *         description: Error inesperado
 */
router.post('/createYacht', YachtController.createYacht);

/**
 * @openapi
 * /yachts/updateYacht/{yacht_id}:
 *   put:
 *     summary: Actualizar un yate
 *     tags: [Yachts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: yacht_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de yate codificado (hashids)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               companyId:
 *                 type: string
 *                 description: ID de empresa codificado (hashids)
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               code:
 *                 type: string
 *               color:
 *                 type: string
 *     responses:
 *       200:
 *         description: Yate actualizado
 */
router.put('/updateYacht/:yacht_id', YachtController.updateYacht);

/**
 * @openapi
 * /yachts/{yacht_id}:
 *   delete:
 *     summary: Eliminar un yate
 *     tags: [Yachts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: yacht_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de yate codificado (hashids)
 *     responses:
 *       200:
 *         description: Yate eliminado
 */
router.delete('/:yacht_id', YachtController.deleteYacht);


module.exports = router;