const ProductService = require('../../../services/operations/inventory/products.services');
const Utils = require('../../../utils/Utils');
const Quantity = require('../../../utils/quantity');
const AppError = require('../../../errors/AppError');

const decodeId = (value, fieldName) => {
    let id;
    try {
        id = Utils.decode(value);
    } catch {
        throw new AppError(`${fieldName} inválido`, 400);
    }
    if (!Number.isInteger(id) || id <= 0) {
        throw new AppError(`${fieldName} inválido`, 400);
    }
    return id;
};

const findProduct = async (req, res, next) => {
    try {
        const sku = req.params.sku.replace(/^0+/, '');
        const result = await ProductService.findProduct(sku);
        if (!result) throw new AppError(`Producto no encontrado para sku: ${sku}`, 404);
        res.status(200).json({ data: result });
    } catch (error) {
        next(error);
    }
}

const getProducts = async (req, res, next) => {
    try {
        const result = await ProductService.getAll();
        if (result instanceof Array) {
            result.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
            });
        }
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}

const getProductsWithConfigurations = async (req, res, next) => {
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
        next(error);
    }
}

const getProductsByWarehouse = async (req, res) => {
    try {
        const warehouseId = Utils.decode(req.params.warehouse_id)
        const result = await ProductService.getProductsByWarehouse(warehouseId);

        if (result instanceof Array) {
            result.map((x) => {
                x.id = Utils.encode(x.id);
                x.companyId = Utils.encode(x.companyId);
                x.productId = Utils.encode(x.productId);
                x.quantity = Quantity.viewCorrectQuantity(x.product, x.quantity)
                x.totalBarConsumption = Quantity.viewCorrectQuantity(x.product, x.totalBarConsumption)

            });
        }
        res.status(200).json(result);
    } catch (error) {
        console.log(error)
        res.status(400).json(error.message)
    }
}

const getProduct = async (req, res, next) => {
    try {
        const productId = decodeId(req.params.product_id, 'product_id');
        const result = await ProductService.getProductById(productId);
        if (!result) throw new AppError('Producto no encontrado', 404);
        result.dataValues.id = Utils.encode(result.dataValues.id);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}

const createProduct = async (req, res, next) => {
    try {
        const product = req.body;
        if (!product.sku) {
            throw new AppError('sku es requerido', 400);
        }
        product.sku = product.sku.replace(/^0+/, '');
        const result = await ProductService.createProduct(product);
        if (result) {
            res.status(200).json({ data: 'resource created successfully' });
        }
    } catch (error) {
        next(error);
    }
}

const updateProduct = async (req, res, next) => {
    try {
        const productId = decodeId(req.params.product_id, 'product_id');
        const product = req.body;
        if (!product.sku) {
            throw new AppError('sku es requerido', 400);
        }
        product.sku = product.sku.replace(/^0+/, '');
        await ProductService.updateProduct(product, productId);
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        next(error);
    }
}

const deleteProduct = async (req, res, next) => {
    try {
        const productId = decodeId(req.params.product_id, 'product_id');
        const result = await ProductService.delete(productId);
        res.status(200).json({ data: result })
    } catch (error) {
        next(error);
    }
}


const switchConfirguration = async (req, res, next) => {
    try {
        const configurationId = req.params.configuration_id;
        const data = req.body
        await ProductService.switchConfirguration(data, configurationId);
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        next(error);
    }
}

const updateStock = async (req, res) => {
    try {

        const stockId = Utils.decode(req.params.stock_id);
        const data = req.body
        data.userId = Utils.decode(data.userId);
        await ProductService.updateStock(stockId, data);
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
    getProductsWithConfigurations,
    getProductsByWarehouse,
    switchConfirguration,
    updateStock
}
module.exports = ProductController