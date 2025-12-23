const Product = require('../../../models/operations/orders/product.models');
const LaundryYacht = require('../../../models/operations/yachtRequest/laundryYacht');
const db = require('../../../utils/database');
const ProductConfiguration = require('../../../models/operations/inventory/productConfiguration');

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
                attributes: ['id', 'name', 'sku'],
                include: [{
                    model: ProductConfiguration,
                    as: 'configurations',
                    attributes: ['name'],
                }],
                order: [['name', 'ASC']]

            });
            return result;
        } catch (error) {

            throw error;
        }
    }

    static async getProductsWithConfigurations(type) {
        try {
            const result = await ProductConfiguration.findAll({
                where: { group: type, active: true },
                attributes: ['id', 'name'],
                include: [{
                    model: Product,
                    as: 'product',
                    attributes: ['id', 'name'],
                    include: [{
                        model: LaundryYacht,
                        as: 'wineries',
                        attributes: ['id', 'warehouseId']
                    }]
                }],
                order: [
                    ['name', 'ASC'], // Orden para ProductConfiguration
                    [{ model: Product, as: 'product' }, 'name', 'ASC'] // Orden para el modelo incluido Product
                ]
            });
            return result;
        } catch (error) {

            throw error;
        }
    }

    static async getProductById(id) {
        try {
            const result = await Product.findOne({
                where: { id },
                attributes: ['id', 'name', 'sku'],
                include: [{
                    model: ProductConfiguration,
                    as: 'configurations',
                }],
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async createProduct(productData) {
        try {
            const result = await Product.findOne({
                where: { sku: productData.sku }
            });

            if (result) {
                throw new Error(`El producto con el SKU: ${productData.sku} ya existe`);
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

    static async createConfiguration(data) {
        try {
            const result = await ProductConfiguration.create(data)
            return result
        } catch (error) {
            throw error;
        }
    }

    static async updateConfiguration(configurationId, data) {
        try {
            const result = await ProductConfiguration.update(data, { where: { id: configurationId } })
            return result
        } catch (error) {
            throw error;
        }
    }

    static async switchConfirguration(data, id) {
        try {
            const result = await ProductConfiguration.update(data, id);
            return result;
        } catch (error) {
            throw error;
        }
    }


    static async deleteConfiguration(configurationId) {
        try {
            const result = await ProductConfiguration.destroy({
                where: { id: configurationId }
            });
            return result
        } catch (error) {
            throw error;
        }
    }

}

module.exports = ProductService;