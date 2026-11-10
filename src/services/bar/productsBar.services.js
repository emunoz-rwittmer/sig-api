const ProductBar = require('../../models/bar/productBar.models');
const { Sequelize, Op } = require('sequelize');
const Product = require('../../models/operations/inventory/product.models');
const ProductConfiguration = require('../../models/operations/inventory/productConfiguration');
const db = require('../../utils/database');
const Recipe = require('../../models/bar/recipe.models');
const RecipeDetail = require('../../models/bar/recipeDetail.models');
const AppError = require('../../errors/AppError');
const { CUSTOM_COCKTAIL, CUSTOM_COCKTAIL_PRICE } = require('../../utils/customCocktail');

class ProductBarService {

    static async getAll() {
        try {
            const result = await ProductBar.findAll({
                attributes: ['id', 'name', 'category', 'productId', 'price', 'active', 'createdAt'],
                // El producto ancla de los cócteles personalizados no es del catálogo: no se lista ni se edita.
                where: { name: { [Op.ne]: CUSTOM_COCKTAIL.name } },
                include: [
                    {
                        model: Recipe,
                        as: 'recipe',
                        include: [
                            {
                                model: RecipeDetail,
                                as: 'recipe_details'
                            }
                        ]
                    }
                ],
                order: [['name', 'ASC']]

            });
            return result;
        } catch (error) {

            throw error;
        }
    }

    static async getProductsForBar() {
        try {
            const BAR_CONFIG_NAMES = [
                'Bebidas Bar',
                'Licores',
                'Vinos tintos',
                'Vinos blancos'
            ];

            const products = await Product.findAll({
                attributes: ['id', 'name', 'unit'],
                include: [
                    {
                        model: ProductConfiguration,
                        as: 'configurations',
                        attributes: ['id', 'name'],
                        where: {
                            name: BAR_CONFIG_NAMES
                        },
                        required: true
                    }
                ],
                order: [['name', 'ASC']]
            });

            return products;
        } catch (error) {
            console.error('Error in getProductsForBar:', error);
            throw error;
        }
    }
    /** true si todos los ids son ingredientes de bar (los mismos que ofrece getProductsForBar). */
    static async areBarIngredients(ids) {
        const products = await ProductBarService.getProductsForBar();
        const allowed = new Set(products.map((product) => product.id));
        return ids.every((id) => allowed.has(id));
    }

    /** Producto ancla de los cócteles armados por el barman; se crea la primera vez. */
    static async getCustomCocktail() {
        const [product] = await ProductBar.findOrCreate({
            where: { name: CUSTOM_COCKTAIL.name },
            defaults: { ...CUSTOM_COCKTAIL, price: CUSTOM_COCKTAIL_PRICE, type: 'RECIPE', active: false },
        });
        return product;
    }

    static async getProductById(id) {
        try {
            const result = await ProductBar.findOne({
                where: { id },
                attributes: ['id', 'name', 'category', 'price', 'active', 'createdAt'],
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async createProduct(data) {
        return db.transaction(async (transaction) => {
            const result = await ProductBar.create({
                ...data,
                type: data.category === 'Cócteles' ? 'RECIPE' : 'DIRECT'
            }, { transaction });

            if (result.type === 'RECIPE') {
                const recipe = await Recipe.create({
                    productBarId: result.id,
                    name: data.name
                }, { transaction });

                await ProductBarService.replaceRecipeDetails(recipe.id, data.recipe, transaction, false);
            }

            return result;
        });
    }

    static async replaceRecipeDetails(recipeId, ingredients, transaction, clearExisting = true) {
        if (clearExisting) {
            await RecipeDetail.destroy({ where: { recipeId }, transaction });
        }
        if (!Array.isArray(ingredients) || ingredients.length === 0) return;

        await RecipeDetail.bulkCreate(
            ingredients.map(x => ({
                productId: x.productId,
                quantity: Number(x.quantity),
                recipeId,
            })),
            { transaction }
        );
    }

    static async updateProduct(data, id) {
        return db.transaction(async (transaction) => {
            const currentProduct = await ProductBar.findOne({
                where: { id },
                include: [
                    {
                        model: Recipe,
                        as: 'recipe',
                        include: [{ model: RecipeDetail, as: 'recipe_details' }]
                    }
                ],
                transaction
            });

            if (!currentProduct) throw new AppError('Producto no encontrado', 404);

            const newType = data.category === 'Cócteles' ? 'RECIPE' : 'DIRECT';
            const wasRecipe = currentProduct.type === 'RECIPE';
            const isNowRecipe = newType === 'RECIPE';

            const result = await ProductBar.update(
                { ...data, type: newType },
                { where: { id }, transaction }
            );

            const recipe = currentProduct.recipe;

            if (wasRecipe && !isNowRecipe && recipe) {
                await RecipeDetail.destroy({ where: { recipeId: recipe.id }, transaction });
                await Recipe.destroy({ where: { id: recipe.id }, transaction });
            }

            if (!wasRecipe && isNowRecipe) {
                const newRecipe = await Recipe.create({
                    productBarId: id,
                    name: data.name
                }, { transaction });

                await ProductBarService.replaceRecipeDetails(newRecipe.id, data.recipe, transaction, false);
            }

            if (wasRecipe && isNowRecipe && recipe) {
                await Recipe.update({ name: data.name }, { where: { id: recipe.id }, transaction });
                await ProductBarService.replaceRecipeDetails(recipe.id, data.recipe, transaction);
            }

            return result;
        });
    }


    static async delete(id) {
        const result = await ProductBar.destroy({ where: { id } });
        if (!result) throw new AppError('Producto no encontrado', 404);
        return 'resource deleted successfully';
    }

}

module.exports = ProductBarService;