const Company = require('../../models/catalogs/company.models');
const Departaments = require('../../models/catalogs/departament.models');
const Positions = require('../../models/catalogs/positions.models');
const Staff = require('../../models/catalogs/staff.models');
const StaffCompany = require('../../models/catalogs/staffCompany.models');
const ReadRegulation = require('../../models/rrhh/readRegulation.models');
const Regulation = require('../../models/rrhh/regulation.models');

class RegulationService {
    static async getAll(companyId) {
        try {
            const result = await Regulation.findAll({
                where: { companyId },
                attributes: ['id', 'name', 'file'],
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

    static async getAllStaffsRegulations(companyId) {
        try {
            const result = await StaffCompany.findAll({
                where: { companyId },
                include: [
                    {
                        model: Staff,
                        as: 'staff',
                        attributes: ['first_name', 'last_name', 'email', 'cell_phone', 'roleId', 'departamentId', 'positionId', 'active'],
                        include: [
                            {
                                model: ReadRegulation,
                                as: 'aceptacion_reglamentos',
                                include:
                                    [
                                        {
                                            model: Regulation,
                                            as: 'reglamento',
                                            attributes: ['id', 'name']
                                        }
                                    ]
                            },
                            {
                                model: Departaments,
                                as: 'staff_departament',
                                attributes: ['id', 'name'],
                            }, {
                                model: Positions,
                                as: 'staff_position',
                                attributes: ['id', 'name'],
                            }],
                    }   
                ],
                order: [[{ model: Staff, as: 'staff' }, 'name', 'ASC']]
            });

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