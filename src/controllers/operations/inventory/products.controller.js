const ProductService = require('../../../services/operations/inventory/products.services');
const Utils = require('../../../utils/Utils');

const findProduct = async (req, res) => {
    try {
        const sku = req.params.sku.replace(/^0+/, '');
        const result = await ProductService.findProduct(sku);
        if (result) {
            res.status(200).json({ data: result });
        } else {
            res.status(400).json(`Producto no encontrado para sku: ${sku}`)
        }
    } catch (error) {

        res.status(400).json(error.message)
    }
}

const getProducts = async (req, res) => {
    try {
        const result = await ProductService.getAll();
        if (result instanceof Array) {
            result.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
            });
        }
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json(error.message)
    }
}

const getProductsWithConfigurations = async (req, res) => {
    try {
        const result = await ProductService.getProductsWithConfigurations();
        if (result instanceof Array) {
            result.map((x) => {
                x.product.wineries.map(warehose => {
                    warehose.dataValues.warehouseId = Utils.encode(warehose.dataValues.warehouseId);
                })
            });
        }
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json(error.message)
    }
}

const getProductsByWarehouse = async (req, res) => {
    try {
        const warehouseId = Utils.decode(req.params.warehouse_id)
        const result = await ProductService.getProductsByWarehouse(warehouseId);
        if (result instanceof Array) {
            result.map((x) => {
                x.companyId = Utils.encode(x.companyId);
            });
        }
        res.status(200).json(result);
    } catch (error) {
        console.log(error)
        res.status(400).json(error.message)
    }
}

const getProduct = async (req, res) => {
    try {
        const productId = Utils.decode(req.params.product_id);
        const result = await ProductService.getProductById(productId);
        if (result instanceof Object) {
            result.id = Utils.encode(result.id);
        }
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json(error.message)
    }
}

const createProduct = async (req, res) => {
    try {
        const product = req.body;
        product.sku = product.sku.replace(/^0+/, '');
        const result = await ProductService.createProduct(product);
        if (result) {
            res.status(200).json({ data: 'resource created successfully' });
        }
    } catch (error) {

        res.status(400).json(error.message);
    }
}

const updateProduct = async (req, res) => {
    try {
        const productId = Utils.decode(req.params.product_id);
        const product = req.body;
        product.sku = product.sku.replace(/^0+/, '');
        await ProductService.updateProduct(product, productId);
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        res.status(400).json(error.message);
    }
}

const deleteProduct = async (req, res) => {
    try {
        const productId = Utils.decode(req.params.product_id);
        const result = await ProductService.delete(productId);
        res.status(200).json({ data: result })
    } catch (error) {

        res.status(400).json(error.message);
    }
}




const switchConfirguration = async (req, res) => {
    try {

        const configurationId = req.params.configuration_id;
        const data = req.body
        const result = await ProductService.switchConfirguration(data, {
            where: { id: configurationId }
        });
        if (result) {
            res.status(200).json({ data: 'resource updated successfully' });
        }
    } catch (error) {
        res.status(400).json(error.message);
    }
}

const ProductController = {
    getProducts,
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct,
    findProduct,
    getProductsWithConfigurations,
    getProductsByWarehouse,
    switchConfirguration,
}
module.exports = ProductController