const { Router } = require('express');
const DepartamentsController  = require ('../../controllers/catalogs/departaments.controller');

const router = Router();

router.get('/', DepartamentsController.getDepartaments);


module.exports = router;