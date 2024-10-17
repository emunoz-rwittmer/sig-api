const { Router } = require('express');
const ProductController  = require ('../../../controllers/operations/inventory/products.controller');

const router = Router();

router.get('/', ProductController.getProducts);
router.get('/findProduct/:sku', ProductController.findProduct);
router.get('/:product_id', ProductController.getProduct);
router.post('/createProduct', ProductController.createProduct);
router.put('/updateProduct/:product_id', ProductController.updateProduct);
router.delete('/:product_id', ProductController.deleteProduct);

router.post('/configurations/createConfiguration', ProductController.createConfiguration);
router.put('/configurations/updateConfiguration/:configuration_id', ProductController.updateConfiguration);


module.exports = router;