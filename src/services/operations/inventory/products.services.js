const Product = require('../../../models/operations/orders/product.models');
const productCalculations = require('../../../models/operations/orders/productCalculations.models');
const PlacesYacht = require('../../../models/operations/yachtRequest/placesYacht');
const db = require('../../../utils/database');

class ProductService {
    static async findProduct(sku) {
        try {
            const result = await Product.findOne({ where: { sku } });
            return result
        } catch (error) {
            throw error;
        }
    }

    static async getAll() {
        try {
            const result = await Product.findAll({
                attributes: ['id', 'name', 'sku', 'type'],
                include: [{
                    model: PlacesYacht,
                    as: 'configurations',
                    attributes: ['name'],
                }],
                order: [['name', 'ASC']]

            });
            return result;
        } catch (error) {
            console.log(error)
            throw error;
        }
    }

    static async getProductsWithConfigurations() {
        try {
            const result = await PlacesYacht.findAll({
                attributes: ['id', 'name'],
                include: [{
                    model: Product,
                    as: 'product',
                    attributes: ['id','name'],
                },{
                    model: productCalculations,
                    as: 'configuration',
                    attributes: [
                        'id',
                        'sixteenPax',
                        'eighteenPax',
                        'twentyPax',
                        'twentyTwoPax',
                        'twentyFourPax',
                    ]
                }],
                order: [['name', 'ASC']]

            });
            return result;
        } catch (error) {
            console.log(error)
            throw error;
        }
    }

    static async getProductById(id) {
        try {
            const result = await Product.findOne({
                where: { id },
                attributes: ['id', 'name', 'sku', 'type'],
                include: [{
                    model: PlacesYacht,
                    as: 'configurations',
                    attributes: ['id', 'name'],
                    include: [{
                        model: productCalculations,
                        as: 'configuration',
                        attributes: [
                            'id',
                            'sixteenPax',
                            'eighteenPax',
                            'twentyPax',
                            'twentyTwoPax',
                            'twentyFourPax',
                        ]
                    }]
                }],
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async createProduct(productData) {
        try {
            const existingProduct = await Product.findOne({
                where: { sku: productData.sku }
            });

            if (existingProduct) {
                throw { message: `El producto con el SKU: ${productData.sku} ya existe` };
            }
            const newProduct = await Product.create(productData);
            return newProduct;

        } catch (error) {
            throw error;
        }
    }


    static async updateProduct(product, id) {
        try {
            const result = await Product.update(product, id);
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async delete(productId) {
        try {
            const result = await Product.destroy({
                where: { id: productId }
            });
            if (result) {
                return 'resource deleted successfully'
            }
        } catch (error) {
            throw error;
        }
    }

    static async createConfiguration(transactionData) {
        const { placeYacht, configuration } = transactionData;
        const transaction = await db.transaction();
        try {
            const newConfiguration = await productCalculations.create(configuration, { transaction })
            await PlacesYacht.create({
                ...placeYacht,
                configurationId: newConfiguration.id
            },
                { transaction })

            await transaction.commit();
            return {
                message: 'resource created successfully',
            };
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    static async updateConfiguration(transactionData) {
        const { placeYacht, configuration } = transactionData;
        const transaction = await db.transaction();
        try {
            await productCalculations.update(configuration, { where: { id: configuration.id } }, { transaction })
            await PlacesYacht.update(placeYacht, { where: { id: placeYacht.id } }, { transaction })

            await transaction.commit();
            return {
                message: 'resource updated successfully',
            };
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    static async deleteConfiguration(transactionData) {
        const { placeYachtId, configurationId } = transactionData;
        const transaction = await db.transaction();
        try {
            await productCalculations.destroy({ where: { id: configurationId } }, { transaction })
            await PlacesYacht.destroy({ where: { id: placeYachtId } }, { transaction })

            await transaction.commit();
            return {
                message: 'resource deleted successfully',
            };
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

}

module.exports = ProductService;