const { Router } = require('express');
const RegisterController  = require ('../../../controllers/operations/inventory/registers.controller');

const router = Router();

router.get('/', RegisterController.getAllRegisters);

module.exports = router;
