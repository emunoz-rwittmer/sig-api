const { Router } = require('express');
const StaffController  = require ('../../controllers/catalogs/staff.controller');
const { uploadImageFile, uploadManyFiles } = require('../../utils/uploadConfiguration');

const router = Router();

router.get('/',StaffController.getAllStaffs);
router.get('/:staff_id',StaffController.getStaff);
router.get('/:staff_id/companies',StaffController.getStaffCompanies);
router.post('/createStaff',StaffController.createStaff);
router.put('/updateStaff/:staff_id',StaffController.updateStaff);
router.put('/:staff_id/uploadImageFile', uploadImageFile, StaffController.uploadImage);
router.put('/update/documentation/:staff_id', uploadManyFiles, StaffController.uploadStaffDocumentation);
router.delete('/:staff_id',StaffController.deleteStaff);

//evaluators and evaluated
router.get('/send_form/evaluators',StaffController.getEvaluators);
router.get('/send_form/evaluatorsByFilters',StaffController.getEvaluatorsByFilters);
router.get('/send_form/evaluateds',StaffController.getEvaluateds);
router.get('/send_form/evaluatedsByFilters',StaffController.getEvaluatedsByFilters);


module.exports = router;