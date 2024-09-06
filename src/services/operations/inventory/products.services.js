const Product = require('../../../models/operations/orders/product.models');
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

}

module.exports = ProductService;