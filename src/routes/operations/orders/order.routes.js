const { Router } = require('express');
const OrderController  = require ('../../../controllers/operations/orders/orders.controller');
const { uploadExcelFile } = require('../../../utils/uploadConfiguration');

const router = Router();

router.get('/',OrderController.getAllOrders);
router.get('/:order_id',OrderController.getOrderById);
router.post('/', uploadExcelFile, OrderController.createOrder);
router.put('/:order_id', OrderController.updateOrder);

//ITEMS ORDER
router.delete('/deleteItem/:item_id', OrderController.deleteItem);

module.exports = router;