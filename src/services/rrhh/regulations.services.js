const Company = require('../../models/catalogs/company.models');
const Staff = require('../../models/catalogs/staff.models');
const StaffCompany = require('../../models/catalogs/staffCompany.models');
const Regulation = require('../../models/rrhh/regulation.models');

class RegulationService {
    static async getAll(companyId) {
        try {
            const result = await Regulation.findAll({
                where: { companyId },
                attributes: ['id', 'name', 'file'],
                // include: [
                //     {
                //         model: Company,
                //         attributes: ['id', 'name'], // No traemos las respuestas, solo las contamos
                //         as: 'companie',
                //         include: [
                //             {
                //                 model: StaffCompany,
                //                 attributes: ['id'],
                //                 as: 'personal',
                //                 include: [
                //                     {
                //                         model: Staff,
                //                         attributes: ['id'],
                //                         as: 'staff'
                //                     }
                //                 ]
                //             }
                //         ]
                //     },
                // ],
            });

            const count = await StaffCompany.count({
                where: { companyId }
            });

            result.map(res => (
                res.dataValues.count = count
            ))

            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getRegulationById(id) {
        try {
            const result = await Regulation.findOne({
                where: { id },
                attributes: ['id', 'file']
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async createRegulation(data) {
        try {
            const result = await Regulation.create(data);
            return result;
        } catch (error) {
            throw error;

        }
    }

    static async updateRegulation(data, id) {
        try {
            const result = await Regulation.update(data, id);
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async delete(id) {
        try {
            const result = await Regulation.destroy(id);
            return result;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = RegulationService;