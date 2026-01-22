const { Router } = require('express');
const YachtRequestController  = require ('../../../controllers/operations/yachtRequest/yachtRequest.controller');

const router = Router();

router.get('/',YachtRequestController.getAllRequests);
router.get('/:request_id',YachtRequestController.getRequestById);
router.post('/', YachtRequestController.createRequest);
router.put('/:request_id', YachtRequestController.updateRequest);

router.put('/updateRequest/:request_id', YachtRequestController.updateRequest);
router.put('/updateQuantityItemRequest', YachtRequestController.updateQuantityItemRequest);





module.exports = router;