const Impact = require('../../../models/operations/indicators/impact.models');

class ImpactService {
    static async getAll() {
        try {
            const result = await Impact.findAll({
                attributes: ['id','level','description','concept','color','type'],
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getImpactById(id) {
        try {
            const result = await Impact.findOne({
                where: { id },
                attributes: ['id','level','description','concept','color','type'],
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async createImpact(data) {
        try {
            const result = await Impact.create(data);
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async updateImpact(data, id) {
        try {
            const result = await Impact.update(data,id);
            return result;
        } catch (error) {
            throw error;  
        }
    }

    static async delete(id) {
        try {
            const result = await Impact.destroy(id);
            return result;
        } catch (error) {
            throw error;
        }
    }
}

module.exports =  ImpactService;