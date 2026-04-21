const ProductBar = require('../../models/bar/productBar.models');
const { Sequelize, Op } = require('sequelize');

class ProductBarService {

    static async getAll() {
        try {
            const result = await ProductBar.findAll({
                attributes: ['id', 'name', 'category', 'price', 'active', 'createdAt'],
                order: [['name', 'ASC']]

            });
            return result;
        } catch (error) {

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
        try {
            const result = await ProductBar.create(data);
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async updateProduct(data, id) {
        try {
            const result = await ProductBar.update(data,
                {
                    where: { id },
                }
            );
            return result
        } catch (error) {
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