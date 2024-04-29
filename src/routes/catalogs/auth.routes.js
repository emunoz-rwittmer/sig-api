const { Router } = require('express');
const AuthController = require('../../controllers/catalogs/auth.controller');

const router = Router();

router.post('/login', AuthController.login);
router.post('/login_captains', AuthController.loginCaptains);
router.post('/login_crews', AuthController.loginCrews);
router.put('/upgradePassword/:user_id', AuthController.upgradePassword);
router.put('/forgotPassword', AuthController.forgotPassword)

module.exports = router;