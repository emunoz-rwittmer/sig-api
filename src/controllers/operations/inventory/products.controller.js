const ProductService = require('../../../services/operations/inventory/products.services');
const Utils = require('../../../utils/Utils');

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
        const result = await ProductService.createProduct(product);
        if (result) {
            res.status(200).json({ data: 'resource created successfully' });
        }
    } catch (error) {
        console.log(error)
        res.status(400).json(error.message);
    }
}

const updateProduct = async (req, res) => {
    try {
        const productId = Utils.decode(req.params.product_id);
        const product = req.body;
        const result = await ProductService.updateProduct(product, {
            where: { id: productId },
        });
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
        console.log(error)
        res.status(400).json(error.message);
    }
}


const createConfiguration = async (req, res) => {
    try {
        const configuration = req.body;
        configuration.productId = Utils.decode(configuration.productId);
        const result = await ProductService.createConfiguration(configuration);
        if (result) {
            res.status(200).json({ data: 'resource created successfully' });
        }
    } catch (error) {
        console.log(error)
        res.status(400).json(error.message);
    }
}

const updateConfiguration = async (req, res) => {
    try {
        const configurationId = req.params.configuration_id;
        const configuration = req.body;
        const result = await ProductService.updateConfiguration(configuration, {
            where: { id: configurationId },
        });
        res.status(200).json({ data: 'resource updated successfully' });
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
    createConfiguration,
    updateConfiguration
}
module.exports = ProductController