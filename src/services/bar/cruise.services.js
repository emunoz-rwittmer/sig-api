const Cruise = require('../../models/bar/cruises.models');
const Yacht = require('../../models/catalogs/yacht.models');

class CruiseService {
    static async getAll() {
        try {
            const result = await Cruise.findAll({
                include: [
                    {
                        model: Yacht,
                        as: 'yacht'
                    }],
                order:[['startDate', 'DESC']]
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getCruiseById(id) {
        try {
            const result = await Cruise.findOne({
                where: { id },
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getCruiseByName(name) {
        try {
            const result = await Cruise.findOne({
                where: { name },
                attributes: ['logo'],
                include: [
                    {
                        model: Yacht,
                        as: 'yacht'
                    }]
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async createCruise(data) {
        try {
            const result = await Cruise.create(data);
            return result;
        } catch (error) {
            throw error;

        }
    }

    static async updateCruise(data, id) {
        try {
            const result = await Cruise.update(data, id);
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async delete(id) {
        try {
            const result = await Cruise.destroy(id);
            return result;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = CruiseService;