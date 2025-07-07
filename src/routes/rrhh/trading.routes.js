const { Router } = require('express');
const TradingController = require('../../controllers/rrhh/trading.controller');
const router = Router();

router.get('/', TradingController.getAllTradings);
router.get('/:trading_id', TradingController.getTrading);
router.post('/', TradingController.createTrading);
router.put('/:trading_id', TradingController.updateTrading);
router.delete('/:trading_id', TradingController.deleteTrading);


module.exports = router;