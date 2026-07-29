const Company = require('../../models/catalogs/company.models');
const Departaments = require('../../models/catalogs/departament.models');
const Positions = require('../../models/catalogs/positions.models');
const Staff = require('../../models/catalogs/staff.models');
const StaffCompany = require('../../models/catalogs/staffCompany.models');
const StaffReadRegulation = require('../../models/rrhh/readRegulation.models');
const Regulation = require('../../models/rrhh/regulation.models');
const db = require('../../utils/database');

class RegulationService {
    static async getAll(companyId) {
        try {
            const result = await Regulation.findAll({
                where: { companyId },
                attributes: ['id', 'name', 'file', 'createdAt'],
                include: [{
                    model: StaffReadRegulation,
                    as: 'reads'
                }]
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

    static async getRegulationStaffById(id) {
        try {
            const result = await StaffReadRegulation.findOne({
                where: { id },
                attributes: ['id', 'read'],
                include:
                    [
                        {
                            model: Regulation,
                            as: 'regulation',
                            attributes: ['id', 'name', 'file'],
                        }
                    ]
            });

            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getAllRegulationsBystaff(staffId) {
        try {
            const result = await StaffReadRegulation.findAll({
                where: { staffId },
                attributes: ['id', 'read', 'createdAt'],
                include:
                    [
                        {
                            model: Regulation,
                            as: 'regulation',
                            attributes: ['id', 'name', 'file'],
                            include:
                                [
                                    {
                                        model: Company,
                                        as: 'company',
                                        attributes: ['name']
                                    }
                                ]

                        }
                    ]
            });
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
                                model: StaffReadRegulation,
                                as: 'regulation_reads',
                                include:
                                    [
                                        {
                                            model: Regulation,
                                            as: 'regulation',
                                            attributes: ['id', 'name'],
                                            where: { companyId }
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
                order: [[{ model: Staff, as: 'staff' }, 'last_name', 'ASC']],
                distinct: true // <-- esto es importante
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
                attributes: ['id', 'name', 'file', 'createdAt']
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async createRegulation(data) {
        const transaction = await db.transaction();
        try {
            const result = await Regulation.create(data, { transaction });

            const staffCompany = await StaffCompany.findAll({
                where: { companyId: data.companyId },
            });

            if (result && staffCompany.length > 0) {
                const readRegulations = staffCompany.map(staff => ({
                    staffId: staff.staffId,
                    regulationId: result.id,
                    read: false,
                }));

                await StaffReadRegulation.bulkCreate(readRegulations, { transaction });
            }

            await transaction.commit();
            return result;
        } catch (error) {
            await transaction.rollback();
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
        const transaction = await db.transaction();
        try {

            await StaffReadRegulation.destroy({
                where: { regulationId: id },
                transaction
            });

            const result = await Regulation.destroy({
                where: { id },
                transaction
            });

            await transaction.commit();
            return result;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }


    static async readAceptRegulation(id) {
        try {
            const result = await StaffReadRegulation.findOne({ where: { id } });
            if (result) {
                await result.update({ read: true })
            }
            return result;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = RegulationService;