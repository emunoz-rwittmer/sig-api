const { Router } = require('express');
const AdministrativeController  = require ('../../controllers/catalogs/administratives.controller');

const router = Router();

router.get('/',AdministrativeController.getAllAdministratives);
router.get('/:administrative_id',AdministrativeController.getAdministrative);
router.post('/createAdministrative',AdministrativeController.createAdministrative);
router.put('/updateAdministrative/:administrative_id',AdministrativeController.updateAdministrative);
router.delete('/:administrative_id',AdministrativeController.deleteAdministrative);

module.exports = router;