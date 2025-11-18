const { Router } = require('express');
const FormatController = require('../../controllers/rrhh/formats.controller');
const { uploadPdfFile } = require('../../utils/uploadConfiguration');
const multer = require("multer");
const router = Router();
const upload = multer();

//request
router.get('/request', FormatController.getAllFormats);
router.get('/request/:format_id', FormatController.getFormat);
router.post('/request', FormatController.createFormat);
router.put('/request/:format_id', FormatController.updateFormat);
router.delete('/request/:format_id', FormatController.deleteFormat);

//docs
router.get('/doctor', FormatController.getAllDoctorFormats);
router.get('/doctor/:format_id', FormatController.getDoctorFormat);
router.post('/doctor', uploadPdfFile, FormatController.createDoctorFormat);
router.put('/doctor/:format_id', uploadPdfFile, FormatController.updateDoctorFormat);
router.delete('/doctor/:format_id', FormatController.deleteDoctorFormat);

// REQUEST STAFFS
router.get('/:format_id/request/:staff_id', FormatController.getAllFormatsByStaff);
router.post('/create_request/format/:format_id/staff/:staff_id', upload.single("file"), FormatController.createRequesForStaff);



module.exports = router;