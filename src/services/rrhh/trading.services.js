
const Trading = require('../../models/rrhh/trading.models');

class TradingService {
    static async getAll() {
        try {
            const result = await Trading.findAll({
                attributes: ['id', 'name', 'url', 'type', 'createdAt'],
            });

            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getTradingById(id) {
        try {
            const result = await Trading.findOne({
                where: { id },
                attributes: ['id', 'url', 'type', 'createdAt']
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async createTrading(data) {
        try {
            const result = await Trading.create(data);
            return result;
        } catch (error) {
            throw error;

        }
    }

    static async updateTrading(data, id) {
        try {
            const result = await Trading.update(data, id);
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async delete(id) {
        try {
            const result = await Trading.destroy(id);
            return result;
        } catch (error) {
            throw error;
        }
    }

}

module.exports = TradingService;