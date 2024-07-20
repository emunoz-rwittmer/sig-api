const Positions = require('../../models/catalogs/positions.models');

class PositionService {
    static async getAll() {
        try {
            const result = await Positions.findAll({
                attributes: ['id','name']
            });
            return result;
        } catch (error) {
            throw error;
        }
    }
}

module.exports =  PositionService;