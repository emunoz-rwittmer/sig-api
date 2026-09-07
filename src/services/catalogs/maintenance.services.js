const { Op } = require('sequelize');
const db = require('../../utils/database');
const Yacht = require('../../models/catalogs/yacht.models');
const YachtEquipment = require('../../models/catalogs/yachtEquipment.models');
const MaintenanceRule = require('../../models/catalogs/maintenanceRule.models');
const MaintenanceRuleMaterial = require('../../models/catalogs/maintenanceRuleMaterial.models');
const MaintenanceRuleAssignment = require('../../models/catalogs/maintenanceRuleAssignment.models');
const MaintenanceRecord = require('../../models/catalogs/maintenanceRecord.models');
const MaintenanceRecordMaterial = require('../../models/catalogs/maintenanceRecordMaterial.models');
const Product = require('../../models/operations/inventory/product.models');

class MaintenanceService {
    // EQUIPMENT
    static async getAllEquipment(yachtId) {
        const where = {};
        if (yachtId) where.yachtId = yachtId;
        return YachtEquipment.findAll({ where, order: [['name', 'ASC']] });
    }

    static async getEquipmentById(id) {
        return YachtEquipment.findByPk(id);
    }

    static async createEquipment(data) {
        return YachtEquipment.create(data);
    }

    static async updateEquipment(id, data) {
        const equipment = await YachtEquipment.findByPk(id);
        await equipment.update(data);
        return equipment;
    }

    // RULES
    static async getAllRules() {
        return MaintenanceRule.findAll({
            order: [['name', 'ASC']],
            include: [{
                model: MaintenanceRuleMaterial,
                as: 'recommendedMaterials',
                include: [{ model: Product, as: 'product', attributes: ['id', 'name'] }],
            }],
        });
    }

    static async getRuleById(id) {
        return MaintenanceRule.findOne({
            where: { id },
            include: [{
                model: MaintenanceRuleMaterial,
                as: 'recommendedMaterials',
                include: [{ model: Product, as: 'product', attributes: ['id', 'name'] }],
            }],
        });
    }

    static async createRule(data) {
        const transaction = await db.transaction();
        try {
            const rule = await MaintenanceRule.create({
                name: data.name,
                periodicityValue: data.periodicityValue,
                periodicityUnit: data.periodicityUnit,
                instructions: data.instructions,
            }, { transaction });

            if (data.recommendedMaterials.length) {
                const materials = data.recommendedMaterials.map((m) => ({
                    ruleId: rule.id,
                    productId: m.productId,
                    recommendedQuantity: m.recommendedQuantity,
                }));
                await MaintenanceRuleMaterial.bulkCreate(materials, { transaction });
            }

            await transaction.commit();
            return MaintenanceService.getRuleById(rule.id);
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    static async updateRule(id, data) {
        const transaction = await db.transaction();
        try {
            const rule = await MaintenanceRule.findByPk(id, { transaction });
            await rule.update({
                name: data.name,
                periodicityValue: data.periodicityValue,
                periodicityUnit: data.periodicityUnit,
                instructions: data.instructions,
                active: data.active,
            }, { transaction });

            await MaintenanceRuleMaterial.destroy({ where: { ruleId: id }, transaction });
            if (data.recommendedMaterials.length) {
                const materials = data.recommendedMaterials.map((m) => ({
                    ruleId: id,
                    productId: m.productId,
                    recommendedQuantity: m.recommendedQuantity,
                }));
                await MaintenanceRuleMaterial.bulkCreate(materials, { transaction });
            }

            await transaction.commit();
            return MaintenanceService.getRuleById(id);
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    // RULE ASSIGNMENTS
    static async getRuleAssignmentsByEquipment(equipmentId) {
        return MaintenanceRuleAssignment.findAll({
            where: { equipmentId },
            include: [{ model: MaintenanceRule, as: 'rule' }],
        });
    }

    static async getRuleAssignmentById(id) {
        return MaintenanceRuleAssignment.findByPk(id);
    }

    static async findRuleAssignment(equipmentId, ruleId) {
        return MaintenanceRuleAssignment.findOne({ where: { equipmentId, ruleId } });
    }

    static async createRuleAssignment(equipmentId, ruleId) {
        return MaintenanceRuleAssignment.create({ equipmentId, ruleId });
    }

    static async updateRuleAssignment(id, active) {
        const assignment = await MaintenanceRuleAssignment.findByPk(id);
        await assignment.update({ active });
        return assignment;
    }

    // RECORDS (historial)
    static async getAllRecords(filters) {
        const where = {};
        if (filters.yachtId) where.yachtId = filters.yachtId;
        if (filters.equipmentId) where.equipmentId = filters.equipmentId;
        if (filters.ruleId) where.ruleId = filters.ruleId;
        if (filters.from || filters.to) {
            where.performedAt = {};
            if (filters.from) where.performedAt[Op.gte] = filters.from;
            if (filters.to) where.performedAt[Op.lte] = filters.to;
        }
        return MaintenanceRecord.findAll({
            where,
            order: [['performedAt', 'DESC']],
            include: [
                { model: YachtEquipment, as: 'equipment', attributes: ['id', 'name'] },
                { model: MaintenanceRule, as: 'rule', attributes: ['id', 'name'] },
                {
                    model: MaintenanceRecordMaterial,
                    as: 'materials',
                    include: [{ model: Product, as: 'product', attributes: ['id', 'name'] }],
                },
            ],
        });
    }

    static async getRecordById(id) {
        return MaintenanceRecord.findOne({
            where: { id },
            include: [
                { model: YachtEquipment, as: 'equipment', attributes: ['id', 'name'] },
                { model: MaintenanceRule, as: 'rule', attributes: ['id', 'name'] },
                {
                    model: MaintenanceRecordMaterial,
                    as: 'materials',
                    include: [{ model: Product, as: 'product', attributes: ['id', 'name'] }],
                },
            ],
        });
    }

    static async createRecord(data) {
        const transaction = await db.transaction();
        try {
            const record = await MaintenanceRecord.create({
                equipmentId: data.equipmentId,
                yachtId: data.yachtId,
                ruleId: data.ruleId,
                responsible: data.responsible,
                workPerformed: data.workPerformed,
                performedAt: data.performedAt,
                hoursReading: data.hoursReading,
                observation: data.observation,
            }, { transaction });

            if (data.materials.length) {
                const materials = data.materials.map((m) => ({
                    recordId: record.id,
                    productId: m.productId,
                    quantity: m.quantity,
                }));
                await MaintenanceRecordMaterial.bulkCreate(materials, { transaction });
            }

            await transaction.commit();
            return MaintenanceService.getRecordById(record.id);
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    static async updateRecord(id, data) {
        const transaction = await db.transaction();
        try {
            const record = await MaintenanceRecord.findByPk(id, { transaction });
            await record.update({
                equipmentId: data.equipmentId,
                yachtId: data.yachtId,
                ruleId: data.ruleId,
                responsible: data.responsible,
                workPerformed: data.workPerformed,
                performedAt: data.performedAt,
                hoursReading: data.hoursReading,
                observation: data.observation,
            }, { transaction });

            await MaintenanceRecordMaterial.destroy({ where: { recordId: id }, transaction });
            if (data.materials.length) {
                const materials = data.materials.map((m) => ({
                    recordId: id,
                    productId: m.productId,
                    quantity: m.quantity,
                }));
                await MaintenanceRecordMaterial.bulkCreate(materials, { transaction });
            }

            await transaction.commit();
            return MaintenanceService.getRecordById(id);
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    static async approveRecord(id, approvedBy) {
        await MaintenanceRecord.update(
            { approvedBy, approvedAt: new Date() },
            { where: { id } }
        );
        return MaintenanceService.getRecordById(id);
    }

    // BOOK
    static async getYachtForBook(yachtId) {
        return Yacht.findOne({ where: { id: yachtId }, attributes: ['id', 'name', 'code'] });
    }

    static async getMaintenanceBook(yachtId) {
        return YachtEquipment.findAll({
            where: { yachtId },
            order: [['name', 'ASC']],
            include: [
                {
                    model: MaintenanceRuleAssignment,
                    as: 'ruleAssignments',
                    where: { active: true },
                    required: false,
                    separate: true,
                    include: [{
                        model: MaintenanceRule,
                        as: 'rule',
                        include: [{
                            model: MaintenanceRuleMaterial,
                            as: 'recommendedMaterials',
                            include: [{ model: Product, as: 'product', attributes: ['id', 'name'] }],
                        }],
                    }],
                },
                {
                    model: MaintenanceRecord,
                    as: 'records',
                    separate: true,
                    order: [['performedAt', 'DESC']],
                    include: [
                        { model: MaintenanceRule, as: 'rule', attributes: ['id', 'name'] },
                        {
                            model: MaintenanceRecordMaterial,
                            as: 'materials',
                            include: [{ model: Product, as: 'product', attributes: ['id', 'name'] }],
                        },
                    ],
                },
            ],
        });
    }
}

module.exports = MaintenanceService;
