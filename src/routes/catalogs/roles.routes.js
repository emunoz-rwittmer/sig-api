const { Router } = require('express');
const RolesController  = require ('../../controllers/catalogs/roles.controller');

const router = Router();

router.get('/', RolesController.getRoles);


module.exports = router;