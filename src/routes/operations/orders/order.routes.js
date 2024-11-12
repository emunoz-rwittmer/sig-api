const { Router } = require('express');
const OrderController  = require ('../../../controllers/operations/orders/orders.controller');
const { uploadExcelFile } = require('../../../utils/uploadConfiguration');

const router = Router();

router.get('/',OrderController.getAllCompaniesWhitOrders);
router.get('/ordersByCompany/:company_id',OrderController.getOrdersByCompany);
router.post('/uploadOrder', uploadExcelFile, OrderController.uploadOrder);
router.post('/createOrder', uploadExcelFile, OrderController.createOrder);
router.put('/updateStatusOrder/:order_id', OrderController.updateStatusOrder);

//ITEMS ORDER
router.get('/itemsByOrder/:order_id',OrderController.getItemsByOrder);
router.put('/updateItemsOrder/:order_id', uploadExcelFile, OrderController.updateOrder);
router.delete('/deleteItem/:item_id', OrderController.deleteItem);

module.exports = router;