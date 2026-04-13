const db = require('../../utils/database');
const Maintenance = require('../../models/catalogs/maintenance.models');
const YachtParts = require('../../models/catalogs/yachtParts.models');
const MaintenanceRules = require('../../models/catalogs/maintenanceRules.models');
const MaintenanceRulesPart = require('../../models/catalogs/maintenanceRulesPart.models');
const MaintenanceMaterials = require('../../models/catalogs/maintenanceMaterials.models');
const Yacht = require('../../models/catalogs/yacht.models');
const Product = require('../../models/operations/orders/product.models');

class MaintenanceService {
    static async getAll() {
        try {
            const result = await Maintenance.findAll({
                include: [{
                    model: MaintenanceRulesPart,
                    as: 'rules_part',
                    include: [{
                        model: YachtParts,
                        as: 'parte',
                        attributes: ['yachtId', 'name'],
                        include: [{
                            model: Yacht,
                            as: 'yacht',
                            attributes: ['name', 'code']
                        }]
                    }, {
                        model: MaintenanceRules,
                        as: 'regla',
                        attributes: ['name', 'periodicity', 'periodicityType'],
                    }],
                }, {
                    model: MaintenanceMaterials,
                    as: 'materials',
                    include: [{
                        model: Product,
                        as: 'product',
                        attributes: ['name']
                    }],
                }],
                order: [['createdAt', 'DESC']]
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getMaintenancesHistory() {
        try {
            const result = await MaintenanceRules.findAll({
                include: [{
                    model: MaintenanceRulesPart,
                    as: 'partes',
                    include: [{
                        model: YachtParts,
                        as: 'parte',
                        attributes: ['yachtId', 'name'],
                        include: [{
                            model: Yacht,
                            as: 'yacht',
                            attributes: ['name', 'code']
                        }]
                    }, {
                        model: MaintenanceRules,
                        as: 'regla',
                        attributes: ['name', 'periodicity', 'periodicityType'],
                    }, {
                        model: Maintenance,
                        as: 'maintenances',
                    }],
                }]
            });

            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getMaintenanceById(id) {
        try {
            const result = await Maintenance.findOne({
                where: { id },
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async createMaintenance(yacht) {
        const transaction = await db.transaction();

        try {
            const part = await MaintenanceRulesPart.findOne({
                where: { partId: yacht.partId, ruleId: yacht.ruleId },
                include: [
                    {
                        model: YachtParts,
                        as: 'parte'
                    },
                    {
                        model: MaintenanceRules,
                        as: 'regla'
                    }
                ],
                transaction
            });

            if (!part) {
                throw new Error('No se encontró configuración de mantenimiento para esta pieza');
            }

            const previousHours = part.parte.hours;

            // ⚙️ CONFIGURABLE
            const HOURS_PER_DAY = 24;
            const lastUpdate = new Date(part.parte.updatedAt);
            const now = new Date();
            const diffTime = now - lastUpdate;
            const diffDays = diffTime / (1000 * 60 * 60 * 24);

            const hoursElapsed = diffDays * HOURS_PER_DAY;
            const currentHours = Number(previousHours) + Number(hoursElapsed);

            const nextHours = Number(previousHours) + Number(part.regla.periodicity);

            const result = await Maintenance.create({
                ...yacht,
                rulesPartId: part.id,
                previousMaintenanceHours: previousHours,
                nextMaintenanceHours: nextHours,
                hoursAtMaintenance: yacht.state === 'realizado' ? currentHours : null,
                doneDate: yacht.state === 'realizado' ? now : null
            }, { transaction });

            if (yacht.products?.length) {
                const maintenancePart = await Promise.all(
                    yacht.products.map(async (x) => {
                        return {
                            productId: x.productId,
                            maintenanceId: result.id,
                            quantity: x.quantity
                        };
                    })
                );
                await MaintenanceMaterials.bulkCreate(maintenancePart, { transaction });
            }

            await transaction.commit();
            return result;

        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    static async updateMaintenance(yacht, id) {
        const transaction = await db.transaction();
        try {
            const part = await MaintenanceRulesPart.findOne({
                where: { id: yacht.rulesPartId },
                include: [
                    {
                        model: YachtParts,
                        as: 'parte',
                    },
                    {
                        model: MaintenanceRules,
                        as: 'regla'
                    }
                ],
                transaction
            });

            if (!part) {
                throw new Error('No se encontró configuración de mantenimiento para esta pieza');
            }

            const previousHours = part.parte.hours;

            // ⚙️ CONFIGURABLE
            const HOURS_PER_DAY = 24;
            const lastUpdate = new Date(part.parte.updatedAt);
            const now = new Date();
            const diffTime = now - lastUpdate;
            const diffDays = diffTime / (1000 * 60 * 60 * 24);

            const hoursElapsed = diffDays * HOURS_PER_DAY;
            const currentHours = Number(previousHours) + Number(hoursElapsed);

            await Maintenance.update({
                ...yacht,
                hoursAtMaintenance: yacht.state === 'realizado' ? currentHours : null,
                doneDate: yacht.state === 'realizado' ? now : null
            }, {
                where: { id },
                transaction
            });

            const incomingProducts = yacht.products || [];
            const existingProducts = await MaintenanceMaterials.findAll({
                where: { maintenanceId: id },
                transaction
            });

            const toUpdate = incomingProducts.filter(p => p.id);
            const toCreate = incomingProducts.filter(p => !p.id);
            const incomingIds = toUpdate.map(p => p.id);

            await MaintenanceMaterials.destroy({
                where: {
                    maintenanceId: id,
                    id: existingProducts
                        .filter(p => !incomingIds.includes(p.id))
                        .map(p => p.id)
                },
                transaction
            });

            for (const product of toUpdate) {
                await MaintenanceMaterials.update(
                    {
                        productId: product.productId,
                        quantity: product.quantity
                    },
                    {
                        where: { id: product.id },
                        transaction
                    }
                );
            }

            if (toCreate.length) {
                const newRecords = toCreate.map(p => ({
                    maintenanceId: id,
                    productId: p.productId,
                    quantity: p.quantity
                }));

                await MaintenanceMaterials.bulkCreate(newRecords, { transaction });
            }

            await transaction.commit();
            return { success: true };

        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    static async approveMaintenance(yacht, id) {
        const transaction = await db.transaction();
        try {

            const result = await Maintenance.findOne({
                where: { id },
                transaction
            })

            result.update(yacht, { transaction });
            const part = await MaintenanceRulesPart.findOne({
                where: { id: result.rulesPartId },
                transaction
            });

            await YachtParts.update({
                hours: result.hoursAtMaintenance
            }, {
                where: { id: part.partId },
                transaction
            })


            await transaction.commit();
            return result;

        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    static async delete(id) {
        try {
            const result = await Maintenance.destroy(id);
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
                    model: Yacht,
                    as: 'yacht',
                    attributes: ['name', 'code']
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
                            model: Yacht,
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

module.exports = MaintenanceService;