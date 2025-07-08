const { Router } = require('express');
const DonwloadController  = require ('../../controllers/donwloads/donwloads.controller');

const router = Router();

router.get('/:rule_id/download', DonwloadController.downloadReglamento);
router.get('/doctor_format/:format_id/download', DonwloadController.downloadFormato);

module.exports = router;