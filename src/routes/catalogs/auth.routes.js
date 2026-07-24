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
 *         description: Credenciales invalidas
 */
router.post('/login', AuthController.login);
router.put('/upgradePassword/:user_id', AuthController.upgradePassword);
router.put('/forgotPassword', AuthController.forgotPassword)

//staffs
router.post('/login_staffs', AuthController.loginStaffs);
router.put('/forgot_password_staffs', AuthController.forgotPasswordStaff)
router.put('/upgrade_password_staffs/:staff_id', AuthController.upgradePasswordStaff);


module.exports = router;