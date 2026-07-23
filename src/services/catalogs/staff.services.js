const Staff = require('../../models/catalogs/staff.models');
const Yachts = require('../../models/catalogs/yacht.models');
const Positions = require('../../models/catalogs/positions.models');
const Departaments = require('../../models/catalogs/departament.models')
const Roles = require('../../models/catalogs/roles.models');
const Company = require('../../models/catalogs/company.models');
const StaffCompany = require('../../models/catalogs/staffCompany.models');
const db = require('../../utils/database');
const { Op } = require("sequelize");
const Regulation = require('../../models/rrhh/regulation.models');
const StaffReadRegulation = require('../../models/rrhh/readRegulation.models');
const StaffDocumentation = require('../../models/catalogs/staffDocumentation.models');
const Documentation = require('../../models/catalogs/documentation.models');
const Yacht = require('../../models/catalogs/yacht.models');
const Utils = require('../../utils/Utils');

class Staffervice {
    static async getAll() {
        try {
            const result = await Staff.findAll({
                attributes: { exclude: ['role_id', 'position_id', 'departament_id'] },
                order: [
                    ['lastName', 'ASC']
                ],
                include: [
                    {
                        model: StaffCompany,
                        as: 'companies',
                        attributes: ['companyId'],
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
            const result = await Staff.findOne({
                where: { email },
                attributes: { exclude: ['role_id', 'position_id', 'departament_id'] },
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getStaffCompanies(staffId) {
        try {
            const result = await StaffCompany.findAll({
                where: { staffId },
                attributes: ['id'],
                include: [
                    {
                        model: Company,
                        as: 'company',
                        attributes: ['name'],
                        include: [
                            {
                                model: Yacht,
                                as: 'yacht',
                                attributes: ['id', 'name', 'code']

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


    static async getStaffById(id) {
        try {
            const result = await Staff.findOne({
                where: { id },
                include: [
                    {
                        model: StaffCompany,
                        as: 'companies',
                        attributes: ['companyId'],
                        include: [
                            {
                                model: Company,
                                as: 'company',
                                attributes: ['name', 'logo'],
                                include: [
                                    {
                                        model: Yacht,
                                        as: 'yacht',
                                        attributes: ['name']

                                    }
                                ]
                            }
                        ]
                    },
                    {
                        model: StaffDocumentation,
                        as: 'documentation',
                        attributes: ['id', 'status', 'file', 'expiryDate', 'fileName', 'fileSize', 'updatedAt'],
                        include: [
                            {
                                model: Documentation,
                                as: 'document',
                                attributes: ['name', 'description', 'required'],
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

            const documents = await Documentation.findAll({
                attributes: ['id', 'positions'],
                transaction
            });

            const applicableDocuments = documents.filter(document => {
                let positions = document.positions;

                if (typeof positions === 'string') {
                    try {
                        positions = JSON.parse(positions);
                    } catch (error) {
                        return false;
                    }
                }

                if (!Array.isArray(positions)) positions = [positions];

                return positions.some(position => {
                    if (String(position) === String(staff.positionId)) return true;

                    try {
                        return Utils.decode(position) === staff.positionId;
                    } catch (error) {
                        return false;
                    }
                });
            });

            if (applicableDocuments.length) {
                const staffDocumentations = applicableDocuments.map(document => ({
                    staffId: newStaff.id,
                    documentId: document.id,
                    status: 'pending',
                }));

                await StaffDocumentation.bulkCreate(staffDocumentations, { transaction });
            }

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

            const currentRelations = await StaffCompany.findAll({
                where: { staffId: id },
                transaction
            });

            const currentCompanyIds = currentRelations.map(rel => rel.companyId);
            const newCompanyIds = companyId || [];

            const companiesToRemove = currentCompanyIds.filter(
                company => !newCompanyIds.includes(company)
            );

            const companiesToAdd = newCompanyIds.filter(
                company => !currentCompanyIds.includes(company)
            );

            if (companiesToRemove.length > 0) {
                await StaffCompany.destroy({
                    where: {
                        staffId: id,
                        companyId: companiesToRemove
                    },
                    transaction
                });
            }

            if (companiesToAdd.length > 0) {
                const newRelations = companiesToAdd.map(company => ({
                    staffId: id,
                    companyId: company
                }));
                await StaffCompany.bulkCreate(newRelations, { transaction });
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

    static async getEvaluatorsByFilters(search, companyId, departamentId, positionId) {

        try {

            const where = { active: true };

            if (departamentId) {
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
                ...(companyId && { where: { companyId } })
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
                    positionId: {
                        [Op.in]: search
                    },
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

    static async getEvaluatedsByFilters(positionId, companyId) {
        try {

            const where = { active: true };

            if (positionId) {
                where.positionId = {
                    [Op.in]: positionId
                };
            }

            const yachtInclude = {
                model: StaffCompany,
                as: 'companies',
                attributes: ['id'],
                ...(companyId && { where: { companyId } })
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



    static async uploadImage(data, id) {
        try {
            await Staff.update(data, {
                where: { id }
            });

            return true;
        } catch (error) {
            throw error;
        }
    }

    static async uploadStaffDocumentation(document) {
        const transaction = await db.transaction();
        try {
            await StaffDocumentation.update(
                {
                    file: document.file,
                    fileName: document.fileName,
                    fileSize: document.fileSize,
                    status: document.status,
                    expiryDate: document.expiryDate
                },
                {
                    where: { id: document.id },
                    transaction
                }
            );

            await transaction.commit();
            return true;

        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
}

module.exports = Staffervice;