const { Router } = require('express');
const AuthController = require('../../controllers/catalogs/auth.controller');

const router = Router();

router.post('/login', AuthController.login);
router.put('/upgradePassword/:user_id', AuthController.upgradePassword);
router.put('/forgotPassword', AuthController.forgotPassword)

//staffs
router.post('/login_staffs', AuthController.loginStaffs);
router.put('/forgot_password_staffs', AuthController.forgotPasswordStaff)
router.put('/upgrade_password_staffs/:staff_id', AuthController.upgradePasswordStaff);


module.exports = router;