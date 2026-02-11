const Staff = require('../../models/catalogs/staff.models');
const Yachts = require('../../models/catalogs/yacht.models');
const Positions = require('../../models/catalogs/positions.models');
const Departaments = require('../../models/catalogs/departament.models')
const { Op } = require("sequelize");
const Roles = require('../../models/catalogs/roles.models');
const Company = require('../../models/catalogs/company.models');
const StaffCompany = require('../../models/catalogs/staffCompany.models');
const { model } = require('mongoose');
const db = require('../../utils/database');
const Regulation = require('../../models/rrhh/regulation.models');
const { forEach } = require('mathjs');
const StaffReadRegulation = require('../../models/rrhh/readRegulation.models');

class Staffervice {
    static async getAll() {
        try {
            const result = await Staff.findAll({
                order: [
                    ['last_name', 'ASC']
                ],
                include: [
                    {
                        model: StaffCompany,
                        as: 'companies',
                        attributes: ['id'],
                        include: [{
                            model: Company,
                            as: 'company',
                            include: [{
                                model: Yachts,
                                as: 'yacht'
                            }]
                        }]
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
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getStaffByEmail(email) {
        try {
            const result = await Staff.findOne({ where: { email } });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getStaffsByFilters(company, departamentId, positionId) {
        try {

            const where = {};

            if (company) {
                where.company = company;
            }
            if (departamentId) {
                where.departamentId = departamentId;
            }
            if (positionId) {
                where.positionId = positionId;
            }

            const result = await Staff.findAll({
                where,
                attributes: ['id', 'first_name', 'last_name', 'email', 'cell_phone', 'active'],
                order: [
                    ['last_name', 'ASC']
                ],
                include: [{
                    model: StaffCompany,
                    as: 'companies',
                    attributes: ['id'],
                    include: [{
                        model: Company,
                        as: 'company',
                        include: [{
                            model: Yachts,
                            as: 'yacht',
                            ...(yachtId && { where: { id: yachtId } }) // aquí va el filtro por yachtId
                        }]
                    }]
                }, {
                    model: Departaments,
                    as: 'staff_departament',
                    attributes: ['id', 'name'],
                }, {
                    model: Positions,
                    as: 'staff_position',
                    attributes: ['id', 'name'],
                }],
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getEvaluators(search) {
        try {
            const result = await Staff.findAll({
                where: {
                    positionId: { [Op.ne]: search },
                    active: true
                },
                attributes: ['id', 'first_name', 'last_name', 'email', 'cell_phone', 'active'],
                order: [
                    ['last_name', 'ASC']
                ],
                include: [{
                    model: Positions,
                    as: 'staff_position',
                    attributes: ['id', 'name'],
                }]
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getEvaluatorsByFilters(search, yachtId, departamentId, positionId) {
        try {

            console.log(search, yachtId, departamentId, positionId)


            const where = { active: true };

            if (departamentId) {
                console.log('estoy qui')
                where.departamentId = departamentId;
            }

            if (positionId) {
                where.positionId = positionId;
            } else {
                where.positionId = { [Op.ne]: search };
            }

            const yachtInclude = {
                model: StaffCompany,
                as: 'companies',
                attributes: ['id'],
                required: !!yachtId, // si hay filtro de yate, que sea INNER JOIN
                include: [{
                    model: Company,
                    as: 'company',
                    required: !!yachtId,
                    include: [{
                        model: Yachts,
                        as: 'yacht',
                        required: !!yachtId,
                        ...(yachtId && { where: { id: yachtId } })
                    }]
                }]
            };

            const result = await Staff.findAll({
                where,
                attributes: ['id', 'first_name', 'last_name', 'email', 'cell_phone', 'active'],
                order: [['last_name', 'ASC']],
                include: [
                    {
                        model: Positions,
                        as: 'staff_position',
                        attributes: ['id', 'name'],
                    },
                    yachtInclude
                ]
            });

            return result;
        } catch (error) {
            throw error;
        }
    }


    static async getEvaluatorsById(arrayIds) {
        try {
            const result = await Staff.findAll({
                where: {
                    id: {
                        [Op.in]: arrayIds
                    }
                },
                attributes: ['id', 'first_name', 'last_name', 'email', 'cell_phone', 'active']
            });
            return result;
        } catch (error) {
            throw error;
        }
    }


    static async getEvaluateds(search) {
        try {
            const result = await Staff.findAll({
                where: {
                    positionId: search,
                    active: true
                },
                attributes: ['id', 'first_name', 'last_name', 'email', 'cell_phone', 'active'],
                order: [
                    ['last_name', 'ASC']
                ],
                include: [{
                    model: Positions,
                    as: 'staff_position',
                    attributes: ['id', 'name'],
                }]
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getEvaluatedsByFilters(positionId, yachtId) {
        try {

            const where = { active: true };

            if (positionId) {
                where.positionId = positionId;
            }

            const yachtInclude = {
                model: StaffCompany,
                as: 'companies',
                attributes: ['id'],
                required: !!yachtId,
                include: [{
                    model: Company,
                    as: 'company',
                    required: !!yachtId,
                    include: [{
                        model: Yachts,
                        as: 'yacht',
                        required: !!yachtId,
                        ...(yachtId && { where: { id: yachtId } })
                    }]
                }]
            };

            const result = await Staff.findAll({
                where,
                attributes: ['id', 'first_name', 'last_name', 'email', 'cell_phone', 'active'],
                order: [
                    ['last_name', 'ASC']
                ],
                include: [{
                    model: Positions,
                    as: 'staff_position',
                    attributes: ['id', 'name'],
                },
                    yachtInclude
                ]
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getEvaluatedsById(arrayIds) {
        try {
            const result = await Staff.findAll({
                where: {
                    id: {
                        [Op.in]: arrayIds
                    }
                },
                attributes: ['id', 'first_name', 'last_name', 'email', 'cell_phone', 'active']
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getStaffById(id) {
        try {
            const result = await Staff.findOne({
                where: { id },
                attributes: ['first_name', 'last_name', 'email', 'ci_staff', 'cell_phone', 'date_entry', 'description', 'roleId', 'departamentId', 'positionId', 'active'],
                include: [
                    {
                        model: StaffCompany,
                        as: 'companies',
                        attributes: ['id'],
                        include: [
                            {
                                model: Company,
                                as: 'company',
                                attributes: ['name', 'logo']
                            }
                        ]
                    },
                    {
                        model: Departaments,
                        as: 'staff_departament',
                        attributes: ['id', 'name'],
                    }, {
                        model: Roles,
                        as: 'rol',
                        attributes: ['id', 'name'],
                    }, {
                        model: Positions,
                        as: 'staff_position',
                        attributes: ['id', 'name'],
                    }],
            });

            return result;
        } catch (error) {
            throw error;
        }
    }

    static async createStaff(staffData) {
        const transaction = await db.transaction();

        try {
            const { companyId = [], ...staff } = staffData;

            const newStaff = await Staff.create(staff, { transaction });

            if (companyId.length) {

                const relations = companyId.map(company => ({
                    staffId: newStaff.id,
                    companyId: company
                }));

                await StaffCompany.bulkCreate(relations, { transaction });

                const regulations = await Regulation.findAll({
                    where: { companyId },
                    transaction
                });

                if (regulations.length) {
                    const readRegulations = regulations.map(reg => ({
                        staffId: newStaff.id,
                        regulationId: reg.id,
                        read: false,
                    }));

                    await StaffReadRegulation.bulkCreate(readRegulations, { transaction });
                }
            }

            await transaction.commit();
            return newStaff;

        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    static async updateStaff(staffData, id) {
        const transaction = await db.transaction();

        try {
            const { companyId, ...staff } = staffData;

            await Staff.update(staff, {
                where: { id },
                transaction
            });

            await StaffCompany.destroy({
                where: { staffId: id },
                transaction
            });

            if (companyId?.length) {
                const relations = companyId.map(company => ({
                    staffId: id,
                    companyId: company
                }));

                await StaffCompany.bulkCreate(relations, { transaction });
            }

            await transaction.commit();
            return true;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }


    static async delete(staffId) {
        try {
            await Staff.destroy({ where: { id: staffId } });
            return 'resource deleted successfully'

        } catch (error) {
            throw error;
        }
    }
}

module.exports = Staffervice;