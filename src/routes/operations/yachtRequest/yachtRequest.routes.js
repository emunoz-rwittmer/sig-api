const { Router } = require('express');
const YachtRequestController  = require ('../../../controllers/operations/yachtRequest/yachtRequest.controller');

const router = Router();

router.put('/updateRequest/:request_id', YachtRequestController.updateRequest);

//ITEMS ORDER
router.put('/updateQuantityItemRequest', YachtRequestController.updateQuantityItemRequest);





module.exports = router;