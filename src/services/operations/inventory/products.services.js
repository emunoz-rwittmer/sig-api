const { model } = require('mongoose');
const Product = require('../../../models/operations/orders/product.models');
const db = require('../../../utils/database');
const productCalculations = require('../../../models/operations/orders/productCalculations.models');

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
                include:[{
                    model:  productCalculations,
                    as : 'configurations',
                    attributes:{
                        exclude: ['createdAt','updatedAt']
                    }
                }],
                order:[['name', 'ASC']]
                
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
                attributes: ['id', 'name', 'sku']
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
                throw { message: `El producto con el SKU: ${productData.sku} ya existe`};
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

    static async createConfiguration(configuration) {
        try {
            const result = await productCalculations.create(configuration);
            return result;
        } catch (error) {
            throw error;

        }
    }

    static async updateConfiguration(configurationId, id) {
        try {
            const result = await productCalculations.update(configurationId, id);
            return result;
        } catch (error) {
            throw error;
        }
    }

}

module.exports = ProductService;