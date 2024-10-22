const { Router } = require('express');
const TransactionController  = require ('../../../controllers/operations/inventory/transactions.controller');

const router = Router();

router.post('/productEntryInWarehouse/:warehouse_id', TransactionController.productEntryInWarehouse);
router.post('/transactionBetweenWarehouse', TransactionController.transactionWarehouse);
router.post('/incomeProductsInWarehouse', TransactionController.incomeProductsInWarehouse);
// Yacht request 
router.post('/requestWarehouse', TransactionController.requestWarehouse);



module.exports = router;