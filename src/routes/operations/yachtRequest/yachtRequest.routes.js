const { Router } = require('express');
const YachtRequestController  = require ('../../../controllers/operations/yachtRequest/yachtRequest.controller');

const router = Router();

router.put('/updateStatusRequest/:request_id', YachtRequestController.updateStatusYachtRequest);

//ITEMS ORDER
router.put('/updateQuantityItemRequest', YachtRequestController.updateQuantityItemRequest);





module.exports = router;