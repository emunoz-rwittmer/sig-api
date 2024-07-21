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

    static async getPositionById(id) {
        try {
            const result = await Positions.findOne({
                where: { id },
                attributes: ['id','name']
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getPositionsById(arrayIds) {
        try {
            const result = await Positions.findAll({
                where: { id: {
                    [Op.in]: arrayIds
                } },
                attributes: ['id','name']
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async createPosition(position) {
        try {
            const result = await Positions.create(position);
            return result;
        } catch (error) {
            throw error;

        }
    }

    static async updatePosition(position, id) {
        try {
            const result = await Positions.update(position, id);
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async delete(positionId) {
        try {
            const result = await Positions.destroy({
                where: { id: positionId }
            });
            if(result){
                return 'resource deleted successfully'
            }
        } catch (error) {
            throw error;
        }
    }
}

module.exports =  PositionService;