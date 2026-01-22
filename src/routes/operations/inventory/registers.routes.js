const { Router } = require('express');
const RegisterController  = require ('../../../controllers/operations/inventory/registers.controller');

const router = Router();

router.get('/', RegisterController.getAllRegisters);
// router.post('/transactionBetweenWarehouse', RegisterController.transactionWarehouse);
// router.post('/incomeProductsInWarehouse', RegisterController.incomeProductsInWarehouse);
// router.put('/updateStatusItem/:item_id', RegisterController.updateStatusItem);
// // Yacht request 
// router.post('/createRequestWarehouse', RegisterController.0);



module.exports = router;