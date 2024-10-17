const { Router } = require('express');
const YachtRequestController  = require ('../../../controllers/operations/yachtRequest/yachtRequest.controller');

const router = Router();

router.put('/updateStatusRequest/:request_id', YachtRequestController.updateStatusYachtRequest);

//ITEMS ORDER
// router.get('/itemsByYachtRequest/:order_id',YachtRequestController.getItemsByYachtRequest);
// router.put('/updateItemsYachtRequest/:order_id', uploadExcelFile, YachtRequestController.updateYachtRequest);
// router.delete('/deleteItem/:item_id', YachtRequestController.deleteItem);





module.exports = router;