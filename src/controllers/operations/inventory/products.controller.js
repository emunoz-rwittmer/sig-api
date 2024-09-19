const ProductService = require('../../../services/operations/inventory/products.services');

const findProduct = async (req, res) => {
    try {
        const sku = req.params.sku
        const result = await ProductService.findProduct(sku);
        if (result) {
             res.status(200).json({ data: result });
        } else {
            res.status(400).json(`Producto no encontrado para sku: ${sku}`)
        }
    } catch (error) {
        console.log(error)
        res.status(400).json(error.message)
    }
}



const ProductController = {
    findProduct,
}
module.exports = ProductController