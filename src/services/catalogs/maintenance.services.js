const { Op } = require('sequelize');
const dayjs = require('dayjs');
const db = require('../../utils/database');
const Yacht = require('../../models/catalogs/yacht.models');
const YachtEquipment = require('../../models/catalogs/yachtEquipment.models');
const MaintenanceRule = require('../../models/catalogs/maintenanceRule.models');
const MaintenanceRuleMaterial = require('../../models/catalogs/maintenanceRuleMaterial.models');
const MaintenanceRuleAssignment = require('../../models/catalogs/maintenanceRuleAssignment.models');
const MaintenanceRecord = require('../../models/catalogs/maintenanceRecord.models');
const MaintenanceRecordMaterial = require('../../models/catalogs/maintenanceRecordMaterial.models');
const Product = require('../../models/operations/inventory/product.models');

const DATE_UNIT_BY_PERIODICITY = { dias: 'day', meses: 'month', anios: 'year' };

// Ventana de advertencia previa al vencimiento antes de pasar de "al día" a "próxima".
// Horas: margen fijo de 24 horas de operación. Calendario: 10% del período, con un
// piso mínimo para que periodicidades muy cortas igual den margen de reacción.
const HOUR_WARNING_WINDOW = 24;
const DAY_WARNING_MIN = 3;

const buildRuleAlert = (assignment, equipmentRecords) => {
    const rule = assignment.rule;
    const equipment = assignment.equipment;
    const recordsForRule = equipmentRecords.filter((record) => record.ruleId === rule.id);
    const lastPerformed = recordsForRule[0] ?? null;

    const base = {
        equipmentId: equipment.id,
        equipmentName: equipment.name,
        yachtId: equipment.yachtId,
        ruleId: rule.id,
        ruleName: rule.name,
        periodicityValue: rule.periodicityValue,
        periodicityUnit: rule.periodicityUnit,
        lastPerformedAt: lastPerformed?.performedAt ?? null,
    };

    if (!rule.periodicityValue || !rule.periodicityUnit) {
        return { ...base, status: 'sin_periodicidad', remainingDays: null, remainingHours: null };
    }

    if (!lastPerformed) {
        return { ...base, status: 'nunca_realizada', remainingDays: null, remainingHours: null };
    }

    if (rule.periodicityUnit === 'horas') {
        if (lastPerformed.hoursReading == null) {
            return { ...base, status: 'sin_horometro', remainingDays: null, remainingHours: null };
        }
        const currentHours = equipmentRecords.find((record) => record.hoursReading != null)?.hoursReading ?? lastPerformed.hoursReading;
        const dueAtHours = lastPerformed.hoursReading + rule.periodicityValue;
        const remainingHours = dueAtHours - currentHours;
        const status = remainingHours <= 0 ? 'vencida' : remainingHours <= HOUR_WARNING_WINDOW ? 'proxima' : 'al_dia';
        return { ...base, status, remainingDays: null, remainingHours, currentHours };
    }

    const unit = DATE_UNIT_BY_PERIODICITY[rule.periodicityUnit];
    const lastPerformedAt = dayjs(lastPerformed.performedAt);
    const dueAt = lastPerformedAt.add(rule.periodicityValue, unit);
    const remainingDays = dueAt.diff(dayjs(), 'day');
    const periodDays = dueAt.diff(lastPerformedAt, 'day');
    const warningDays = Math.max(Math.round(periodDays * 0.1), DAY_WARNING_MIN);
    const status = remainingDays <= 0 ? 'vencida' : remainingDays <= warningDays ? 'proxima' : 'al_dia';
    return { ...base, status, remainingDays, remainingHours: null, dueAt: dueAt.toISOString() };
};

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
                maintenanceType: data.maintenanceType,
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
                maintenanceType: data.maintenanceType,
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

    // ALERTS
    static async getRuleAlerts(yachtId) {
        const equipmentWhere = { active: true };
        if (yachtId) equipmentWhere.yachtId = yachtId;

        const assignments = await MaintenanceRuleAssignment.findAll({
            where: { active: true },
            include: [
                { model: MaintenanceRule, as: 'rule', where: { active: true } },
                { model: YachtEquipment, as: 'equipment', where: equipmentWhere, attributes: ['id', 'name', 'yachtId'] },
            ],
        });

        if (!assignments.length) return [];

        const equipmentIds = [...new Set(assignments.map((assignment) => assignment.equipmentId))];
        const records = await MaintenanceRecord.findAll({
            where: { equipmentId: { [Op.in]: equipmentIds } },
            order: [['performedAt', 'DESC']],
        });

        const recordsByEquipment = new Map();
        records.forEach((record) => {
            if (!recordsByEquipment.has(record.equipmentId)) recordsByEquipment.set(record.equipmentId, []);
            recordsByEquipment.get(record.equipmentId).push(record);
        });

        return assignments.map((assignment) => buildRuleAlert(assignment, recordsByEquipment.get(assignment.equipmentId) ?? []));
    }

    // BOOK
    static async getYachtForBook(yachtId) {
        return Yacht.findOne({ where: { id: yachtId }, attributes: ['id', 'name', 'code', 'active'] });
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
