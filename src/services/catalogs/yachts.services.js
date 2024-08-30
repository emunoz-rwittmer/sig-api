const Yachts = require('../../models/catalogs/yacht.models');
const Roles = require('../../models/catalogs/roles.models');
const { Op, where } = require("sequelize");
const Company = require('../../models/catalogs/company.models');



class YachtService {
    static async getAll() {
        try {
            const result = await Yachts.findAll({
                attributes: ['id','name','code','color','companyId','active'],
                include:{
                    model: Company,
                    as: 'company',
                    attributes:['name']
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
                attributes: ['id','name','code','color','companyId','active']
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
            const result = await Yachts.update(yacht,id);
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

module.exports =  YachtService;