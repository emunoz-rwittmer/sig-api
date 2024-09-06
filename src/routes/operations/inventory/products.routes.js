const { Router } = require('express');
const ProductController  = require ('../../../controllers/operations/inventory/products.controller');

const router = Router();

router.get('/findProduct/:sku', ProductController.findProduct);


module.exports = router;