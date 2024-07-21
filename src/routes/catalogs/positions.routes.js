const { Router } = require('express');
const PositionsController  = require ('../../controllers/catalogs/positions.controller');

const router = Router();

router.get('/', PositionsController.getPositions);
router.get('/:position_id',PositionsController.getPosition);
router.post('/createPosition',PositionsController.createPosition);
router.put('/updatePosition/:position_id',PositionsController.updatePosition);
router.delete('/:position_id',PositionsController.deletePosition);


module.exports = router;