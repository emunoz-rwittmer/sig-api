const { Router } = require('express');
const DepartamentsController = require('../../controllers/catalogs/departaments.controller');

const router = Router();

router.get('/', DepartamentsController.getDepartaments);
router.get('/:departament_id', DepartamentsController.getDepartament);
router.post('/createDepartament', DepartamentsController.createDepartament);
router.put('/updateDepartament/:departament_id', DepartamentsController.updateDepartament);
router.delete('/:departament_id', DepartamentsController.deleteDepartament);


module.exports = router;