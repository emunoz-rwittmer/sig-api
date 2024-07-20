const { Router } = require('express');
const PositionsController  = require ('../../controllers/catalogs/positions.controller');

const router = Router();

router.get('/', PositionsController.getPositions);


module.exports = router;