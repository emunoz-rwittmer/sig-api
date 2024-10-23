const Staff = require('../../models/catalogs/staff.models');
const Yachts = require('../../models/catalogs/yacht.models');
const Positions = require('../../models/catalogs/positions.models');
const Departaments = require('../../models/catalogs/departament.models')
const StaffYacht = require('../../models/catalogs/staffYacht.models');
const { Op } = require("sequelize");
const Roles = require('../../models/catalogs/roles.models');

class Staffervice {
    static async getAll() {
        try {
            const result = await Staff.findAll({
                attributes: ['id', 'first_name', 'last_name', 'email', 'cell_phone', 'company', 'active'],
                order: [
                    ['last_name', 'ASC']
                ],
                include: [{
                    model: StaffYacht,
                    as: 'yachts',
                    attributes: ['id'],
                    include: [{
                        model: Yachts,
                        as: 'yacht_staff'
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
                attributes: ['id', 'first_name', 'last_name', 'email', 'cell_phone', 'company', 'active'],
                order: [
                    ['last_name', 'ASC']
                ],
                include: [{
                    model: StaffYacht,
                    as: 'yachts',
                    attributes: ['id'],
                    include: [{
                        model: Yachts,
                        as: 'yacht_staff'
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
                attributes: ['id', 'first_name', 'last_name', 'email', 'cell_phone', 'company', 'active'],
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
            const where = { active: true }

            if (departamentId) {
                where.departamentId = departamentId;
            }

            if (positionId) {
                where.positionId = positionId;
            } else {
                where.positionId = { [Op.ne]: search };
            }

            const yachtInclude = {
                model: StaffYacht,
                as: 'yachts',
                attributes: ['id'],
                include: [{
                    model: Yachts,
                    as: 'yacht_staff'
                }]
            };

            if (yachtId) {
                yachtInclude.where = { yachtId: yachtId };
            }

            const result = await Staff.findAll({
                where,
                attributes: ['id', 'first_name', 'last_name', 'email', 'cell_phone', 'company', 'active'],
                order: [['last_name', 'ASC']],
                include: [{
                    model: Positions,
                    as: 'staff_position',
                    attributes: ['id', 'name'],
                }, yachtInclude]
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
                attributes: ['id', 'first_name', 'last_name', 'email', 'cell_phone', 'company', 'active'],
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
                model: StaffYacht,
                as: 'yachts',
                attributes: ['id'],
                include: [{
                    model: Yachts,
                    as: 'yacht_staff'
                }]
            };

            if (yachtId) {
                yachtInclude.where = { yachtId: yachtId };
            }

            const result = await Staff.findAll({
                where,
                attributes: ['id', 'first_name', 'last_name', 'email', 'cell_phone', 'company', 'active'],
                order: [
                    ['last_name', 'ASC']
                ],
                include: [{
                    model: Positions,
                    as: 'staff_position',
                    attributes: ['id', 'name'],
                }, yachtInclude]
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
                attributes: ['first_name', 'last_name', 'email', 'cell_phone', 'roleId', 'departamentId', 'positionId', 'company', 'active'],
                include: [{
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

    static async createStaff(staff) {
        try {
            const result = await Staff.create(staff);
            return result;
        } catch (error) {
            console.log(error)
            throw error;

        }
    }

    static async updateStaff(staff, id) {
        try {
            const result = await Staff.update(staff, id);
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async delete(staffId) {
        try {
            const relations = await StaffYacht.destroy({
                where: { staffId }
            });
            const result = await Staff.destroy({
                where: { id: staffId }
            });
            if (relations || result) {
                return 'resource deleted successfully'
            }
        } catch (error) {
            throw error;
        }
    }

    // Staff - YACHT 

    static async getAllYachts(id) {
        try {
            const result = await StaffYacht.findAll({
                where: { staffId: id },
                attributes: ['id'],
                include: {
                    model: Yachts,
                    as: 'yacht_staff',
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
            const result = await StaffYacht.create(data);
            return result;
        } catch (error) {
            throw error;

        }
    }

    static async deleteYacht(id) {
        try {
            const result = await StaffYacht.destroy(id);
            return result;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = Staffervice;