const { Op } = require('sequelize');
const dayjs = require('dayjs');
const db = require('../../utils/database');
const Yacht = require('../../models/catalogs/yacht.models');
const YachtEquipment = require('../../models/catalogs/yachtEquipment.models');
const EquipmentHourReading = require('../../models/catalogs/equipmentHourReading.models');
const MaintenanceRule = require('../../models/catalogs/maintenanceRule.models');
const MaintenanceRuleMaterial = require('../../models/catalogs/maintenanceRuleMaterial.models');
const MaintenanceRuleAssignment = require('../../models/catalogs/maintenanceRuleAssignment.models');
const MaintenanceRecord = require('../../models/catalogs/maintenanceRecord.models');
const MaintenanceRecordMaterial = require('../../models/catalogs/maintenanceRecordMaterial.models');
const Product = require('../../models/operations/inventory/product.models');

const DATE_UNIT_BY_PERIODICITY = { dias: 'day', meses: 'month', anios: 'year' };

// Ventana de advertencia previa al vencimiento antes de pasar de "al día" a "próxima":
// 10% del período. En calendario hay además un piso mínimo para que periodicidades
// muy cortas igual den margen de reacción.
const WARNING_RATIO = 0.1;
const DAY_WARNING_MIN = 3;

// El horómetro solo avanza: la lectura vigente es la mayor conocida, venga de una ronda o de un mantenimiento.
// shortcut: no contempla un horómetro reemplazado o reiniciado; agregar un "reinicio" si llega a pasar.
const resolveCurrentHours = (readings, records) => [
    ...readings.map((item) => ({ hours: item.reading, readAt: item.readAt })),
    ...records.filter((record) => record.hoursReading != null).map((record) => ({ hours: record.hoursReading, readAt: record.performedAt })),
].reduce((top, item) => (!top || item.hours > top.hours ? item : top), null);

const groupByEquipment = (rows) => {
    const map = new Map();
    rows.forEach((row) => {
        if (!map.has(row.equipmentId)) map.set(row.equipmentId, []);
        map.get(row.equipmentId).push(row);
    });
    return map;
};

const buildRuleAlert = (assignment, equipmentRecords, current) => {
    const rule = assignment.rule;
    const equipment = assignment.equipment;
    const lastRecord = equipmentRecords.find((record) => record.ruleId === rule.id);
    const hasBaseline = assignment.baselineDate != null || assignment.baselineHours != null;
    // Sin registros todavía, el punto de partida es la línea base cargada al asignar la regla.
    const last = lastRecord
        ? { at: lastRecord.performedAt, hours: lastRecord.hoursReading }
        : hasBaseline ? { at: assignment.baselineDate, hours: assignment.baselineHours } : null;

    const base = {
        equipmentId: equipment.id,
        equipmentName: equipment.name,
        yachtId: equipment.yachtId,
        ruleId: rule.id,
        ruleName: rule.name,
        periodicityValue: rule.periodicityValue,
        periodicityUnit: rule.periodicityUnit,
        lastPerformedAt: last?.at ?? null,
        fromBaseline: !lastRecord && hasBaseline,
    };

    if (!rule.periodicityValue || !rule.periodicityUnit) {
        return { ...base, status: 'sin_periodicidad', remainingDays: null, remainingHours: null };
    }

    if (!last) {
        return { ...base, status: 'nunca_realizada', remainingDays: null, remainingHours: null };
    }

    if (rule.periodicityUnit === 'horas') {
        if (last.hours == null) {
            return { ...base, status: 'sin_horometro', remainingDays: null, remainingHours: null };
        }
        const currentHours = Math.max(current?.hours ?? last.hours, last.hours);
        const remainingHours = last.hours + rule.periodicityValue - currentHours;
        const warningHours = rule.periodicityValue * WARNING_RATIO;
        const status = remainingHours <= 0 ? 'vencida' : remainingHours <= warningHours ? 'proxima' : 'al_dia';
        return { ...base, status, remainingDays: null, remainingHours, currentHours, hoursReadAt: current?.readAt ?? null };
    }

    if (!last.at) {
        return { ...base, status: 'nunca_realizada', remainingDays: null, remainingHours: null };
    }

    const unit = DATE_UNIT_BY_PERIODICITY[rule.periodicityUnit];
    const lastPerformedAt = dayjs(last.at);
    const dueAt = lastPerformedAt.add(rule.periodicityValue, unit);
    const remainingDays = dueAt.diff(dayjs(), 'day');
    const periodDays = dueAt.diff(lastPerformedAt, 'day');
    const warningDays = Math.max(Math.round(periodDays * WARNING_RATIO), DAY_WARNING_MIN);
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

    // HOUR READINGS
    static async getCurrentHours(equipmentId) {
        const [readings, records] = await Promise.all([
            EquipmentHourReading.findAll({ where: { equipmentId } }),
            MaintenanceRecord.findAll({ where: { equipmentId, hoursReading: { [Op.ne]: null } } }),
        ]);
        return resolveCurrentHours(readings, records);
    }

    static async createHourReading(data) {
        return EquipmentHourReading.create(data);
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

    static async createRuleAssignment(equipmentId, ruleId, baseline = {}) {
        return MaintenanceRuleAssignment.create({ equipmentId, ruleId, ...baseline });
    }

    static async updateRuleAssignment(id, data) {
        const assignment = await MaintenanceRuleAssignment.findByPk(id);
        await assignment.update(data);
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
        const [records, readings] = await Promise.all([
            MaintenanceRecord.findAll({
                where: { equipmentId: { [Op.in]: equipmentIds } },
                order: [['performedAt', 'DESC']],
            }),
            EquipmentHourReading.findAll({ where: { equipmentId: { [Op.in]: equipmentIds } } }),
        ]);

        const recordsByEquipment = groupByEquipment(records);
        const readingsByEquipment = groupByEquipment(readings);

        return assignments.map((assignment) => {
            const equipmentRecords = recordsByEquipment.get(assignment.equipmentId) ?? [];
            const current = resolveCurrentHours(readingsByEquipment.get(assignment.equipmentId) ?? [], equipmentRecords);
            return buildRuleAlert(assignment, equipmentRecords, current);
        });
    }

    // BOOK
    static async getYachtForBook(yachtId) {
        return Yacht.findOne({ where: { id: yachtId }, attributes: ['id', 'name', 'code', 'active'] });
    }

    static async getMaintenanceBook(yachtId) {
        const equipment = await YachtEquipment.findAll({
            where: { yachtId },
            order: [['name', 'ASC']],
            include: [
                { model: EquipmentHourReading, as: 'hourReadings', separate: true },
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

        equipment.forEach((item) => {
            const current = resolveCurrentHours(item.hourReadings, item.records);
            item.dataValues.currentHours = current?.hours ?? null;
            item.dataValues.hoursReadAt = current?.readAt ?? null;
            delete item.dataValues.hourReadings;
        });
        return equipment;
    }
}

module.exports = MaintenanceService;
