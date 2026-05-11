const { Router } = require('express');
const DonwloadController  = require ('../../controllers/donwloads/donwloads.controller');

const router = Router();

router.get('/:rule_id/download', DonwloadController.downloadReglamento);
router.get('/guide/:guide_id/download', DonwloadController.downloadGuiaRemision);
router.get('/doctor_format/:format_id/download', DonwloadController.downloadFormato);
router.get('/staff/request/:request_id/download', DonwloadController.downloadSolicitud);
//bar
router.get('/cruise/:cruise_id/download/pfd', DonwloadController.downloadreportePdf);
router.get('/cruise/:cruise_id/download/excel', DonwloadController.downloadreporteExcel);



module.exports = router;