const Probability = require('../../../models/operations/indicators/probability.models');

class ProbabilityService {
    static async getAll() {
        try {
            const result = await Probability.findAll({
                attributes: ['id','level','description','concept','color','frequency'],
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getProbabilityById(id) {
        try {
            const result = await Probability.findOne({
                where: { id },
                attributes: ['id','level','description','concept','color','frequency'],
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async createProbability(data) {
        try {
            const result = await Probability.create(data);
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async updateProbability(data, id) {
        try {
            const result = await Probability.update(data,id);
            return result;
        } catch (error) {
            throw error;  
        }
    }

    static async delete(id) {
        try {
            const result = await Probability.destroy(id);
            return result;
        } catch (error) {
            throw error;
        }
    }
}

module.exports =  ProbabilityService;