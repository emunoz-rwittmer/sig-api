const Administratives = require('../../models/catalogs/administratives.models');
const Yachts = require('../../models/catalogs/yacht.models');
const { Op } = require("sequelize");

class AdministrativeService {

    static async getAdministrativesByCompany(company) {
        try {
            const result = await Administratives.findAll({
                where: {company},
                attributes: ['id','first_name','last_name','email','cell_phone','company','active']
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getAdministrativeById(id) {
        try {
            const result = await Administratives.findOne({
                where: { id },
                attributes: ['first_name', 'last_name', 'email', 'cell_phone','company', 'active']
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async createAdministrative(Administrative) {
        try {
            const result = await Administratives.create(Administrative);
            return result;
        } catch (error) {
            throw error;

        }
    }

    static async updateAdministrative(Administrative, id) {
        try {
            const result = await Administratives.update(Administrative, id);
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async delete(administrativeId) {
        try {
            const result = await Administratives.destroy({
                where: { id: administrativeId }
            });
            if(result){
                return 'resource deleted successfully'
            }
        } catch (error) {
            throw error;
        }
    }
}

module.exports = AdministrativeService;