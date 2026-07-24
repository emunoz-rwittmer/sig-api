const { Router } = require('express');
const UserController  = require ('../../controllers/catalogs/users.controller');

const router = Router();

/**
 * @openapi
 * /users:
 *   get:
 *     summary: Listar todos los usuarios administrativos
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de usuarios
 */
router.get('/',UserController.getAllUsers);

/**
 * @openapi
 * /users/{user_id}:
 *   get:
 *     summary: Obtener un usuario administrativo por ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de usuario codificado (hashids)
 *     responses:
 *       200:
 *         description: Usuario encontrado
 */
router.get('/:user_id',UserController.getUser);

/**
 * @openapi
 * /users/createUser:
 *   post:
 *     summary: Crear un usuario administrativo
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [firstName, lastName, email, roleId]
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *               roleId:
 *                 type: string
 *                 description: ID de rol codificado (hashids)
 *     responses:
 *       200:
 *         description: Usuario creado, contrasena generada enviada por correo
 *       500:
 *         description: Error inesperado
 */
router.post('/createUser',UserController.createUser);

/**
 * @openapi
 * /users/updateUser/{user_id}:
 *   put:
 *     summary: Actualizar un usuario administrativo
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Usuario actualizado
 */
router.put('/updateUser/:user_id',UserController.updateUser);

/**
 * @openapi
 * /users/{user_id}:
 *   delete:
 *     summary: Eliminar un usuario administrativo
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Usuario eliminado
 */
router.delete('/:user_id',UserController.deleteUser);


module.exports = router;
