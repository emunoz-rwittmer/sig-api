const { Op } = require('sequelize');
const dayjs = require('dayjs');
const db = require('../../utils/database');
const Yacht = require('../../models/catalogs/yacht.models');
const YachtEquipment = require('../../models/catalogs/yachtEquipment.models');
const EquipmentHourReading = require('../../models/catalogs/equipmentHourReading.models');
const MaintenanceFault = require('../../models/catalogs/maintenanceFault.models');
const MaintenanceRecordAttachment = require('../../models/catalogs/maintenanceRecordAttachment.models');
const MaintenanceRule = require('../../models/catalogs/maintenanceRule.models');
const MaintenanceRuleMaterial = require('../../models/catalogs/maintenanceRuleMaterial.models');
const MaintenanceRuleAssignment = require('../../models/catalogs/maintenanceRuleAssignment.models');
const MaintenanceRecord = require('../../models/catalogs/maintenanceRecord.models');
const MaintenanceRecordMaterial = require('../../models/catalogs/maintenanceRecordMaterial.models');
const Product = require('../../models/operations/inventory/product.models');
const Warehouse = require('../../models/catalogs/wareHouse.models');
const TransactionService = require('../operations/inventory/transactions.services');

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

// Uso del equipo en horas por día, medido entre la primera y la última lectura de los últimos meses.
// Sirve para estimar cuándo vence una regla por horas; null si no hay datos suficientes.
const USAGE_WINDOW_DAYS = 120;
const MIN_USAGE_SPAN_DAYS = 7;
const estimateDailyUsage = (readings, records) => {
    const since = dayjs().subtract(USAGE_WINDOW_DAYS, 'day');
    const points = [
        ...readings.map((item) => ({ hours: item.reading, at: dayjs(item.readAt) })),
        ...records.filter((record) => record.hoursReading != null).map((record) => ({ hours: record.hoursReading, at: dayjs(record.performedAt) })),
    ].filter((point) => point.at.isAfter(since)).sort((a, b) => a.at.valueOf() - b.at.valueOf());
    if (points.length < 2) return null;
    const first = points[0];
    const last = points[points.length - 1];
    const days = last.at.diff(first.at, 'day', true);
    if (days < MIN_USAGE_SPAN_DAYS || last.hours <= first.hours) return null;
    return (last.hours - first.hours) / days;
};

const groupByEquipment = (rows) => {
    const map = new Map();
    rows.forEach((row) => {
        if (!map.has(row.equipmentId)) map.set(row.equipmentId, []);
        map.get(row.equipmentId).push(row);
    });
    return map;
};

const STATUS_RANK = { vencida: 0, proxima: 1, al_dia: 2 };

// Vencimiento por horas; `postponedHours` corre el vencimiento si es mayor.
const evaluateHours = (last, current, interval, postponedHours) => {
    if (last.hours == null) return null;
    const currentHours = Math.max(current?.hours ?? last.hours, last.hours);
    const dueAtHours = Math.max(last.hours + interval, postponedHours ?? -Infinity);
    const remainingHours = dueAtHours - currentHours;
    const status = remainingHours <= 0 ? 'vencida' : remainingHours <= interval * WARNING_RATIO ? 'proxima' : 'al_dia';
    return {
        status,
        ratio: remainingHours / interval,
        fields: { remainingHours, remainingDays: null, currentHours, hoursReadAt: current?.readAt ?? null },
    };
};

// Vencimiento por calendario; `postponedDate` corre el vencimiento si es posterior.
const evaluateCalendar = (lastAt, value, unit, postponedDate) => {
    if (!lastAt) return null;
    const start = dayjs(lastAt);
    const scheduled = start.add(value, DATE_UNIT_BY_PERIODICITY[unit]);
    const dueAt = postponedDate && dayjs(postponedDate).isAfter(scheduled) ? dayjs(postponedDate) : scheduled;
    const remainingDays = dueAt.diff(dayjs(), 'day');
    const periodDays = scheduled.diff(start, 'day');
    const warningDays = Math.max(Math.round(periodDays * WARNING_RATIO), DAY_WARNING_MIN);
    const status = remainingDays <= 0 ? 'vencida' : remainingDays <= warningDays ? 'proxima' : 'al_dia';
    return {
        status,
        ratio: remainingDays / periodDays,
        fields: { remainingDays, remainingHours: null, periodDays, dueAt: dueAt.toISOString() },
    };
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
    const interval = assignment.intervalOverride ?? rule.periodicityValue;
    // La posposición vale para el ciclo en curso: un registro más nuevo de la regla la consume.
    const postponement = assignment.postponedAt && (lastRecord?.id ?? null) === (assignment.postponedAfterRecordId ?? null)
        ? assignment
        : null;

    const base = {
        assignmentId: assignment.id,
        equipmentId: equipment.id,
        equipmentName: equipment.name,
        equipmentCritical: Boolean(equipment.critical),
        yachtId: equipment.yachtId,
        ruleId: rule.id,
        ruleName: rule.name,
        periodicityValue: interval,
        periodicityUnit: rule.periodicityUnit,
        secondaryValue: rule.secondaryValue,
        secondaryUnit: rule.secondaryUnit,
        intervalOverridden: assignment.intervalOverride != null,
        lastPerformedAt: last?.at ?? null,
        fromBaseline: !lastRecord && hasBaseline,
        postponed: postponement
            ? {
                untilDate: postponement.postponedUntilDate,
                untilHours: postponement.postponedUntilHours,
                reason: postponement.postponeReason,
                by: postponement.postponedBy,
                at: postponement.postponedAt,
            }
            : null,
    };

    if (!interval || !rule.periodicityUnit) {
        return { ...base, status: 'sin_periodicidad', remainingDays: null, remainingHours: null };
    }

    if (!last) {
        return { ...base, status: 'nunca_realizada', remainingDays: null, remainingHours: null };
    }

    const isHours = rule.periodicityUnit === 'horas';
    const candidates = isHours
        ? [
            evaluateHours(last, current, interval, postponement?.postponedUntilHours),
            rule.secondaryValue && rule.secondaryUnit
                ? evaluateCalendar(last.at, rule.secondaryValue, rule.secondaryUnit, postponement?.postponedUntilDate)
                : null,
        ]
        : [evaluateCalendar(last.at, interval, rule.periodicityUnit, postponement?.postponedUntilDate)];
    const measured = candidates.filter(Boolean);

    if (!measured.length) {
        return { ...base, status: isHours ? 'sin_horometro' : 'nunca_realizada', remainingDays: null, remainingHours: null };
    }

    // Con doble intervalo manda el más urgente: peor estado y, a igual estado, el que tiene menos margen.
    const [driver] = measured.sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || a.ratio - b.ratio);
    return { ...base, status: driver.status, ...driver.fields };
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
            MaintenanceRecord.findAll({ where: { equipmentId, hoursReading: { [Op.ne]: null }, voidedAt: null } }),
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
                secondaryValue: data.secondaryValue,
                secondaryUnit: data.secondaryUnit,
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
                secondaryValue: data.secondaryValue,
                secondaryUnit: data.secondaryUnit,
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

    // Mismo criterio que las alertas: el registro de la regla con performedAt más reciente.
    static async getLastRuleRecord(equipmentId, ruleId) {
        return MaintenanceRecord.findOne({ where: { equipmentId, ruleId, voidedAt: null }, order: [['performedAt', 'DESC']] });
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
                { model: MaintenanceFault, as: 'fault', attributes: ['id', 'description', 'severity'] },
                { model: MaintenanceRecordAttachment, as: 'attachments' },
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
                { model: MaintenanceFault, as: 'fault', attributes: ['id', 'description', 'severity'] },
                { model: MaintenanceRecordAttachment, as: 'attachments' },
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
                performedByType: data.performedByType,
                provider: data.provider,
                cost: data.cost,
                createdBy: data.createdBy,
                createdById: data.createdById,
                createdByKind: data.createdByKind,
            }, { transaction });

            // El registro que atiende una falla la cierra en la misma transacción.
            if (data.fault) {
                await MaintenanceFault.update(
                    { status: 'cerrada', recordId: record.id, closedAt: data.performedAt, cause: data.fault.cause },
                    { where: { id: data.fault.id }, transaction },
                );
            }

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
                performedByType: data.performedByType,
                provider: data.provider,
                cost: data.cost,
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

    // Aprueba y, si el registro usó materiales, los descuenta de la bodega en la misma transacción:
    // sin stock suficiente no se aprueba nada.
    static async approveRecord(id, approver, stockExit) {
        await db.transaction(async (transaction) => {
            if (stockExit) {
                await TransactionService.exitProducts(stockExit, transaction);
            }
            await MaintenanceRecord.update(
                {
                    approvedBy: approver.name,
                    approvedById: approver.id,
                    approvedByKind: approver.kind,
                    approvedAt: new Date(),
                    stockWarehouseId: stockExit?.warehouseFromId ?? null,
                },
                { where: { id }, transaction },
            );
        });
        return MaintenanceService.getRecordById(id);
    }

    // Anula el registro y, si había cerrado una falla, la vuelve a abrir: el trabajo que la atendía ya no vale.
    static async voidRecord(id, data, stockReturn) {
        return db.transaction(async (transaction) => {
            await MaintenanceRecord.update(data, { where: { id }, transaction });
            if (stockReturn) {
                await TransactionService.returnProducts(stockReturn, transaction);
            }
            await MaintenanceFault.update(
                { status: 'abierta', recordId: null, closedAt: null },
                { where: { recordId: id }, transaction },
            );
        });
    }

    // ATTACHMENTS
    static async addAttachments(rows) {
        return MaintenanceRecordAttachment.bulkCreate(rows);
    }

    static async getAttachmentById(id) {
        return MaintenanceRecordAttachment.findByPk(id);
    }

    static async deleteAttachment(id) {
        return MaintenanceRecordAttachment.destroy({ where: { id } });
    }

    // FAULTS
    static async getFaults(filters) {
        const where = {};
        if (filters.yachtId) where.yachtId = filters.yachtId;
        if (filters.equipmentId) where.equipmentId = filters.equipmentId;
        if (filters.status) where.status = filters.status;
        return MaintenanceFault.findAll({
            where,
            // 'abierta' < 'cerrada': las abiertas primero, las más recientes arriba.
            order: [['status', 'ASC'], ['reportedAt', 'DESC']],
            include: [{ model: YachtEquipment, as: 'equipment', attributes: ['id', 'name'] }],
        });
    }

    static async getFaultById(id) {
        return MaintenanceFault.findByPk(id);
    }

    static async createFault(data) {
        return MaintenanceFault.create(data);
    }

    static async updateFault(id, data) {
        return MaintenanceFault.update(data, { where: { id } });
    }

    // ALERTS
    static async getRuleAlerts(yachtId) {
        const equipmentWhere = { active: true };
        if (yachtId) equipmentWhere.yachtId = yachtId;

        const assignments = await MaintenanceRuleAssignment.findAll({
            where: { active: true },
            include: [
                { model: MaintenanceRule, as: 'rule', where: { active: true } },
                { model: YachtEquipment, as: 'equipment', where: equipmentWhere, attributes: ['id', 'name', 'yachtId', 'critical'] },
            ],
        });

        if (!assignments.length) return [];

        const equipmentIds = [...new Set(assignments.map((assignment) => assignment.equipmentId))];
        const [records, readings] = await Promise.all([
            MaintenanceRecord.findAll({
                where: { equipmentId: { [Op.in]: equipmentIds }, voidedAt: null },
                order: [['performedAt', 'DESC']],
            }),
            EquipmentHourReading.findAll({ where: { equipmentId: { [Op.in]: equipmentIds } } }),
        ]);

        const recordsByEquipment = groupByEquipment(records);
        const readingsByEquipment = groupByEquipment(readings);

        return assignments.map((assignment) => {
            const equipmentRecords = recordsByEquipment.get(assignment.equipmentId) ?? [];
            const equipmentReadings = readingsByEquipment.get(assignment.equipmentId) ?? [];
            const current = resolveCurrentHours(equipmentReadings, equipmentRecords);
            const alert = buildRuleAlert(assignment, equipmentRecords, current);
            if (alert.remainingHours == null) return alert;
            // Fecha estimada de un vencimiento por horas según el uso real del equipo.
            const hoursPerDay = estimateDailyUsage(equipmentReadings, equipmentRecords);
            if (!hoursPerDay) return alert;
            return {
                ...alert,
                hoursPerDay: Math.round(hoursPerDay * 10) / 10,
                estimatedDueAt: dayjs().add(Math.max(0, alert.remainingHours) / hoursPerDay, 'day').toISOString(),
            };
        });
    }

    // Bodegas de inventario del barco de las que salen los materiales de mantenimiento (no la del bar).
    static async getYachtStockWarehouses(yachtId) {
        return Warehouse.findAll({
            where: { yachtId, type: { [Op.ne]: 'Bar' } },
            attributes: ['id', 'name', 'type'],
            order: [['name', 'ASC']],
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
                        { model: MaintenanceFault, as: 'fault', attributes: ['id', 'description', 'severity'] },
                        { model: MaintenanceRecordAttachment, as: 'attachments' },
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
            const current = resolveCurrentHours(item.hourReadings, item.records.filter((record) => !record.voidedAt));
            item.dataValues.currentHours = current?.hours ?? null;
            item.dataValues.hoursReadAt = current?.readAt ?? null;
            delete item.dataValues.hourReadings;
        });
        return equipment;
    }
}

module.exports = MaintenanceService;
