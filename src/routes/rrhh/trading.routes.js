const { Router } = require('express');
const TradingController = require('../../controllers/rrhh/trading.controller');
const { uploadPdfFile } = require('../../utils/uploadConfiguration');
const router = Router();

router.get('/', TradingController.getAllTradings);
router.get('/:trading_id', TradingController.getTrading);
router.post('/', uploadPdfFile, TradingController.createTrading);
router.put('/:trading_id', uploadPdfFile, TradingController.updateTrading);
router.delete('/:trading_id', TradingController.deleteTrading);


module.exports = router;