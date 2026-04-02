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

    //PARTS
    static async getAllParts() {
        try {
            const result = await YachtParts.findAll({
                include: {
                    model: Yachts,
                    as: 'yacht',
                    attributes: ['name']
                }
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async createPart(yacht) {
        try {
            const result = await YachtParts.create(yacht);
            return result;
        } catch (error) {
            throw error;

        }
    }

    static async updatePart(yacht, id) {
        try {
            const result = await YachtParts.update(yacht, id);
            return result;
        } catch (error) {
            throw error;
        }
    }

    //PARTS
    static async getAllRules() {
        try {
            const result = await MaintenanceRules.findAll({
                include: {
                    model: MaintenanceRulesPart,
                    as: 'partes',
                    attributes: ['id', 'partId'],
                    include: {
                        model: YachtParts,
                        as: 'parte',
                        include: {
                            model: Yachts,
                            as: 'yacht',
                            attributes: ['code']
                        }
                    }
                }
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async createRule(yacht) {
        const transaction = await db.transaction();
        try {
            const result = await MaintenanceRules.create(yacht, { transaction });

            if (!yacht.partIds.length) throw new Error('Debe asignar partes para esta regla de mantenimiento');

            const rulesPart = yacht.partIds.map(x => ({
                partId: x,
                ruleId: result.id,
            }));

            await MaintenanceRulesPart.bulkCreate(rulesPart, { transaction })

            await transaction.commit();
            return result;
        } catch (error) {
            await transaction.rollback();
            throw error;

        }
    }

    static async updateRule(yacht, id) {
        const transaction = await db.transaction();
        try {
            const result = await MaintenanceRules.update(yacht, {
                where: { id },
                transaction
            });

            const currentRelations = await MaintenanceRulesPart.findAll({
                where: { ruleId: id },
                transaction
            });

            const currentParetIds = currentRelations.map(rel => rel.partId);
            const newPartIds = yacht.partIds || [];

            const partToRemove = currentParetIds.filter(
                x => !newPartIds.includes(x)
            );

            const partsToAdd = newPartIds.filter(
                x => !currentParetIds.includes(x)
            );

            if (partToRemove.length > 0) {
                await MaintenanceRulesPart.destroy({
                    where: {
                        ruleId: id,
                        partId: partToRemove
                    },
                    transaction
                });
            }

            if (partsToAdd.length > 0) {
                const newRelations = partsToAdd.map(x => ({
                    ruleId: id,
                    partId: x
                }));
                await MaintenanceRulesPart.bulkCreate(newRelations, { transaction });
            }

            await transaction.commit();
            return result;
        } catch (error) {
            await transaction.rollback();
            throw error;

        }
    }
}

module.exports = YachtService;