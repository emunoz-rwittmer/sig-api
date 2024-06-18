const Captains = require('../../models/catalogs/captains.models');
const Yachts = require('../../models/catalogs/yacht.models');
const CaptainYacht = require('../../models/catalogs/captainYacht.models');
const { Op } = require("sequelize");

class CaptainService {
    static async getAll() {
        try {
            const result = await Captains.findAll({
                attributes: ['id', 'first_name', 'last_name', 'email', 'cell_phone', 'active'],
                include: [{
                    model: CaptainYacht,
                    as: 'yachts',
                    attributes: ['id'],
                    include: [{
                        model: Yachts,
                        as: 'yacht_captain'
                    }]
                }]
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getCaptainById(id) {
        try {
            const result = await Captains.findOne({
                where: { id },
                attributes: ['first_name', 'last_name', 'email', 'cell_phone', 'active']
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getCaptainsById(arrayIds) {
        try {
            const result = await Captains.findAll({
                where: { id: {
                    [Op.in]: arrayIds
                } },
                attributes: ['id','first_name','last_name','email','cell_phone','active']
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async createCaptain(captain) {
        try {
            const result = await Captains.create(captain);
            return result;
        } catch (error) {
            throw error;

        }
    }

    static async updateCaptain(captain, id) {
        try {
            const result = await Captains.update(captain, id);
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async delete(captainId) {
        try {
            const relations = await CaptainYacht.destroy({
                where: { captainId }
            });
            const result = await Captains.destroy({
                where: { id: captainId }
            });
            if(relations && result){
                return 'resource deleted successfully'
            }
        } catch (error) {
            throw error;
        }
    }

    // CAPTAIN - YACHT 

    static async getAllYachts(id) {
        try {
            const result = await CaptainYacht.findAll({
                where: { captainId: id },
                attributes: ['id'],
                include: {
                    model: Yachts,
                    as: 'yacht_captain',
                    attributes: ['name'],
                }
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async assingYacht(data) {
        try {
            const result = await CaptainYacht.create(data);
            return result;
        } catch (error) {
            throw error;

        }
    }

    static async deleteYacht(id) {
        try {
            const result = await CaptainYacht.destroy(id);
            return result;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = CaptainService;