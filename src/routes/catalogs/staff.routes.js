const { Router } = require('express');
const StaffController  = require ('../../controllers/catalogs/staff.controller');

const router = Router();

router.get('/',StaffController.getAllStaffs);
router.get('/:staff_id',StaffController.getStaff);
router.post('/createStaff',StaffController.createStaff);
router.put('/updateStaff/:staff_id',StaffController.updateStaff);
router.delete('/:staff_id',StaffController.deleteStaff);

//evaluators and evaluated
router.get('/send_form/evaluators',StaffController.getEvaluators);
router.get('/send_form/evaluatorsByFilters',StaffController.getEvaluatorsByFilters);
router.get('/send_form/evaluateds',StaffController.getEvaluateds);
router.get('/send_form/evaluatedsByFilters',StaffController.getEvaluatedsByFilters);


module.exports = router;