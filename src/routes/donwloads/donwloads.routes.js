const { Router } = require('express');
const DonwloadController  = require ('../../controllers/donwloads/donwloads.controller');

const router = Router();

router.get('/:rule_id/download', DonwloadController.downloadReglamento);

module.exports = router;