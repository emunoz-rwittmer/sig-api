const { Router } = require('express');
const CaptainController  = require ('../../controllers/catalogs/captains.controller');

const router = Router();

router.get('/',CaptainController.getAllCaptains);
router.get('/:captain_id',CaptainController.getCaptain);
router.post('/createCaptain',CaptainController.createCaptain);
router.put('/updateCaptain/:captain_id',CaptainController.updateCaptain);
router.delete('/:captain_id',CaptainController.deleteCaptain);

//capitan yachts
router.get('/:captain_id/yachts',CaptainController.getAllYachts);
router.post('/:captain_id/assingYacht',CaptainController.assingYacht);
router.delete('/:captain_id/yacht/:id',CaptainController.deleteYacht);


module.exports = router;