const { Router } = require('express');
const DownloadController = require('../../controllers/downloads/downloads.controller');
const ConsumerCardController = require('../../controllers/bar/consumerCard.controller');

const router = Router();

router.get('/:rule_id/download', DownloadController.downloadReglamento);
router.get('/guide/:guide_id/download', DownloadController.downloadGuiaRemision);
router.get('/doctor_format/:format_id/download', DownloadController.downloadFormato);
router.get('/staff/request/:request_id/download', DownloadController.downloadSolicitud);
//bar
router.get('/cruise/:cruise_id/download/pfd', DownloadController.downloadreportePdf);
router.get('/cruise/:cruise_id/download/excel', DownloadController.downloadreporteExcel);
router.get('/consumer-cards/export/report', ConsumerCardController.exportConsumerCardReport);



module.exports = router;