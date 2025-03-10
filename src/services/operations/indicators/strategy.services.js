const Strategy = require('../../../models/operations/indicators/strategy.models');

class StrategyService {
    static async getAll() {
        try {
            const result = await Strategy.findAll({
                attributes: ['id','description','concept','type'],
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getStrategyById(id) {
        try {
            const result = await Strategy.findOne({
                where: { id },
                attributes: ['id','description','concept','type'],
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async createStrategy(data) {
        try {
            const result = await Strategy.create(data);
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async updateStrategy(data, id) {
        try {
            const result = await Strategy.update(data,id);
            return result;
        } catch (error) {
            throw error;  
        }
    }

    static async delete(id) {
        try {
            const result = await Strategy.destroy(id);
            return result;
        } catch (error) {
            throw error;
        }
    }
}

module.exports =  StrategyService;