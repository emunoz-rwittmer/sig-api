const { Router } = require('express');
const ProductController = require('../../../controllers/operations/inventory/products.controller');

const router = Router();

router.get('/', ProductController.getProducts);
router.get('/allProductsWithConfigurations', ProductController.getProductsWithConfigurations);
router.get('/findProduct/:sku', ProductController.findProduct);
router.get('/:product_id', ProductController.getProduct);
router.post('/createProduct', ProductController.createProduct);
router.put('/updateProduct/:product_id', ProductController.updateProduct);
router.delete('/:product_id', ProductController.deleteProduct);
//stock
router.get('/:warehouse_id/stocks', ProductController.getProductsByWarehouse);
router.put('/upadate/stock/:stock_id', ProductController.updateStock);
//configuration
router.put('/configurations/switchConfiguration/:configuration_id', ProductController.switchConfirguration);


module.exports = router;