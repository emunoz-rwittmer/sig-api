const { Router } = require('express');
const RegulationController = require('../../controllers/rrhh/regulations.controller');
const { uploadSingleImage, uploadPdfFile } = require('../../utils/uploadConfiguration');

const router = Router();

router.get('/:company_id', RegulationController.getAllRegulations);
//router.get('/:company_id/ruler', RegulationController.getRegulation);
router.post('/createRegulation', uploadPdfFile, RegulationController.createRegulation);
router.put('/updateRegulation/:company_id', uploadSingleImage, RegulationController.updateRegulation);
router.delete('/:company_id', RegulationController.deleteRegulation);


module.exports = router;