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
        const type = req.params.type
        const result = await ProductService.getProductsWithConfigurations(type);
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
        
        res.status(400).json(error.message);
    }
}


const createConfiguration = async (req, res) => {
    try {
        const { name, group, productId, sixteenPax, eighteenPax, twentyPax, twentyTwoPax, twentyFourPax } = req.body;
        const placeYacht = {
            name,
            group,
            productId: Utils.decode(productId)
        }
        const configuration = {
            sixteenPax: sixteenPax === '' ? 0 : parseInt(sixteenPax),
            eighteenPax: eighteenPax === '' ? 0 : parseInt(eighteenPax),
            twentyPax: twentyPax === '' ? 0 : parseInt(twentyPax),
            twentyTwoPax: twentyTwoPax === '' ? 0 : parseInt(twentyTwoPax),
            twentyFourPax: twentyFourPax === '' ? 0 : parseInt(twentyFourPax)
        }
        const result = await ProductService.createConfiguration({ placeYacht, configuration });
        if (result) {
            res.status(200).json({ data: result.message });
        }
    } catch (error) {
        
        res.status(400).json(error.message);
    }
}

const updateConfiguration = async (req, res) => {
    try {
        const placeYachtId = req.params.configuration_id;
        const { name, group, configurationId, sixteenPax, eighteenPax, twentyPax, twentyTwoPax, twentyFourPax } = req.body;
        const placeYacht = {
            id: parseInt(placeYachtId),
            name,
            group
        }
        const configuration = {
            id: configurationId,
            sixteenPax: sixteenPax === '' ? 0 : parseInt(sixteenPax),
            eighteenPax: eighteenPax === '' ? 0 : parseInt(eighteenPax),
            twentyPax: twentyPax === '' ? 0 : parseInt(twentyPax),
            twentyTwoPax: twentyTwoPax === '' ? 0 : parseInt(twentyTwoPax),
            twentyFourPax: twentyFourPax === '' ? 0 : parseInt(twentyFourPax)
        }

        const result = await ProductService.updateConfiguration({ placeYacht, configuration });
        if (result) {
            res.status(200).json({ data: result.message });
        }
    } catch (error) {
        res.status(400).json(error.message);
    }
}

const switchConfirguration = async (req, res) => {
    try {

        const configurationId = req.params.configuration_id;
        const data = req.body
        console.log(req.body)
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

const deleteConfiguration = async (req, res) => {
    try {
        const placeYachtId = req.params.placeYacht_id;
        const configurationId = req.params.configuration_id;
        const result = await ProductService.deleteConfiguration({ placeYachtId, configurationId });
        if (result) {
            res.status(200).json({ data: result.message });
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
    createConfiguration,
    updateConfiguration,
    switchConfirguration,
    deleteConfiguration
}
module.exports = ProductController