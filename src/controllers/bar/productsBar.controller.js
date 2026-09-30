const ProductBarService = require('../../services/bar/productsBar.services');
const Utils = require('../../utils/Utils');
const AppError = require('../../errors/AppError');

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

// Normaliza el payload de create/update: decodifica el producto de inventario
// relacionado y los ingredientes de la receta antes de llegar al service.
const decodeProductPayload = (body = {}) => {
    const product = { ...body };
    if (product.productId) product.productId = decodeId(product.productId, 'productId');

    const recipe = Array.isArray(product.recipe) ? product.recipe : [];
    product.recipe = recipe.map((ingredient) => ({
        ...ingredient,
        productId: decodeId(ingredient.productId, 'productId de la receta'),
    }));

    return product;
};

const getProducts = async (req, res, next) => {
    try {
        const result = await ProductBarService.getAll();
        const products = result.map(r => r.get({ plain: true }));
        products.forEach((x) => {
            x.id = Utils.encode(x.id);
            x.productId = x.productId ? Utils.encode(x.productId) : null;
            if (x.recipe && x.recipe.recipe_details) {
                x.recipe.recipe_details = x.recipe.recipe_details.map(d => {
                    d.productId = Utils.encode(d.productId);
                    d.recipeId = Utils.encode(d.recipeId);
                    return d;
                });
            }
        });
        res.status(200).json(products);
    } catch (error) {
        next(error);
    }
}

const getProductsForBar = async (req, res, next) => {
    try {
        const result = await ProductBarService.getProductsForBar();
        result.forEach((x) => {
            x.dataValues.id = Utils.encode(x.dataValues.id);
        });
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}

const getProduct = async (req, res, next) => {
    try {
        const productId = decodeId(req.params.product_id, 'product_id');
        const result = await ProductBarService.getProductById(productId);
        if (!result) throw new AppError('Producto no encontrado', 404);
        result.dataValues.id = Utils.encode(result.dataValues.id);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}

const createProduct = async (req, res, next) => {
    try {
        const product = decodeProductPayload(req.body);
        await ProductBarService.createProduct(product);
        res.status(200).json({ data: 'resource created successfully' });
    } catch (error) {
        next(error);
    }
}

const updateProduct = async (req, res, next) => {
    try {
        const productId = decodeId(req.params.product_id, 'product_id');
        const product = decodeProductPayload(req.body);
        delete product.id;
        await ProductBarService.updateProduct(product, productId);
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        next(error);
    }
}

const deleteProduct = async (req, res, next) => {
    try {
        const productId = decodeId(req.params.product_id, 'product_id');
        const result = await ProductBarService.delete(productId);
        res.status(200).json({ data: result });
    } catch (error) {
        next(error);
    }
}

const ProductController = {
    getProducts,
    getProductsForBar,
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct,
}
module.exports = ProductController
