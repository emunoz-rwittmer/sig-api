const { Router } = require('express');
const StaffController  = require ('../../controllers/catalogs/staff.controller');

const router = Router();

router.get('/',StaffController.getAllStaffs);
router.get('/staffsByFilters',StaffController.getStaffsByFilters);
router.get('/:staff_id',StaffController.getStaff);
router.post('/createStaff',StaffController.createStaff);
router.put('/updateStaff/:staff_id',StaffController.updateStaff);
router.delete('/:staff_id',StaffController.deleteStaff);

//staffs yachts
router.get('/:staff_id/yachts',StaffController.getAllYachts);
router.post('/:staff_id/assingYacht',StaffController.assingYacht);
router.delete('/:staff_id/yacht/:id',StaffController.deleteYacht);

//staffs yachts
router.get('/:staff_id/companies',StaffController.getAllCompanies);
router.post('/:staff_id/assingCompany',StaffController.assingCompany);
router.delete('/:staff_id/company/:id',StaffController.deleteCompany);

//evaluators and evaluated
router.get('/sendForm/evaluators',StaffController.getEvaluators);
router.get('/sendForm/evaluatorsByFilters',StaffController.getEvaluatorsByFilters);
router.get('/send_form/evaluateds',StaffController.getEvaluateds);
router.get('/send_form/evaluatedsByFilters',StaffController.getEvaluatedsByFilters);


module.exports = router;