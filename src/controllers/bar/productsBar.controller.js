const ProductBarService = require('../../services/bar/productsBar.services');
const Utils = require('../../utils/Utils');

const getProducts = async (req, res) => {
    try {
        const result = await ProductBarService.getAll();
        const currentPlain = result.map(r => r.get({ plain: true }));
        if (currentPlain instanceof Array) {
            currentPlain.map((x) => {
                x.id = Utils.encode(x.id)
                x.productId = Utils.encode(x.productId) || null
                if (x.recipe && x.recipe.recipe_details) {
                    x.recipe.recipe_details = x.recipe.recipe_details.map(d => {
                        d.productId = Utils.encode(d.productId)
                        d.recipeId = Utils.encode(d.recipeId)
                        return d
                    })
                }
            });
        }
        res.status(200).json(currentPlain);
    } catch (error) {
        res.status(400).json(error.message)
    }
}

const getProductsForBar = async (req, res) => {
    try {
        const result = await ProductBarService.getProductsForBar();
        if (result instanceof Array) {
            result.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
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
        const result = await ProductBarService.getProductById(productId);
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
        if (product.productId) product.productId = Utils.decode(product.productId);
        if (product.recipe.length) {
            product.recipe.map(x => (
                x.productId = Utils.decode(x.productId)
            ))
        }

        await ProductBarService.createProduct(product);
        res.status(200).json({ data: 'resource created successfully' });

    } catch (error) {
        console.log(error)
        res.status(400).json(error.message);
    }
}

const updateProduct = async (req, res) => {
    try {
        const productId = Utils.decode(req.params.product_id);
        const product = req.body;
        if (product.productId) product.productId = Utils.decode(product.productId);
        if (product.recipe.length) {
            product.recipe.map(x => (
                x.productId = Utils.decode(x.productId)
            ))
        }
        delete product.id
        await ProductBarService.updateProduct(product, productId);
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        res.status(400).json(error.message);
    }
}

const deleteProduct = async (req, res) => {
    try {
        const productId = Utils.decode(req.params.product_id);
        const result = await ProductBarService.delete(productId);
        res.status(200).json({ data: result })
    } catch (error) {

        res.status(400).json(error.message);
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