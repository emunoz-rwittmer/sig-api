const Level = require('../../../models/operations/indicators/levels.models');

class LevelService {
    static async getAll() {
        try {
            const result = await Level.findAll({
                attributes: ['id','level','description','concept','color','type'],
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getLevelById(id) {
        try {
            const result = await Level.findOne({
                where: { id },
                attributes: ['id','level','description','concept','color','type'],
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async createLevel(data) {
        try {
            const result = await Level.create(data);
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async updateLevel(data, id) {
        try {
            const result = await Level.update(data,id);
            return result;
        } catch (error) {
            throw error;  
        }
    }

    static async delete(id) {
        try {
            const result = await Level.destroy(id);
            return result;
        } catch (error) {
            throw error;
        }
    }
}

module.exports =  LevelService;