const { Router } = require('express');
const YachtController  = require ('../../controllers/catalogs/yachts.controller');

const router = Router();

router.get('/',YachtController.getAllYachts);
router.get('/:yacht_id',YachtController.getYacht);
router.post('/createYacht',YachtController.createYacht);
router.put('/updateYacht/:yacht_id',YachtController.updateYacht);
router.delete('/:yacht_id',YachtController.deleteYacht);

router.get('/parts/allYachts',YachtController.getAllParts);
router.post('/parts/createPart',YachtController.createPart);
router.put('/parts/updatePart/:part_id',YachtController.updatePart);


module.exports = router;