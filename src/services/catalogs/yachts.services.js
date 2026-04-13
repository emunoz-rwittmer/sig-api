const db = require('../../utils/database');

const Yachts = require('../../models/catalogs/yacht.models');
const Company = require('../../models/catalogs/company.models');
const YachtParts = require('../../models/catalogs/yachtParts.models');
const MaintenanceRules = require('../../models/catalogs/maintenanceRules.models');
const MaintenanceRulesPart = require('../../models/catalogs/maintenanceRulesPart.models');



class YachtService {
    static async getAll() {
        try {
            const result = await Yachts.findAll({
                attributes: ['id', 'name', 'code', 'color', 'companyId', 'email', 'active'],
                include: {
                    model: Company,
                    as: 'company',
                    attributes: ['name']
                }
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getYachtById(id) {
        try {
            const result = await Yachts.findOne({
                where: { id },
                attributes: ['id', 'name', 'code', 'color', 'companyId', 'email', 'active']
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async createYacht(yacht) {
        try {
            const result = await Yachts.create(yacht);
            return result;
        } catch (error) {
            throw error;

        }
    }

    static async updateYacht(yacht, id) {
        try {
            const result = await Yachts.update(yacht, id);
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async delete(id) {
        try {
            const result = await Yachts.destroy(id);
            return result;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = YachtService;