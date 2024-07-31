const { Router } = require('express');
const StaffController  = require ('../../controllers/catalogs/staff.controller');

const router = Router();

router.get('/',StaffController.getAllStaffs);
router.get('/staffsByFilters',StaffController.getStaffsByFilters);
router.get('/:staff_id',StaffController.getStaff);
router.post('/createStaff',StaffController.createStaff);
router.put('/updateStaff/:staff_id',StaffController.updateStaff);
router.delete('/:staff_id',StaffController.deleteStaff);

//capitan yachts
router.get('/:staff_id/yachts',StaffController.getAllYachts);
router.post('/:staff_id/assingYacht',StaffController.assingYacht);
router.delete('/:staff_id/yacht/:id',StaffController.deleteYacht);


module.exports = router;