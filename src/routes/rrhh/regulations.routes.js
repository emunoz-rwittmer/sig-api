const { Router } = require('express');
const RegulationController = require('../../controllers/rrhh/regulations.controller');
const { uploadSingleImage, uploadPdfFile } = require('../../utils/uploadConfiguration');

const router = Router();

router.get('/:company_id', RegulationController.getAllRegulations);
router.get('/:company_id/staffs', RegulationController.getAllStaffsRegulations);
router.get('/staff/:staff_id', RegulationController.getAllRegulationsBystaff);
router.post('/createRegulation', uploadPdfFile, RegulationController.createRegulation);
router.put('/updateRegulation/:regulation_id', uploadPdfFile, RegulationController.updateRegulation);
router.delete('/:company_id', RegulationController.deleteRegulation);

//READ REGULATIONS
router.get('/regulation_staff/:regulation_id', RegulationController.getRegulationStaffById);
router.put('/aceptar_reglamento/:regulation_id', uploadPdfFile, RegulationController.readAceptRegulation);


module.exports = router;