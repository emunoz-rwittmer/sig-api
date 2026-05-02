const ProductBar = require('../../models/bar/productBar.models');
const { Sequelize, Op } = require('sequelize');
const Product = require('../../models/operations/inventory/product.models');
const ProductConfiguration = require('../../models/operations/inventory/productConfiguration');
const db = require('../../utils/database');
const Recipe = require('../../models/bar/recipe.models');
const RecipeDetail = require('../../models/bar/recipeDetail.models');

class ProductBarService {

    static async getAll() {
        try {
            const result = await ProductBar.findAll({
                attributes: ['id', 'name', 'category', 'price', 'active', 'createdAt'],
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
                attributes: ['id', 'name'],
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
        const transaction = await db.transaction();

        try {
            const result = await ProductBar.create({
                ...data,
                type: data.category === 'Cócteles' ? 'RECIPE' : 'DIRECT'
            }, { transaction });

            if (result.type === 'RECIPE') {
                const recipe = await Recipe.create({
                    productBarId: result.id,
                    name: data.name
                }, { transaction });

                if (Array.isArray(data.recipe) && data.recipe.length > 0) {
                    const recipeDetails = data.recipe.map(x => ({
                        productId: x.productId,
                        quantity: Number(x.quantity),
                        recipeId: recipe.id,
                    }));

                    await RecipeDetail.bulkCreate(recipeDetails, { transaction });
                }
            }

            await transaction.commit();
            return result;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    static async updateProduct(data, id) {
        const transaction = await db.transaction();

        try {
            const currentProduct = await ProductBar.findOne({
                where: { id },
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
                transaction
            });

            if (!currentProduct) {
                await transaction.rollback();
                throw new Error('Producto no encontrado');
            }

            const newType = data.category === 'Cócteles' ? 'RECIPE' : 'DIRECT';
            const wasRecipe = currentProduct.type === 'RECIPE';
            const isNowRecipe = newType === 'RECIPE';

            const result = await ProductBar.update(
                {
                    ...data,
                    type: newType
                },
                {
                    where: { id },
                    transaction
                }
            );

            if (wasRecipe && !isNowRecipe) {
                const recipe = currentProduct.recipe;
                if (recipe) {
                    await RecipeDetail.destroy({
                        where: { recipeId: recipe.id },
                        transaction
                    });
                    await Recipe.destroy({
                        where: { id: recipe.id },
                        transaction
                    });
                }
            }

            if (!wasRecipe && isNowRecipe) {
                const recipe = await Recipe.create({
                    productBarId: id,
                    name: data.name
                }, { transaction });

                if (Array.isArray(data.recipe) && data.recipe.length > 0) {
                    const recipeDetails = data.recipe.map(x => ({
                        productId: x.productId,
                        quantity: Number(x.quantity),
                        recipeId: recipe.id,
                    }));

                    await RecipeDetail.bulkCreate(recipeDetails, { transaction });
                }
            }

            if (wasRecipe && isNowRecipe) {
                const recipe = currentProduct.recipe;
                if (recipe) {
                    await Recipe.update(
                        { name: data.name },
                        { where: { id: recipe.id }, transaction }
                    );

                    if (Array.isArray(data.recipe)) {
                        await RecipeDetail.destroy({
                            where: { recipeId: recipe.id },
                            transaction
                        });

                        if (data.recipe.length > 0) {
                            const recipeDetails = data.recipe.map(x => ({
                                productId: x.productId,
                                quantity: Number(x.quantity),
                                recipeId: recipe.id,
                            }));

                            await RecipeDetail.bulkCreate(recipeDetails, { transaction });
                        }
                    }
                }
            }

            await transaction.commit();
            return result;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }


    static async delete(id) {
        try {
            const result = await ProductBar.destroy({
                where: { id }
            });
            if (result) {
                return 'resource deleted successfully'
            }
        } catch (error) {
            throw error;
        }
    }

}

module.exports = ProductBarService;