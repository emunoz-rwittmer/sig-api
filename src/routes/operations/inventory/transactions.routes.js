const { Router } = require('express');
const TransactionController  = require ('../../../controllers/operations/inventory/transactions.controller');

const router = Router();

router.post('/productEntryInWarehouse/:warehouse_id', TransactionController.productEntryInWarehouse);


module.exports = router;