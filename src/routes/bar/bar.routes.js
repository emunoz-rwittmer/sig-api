const { Router } = require('express');
const CruiseController = require('../../controllers/bar/cruise.controller');
const { uploadSingleImage } = require('../../utils/uploadConfiguration');

const router = Router();

router.get('/cruises', CruiseController.getAllCruises);
router.get('/cruises/:cruise_id', CruiseController.getCruise);
router.post('/cruises/createCruise', uploadSingleImage, CruiseController.createCruise);
router.put('/cruises/updateCruise/:cruise_id', uploadSingleImage, CruiseController.updateCruise);
router.delete('/cruises/:cruise_id', CruiseController.deleteCruise);


module.exports = router;