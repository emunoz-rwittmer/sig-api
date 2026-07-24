const { Router } = require('express');
const AuthController = require('../../controllers/catalogs/auth.controller');

const router = Router();

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Iniciar sesion como usuario administrativo
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Login exitoso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: ID de usuario codificado (hashids)
 *                 firstName:
 *                   type: string
 *                 lastName:
 *                   type: string
 *                 rol:
 *                   type: string
 *                 token:
 *                   type: string
 *                 changePassword:
 *                   type: boolean
 *       400:
 *         description: Falta email o password
 *       401:
 *         description: Credenciales invalidas
 *       403:
 *         description: Usuario deshabilitado
 */
router.post('/login', AuthController.login);

/**
 * @openapi
 * /auth/upgradePassword/{user_id}:
 *   put:
 *     summary: Cambiar la contrasena de un usuario administrativo
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de usuario codificado (hashids)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password]
 *             properties:
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Contrasena actualizada
 *       500:
 *         description: Error inesperado
 */
router.put('/upgradePassword/:user_id', AuthController.upgradePassword);

/**
 * @openapi
 * /auth/forgotPassword:
 *   put:
 *     summary: Generar y enviar por correo una nueva contrasena de usuario administrativo
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Contrasena restablecida y enviada por correo
 *       404:
 *         description: Usuario no encontrado
 */
router.put('/forgotPassword', AuthController.forgotPassword)

//staffs
/**
 * @openapi
 * /auth/login_staffs:
 *   post:
 *     summary: Iniciar sesion como personal (staff)
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Login exitoso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 firstName:
 *                   type: string
 *                 lastName:
 *                   type: string
 *                 rol:
 *                   type: string
 *                 token:
 *                   type: string
 *                 changePassword:
 *                   type: boolean
 *                 isTiptop:
 *                   type: boolean
 *                 companiIds:
 *                   type: array
 *                   items:
 *                     type: string
 *       400:
 *         description: Falta email o password
 *       401:
 *         description: Credenciales invalidas
 *       403:
 *         description: Usuario deshabilitado
 */
router.post('/login_staffs', AuthController.loginStaffs);

/**
 * @openapi
 * /auth/forgot_password_staffs:
 *   put:
 *     summary: Generar y enviar por correo una nueva contrasena de personal
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Contrasena restablecida y enviada por correo
 *       404:
 *         description: Usuario no encontrado
 */
router.put('/forgot_password_staffs', AuthController.forgotPasswordStaff)

/**
 * @openapi
 * /auth/upgrade_password_staffs/{staff_id}:
 *   put:
 *     summary: Cambiar la contrasena de un miembro del personal
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: staff_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de personal codificado (hashids)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password]
 *             properties:
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Contrasena actualizada
 *       500:
 *         description: Error inesperado
 */
router.put('/upgrade_password_staffs/:staff_id', AuthController.upgradePasswordStaff);


module.exports = router;
