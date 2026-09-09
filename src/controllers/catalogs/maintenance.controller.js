const MaintenanceService = require('../../services/catalogs/maintenance.services');
const AppError = require('../../errors/AppError');
const Utils = require('../../utils/Utils');

const decodeId = (value, fieldName) => {
    let id;
    try {
        id = Utils.decode(value);
    } catch {
        throw new AppError(`${fieldName} inválido`, 400);
    }
    if (!Number.isInteger(id) || id <= 0) {
        throw new AppError(`${fieldName} inválido`, 400);
    }
    return id;
};

const decodeOptionalId = (value, fieldName) => {
    if (!value || value === 'undefined' || value === 'null') {
        return undefined;
    }
    return decodeId(value, fieldName);
};

const encodeInstanceField = (instance, field) => {
    if (instance?.dataValues?.[field] !== undefined && instance.dataValues[field] !== null) {
        instance.dataValues[field] = Utils.encode(instance.dataValues[field]);
    }
};

// EQUIPMENT

const validateEquipmentPayload = (body) => {
    const { yachtId, name } = body;
    if (!yachtId || typeof name !== 'string' || !name.trim()) {
        throw new AppError('yachtId y name son obligatorios', 400);
    }
};

const getAllEquipment = async (req, res, next) => {
    try {
        const yachtId = decodeOptionalId(req.query.yachtId, 'ID de yate');
        const result = await MaintenanceService.getAllEquipment(yachtId);
        result.forEach((equipment) => {
            encodeInstanceField(equipment, 'id');
            encodeInstanceField(equipment, 'yachtId');
        });
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const createEquipment = async (req, res, next) => {
    try {
        validateEquipmentPayload(req.body);
        const { yachtId, name, brand, model, serialNumber, power, rpm } = req.body;
        await MaintenanceService.createEquipment({
            yachtId: decodeId(yachtId, 'ID de yate'),
            name,
            brand: brand ?? null,
            model: model ?? null,
            serialNumber: serialNumber ?? null,
            power: power ?? null,
            rpm: rpm ?? null,
        });
        res.status(200).json({ data: 'resource created successfully' });
    } catch (error) {
        next(error);
    }
};

const updateEquipment = async (req, res, next) => {
    try {
        const equipmentId = decodeId(req.params.equipment_id, 'ID de equipo');
        const existing = await MaintenanceService.getEquipmentById(equipmentId);
        if (!existing) {
            throw new AppError('Equipo no encontrado', 404);
        }
        validateEquipmentPayload(req.body);
        const { yachtId, name, brand, model, serialNumber, power, rpm, active } = req.body;
        await MaintenanceService.updateEquipment(equipmentId, {
            yachtId: decodeId(yachtId, 'ID de yate'),
            name,
            brand: brand ?? null,
            model: model ?? null,
            serialNumber: serialNumber ?? null,
            power: power ?? null,
            rpm: rpm ?? null,
            active: active !== undefined ? active : true,
        });
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        next(error);
    }
};

// RULES

const PERIODICITY_UNITS = ['horas', 'dias', 'meses', 'anios'];

const validateRecommendedMaterials = (materials) => {
    if (materials === undefined) return;
    if (!Array.isArray(materials)) {
        throw new AppError('recommendedMaterials debe ser un array', 400);
    }
    materials.forEach((material) => {
        if (!material || !Number.isInteger(material.recommendedQuantity) || material.recommendedQuantity <= 0) {
            throw new AppError('Cada material recomendado debe incluir productId y recommendedQuantity > 0', 400);
        }
    });
};

const validatePeriodicityUnit = (unit) => {
    if (unit === undefined || unit === null) return;
    if (!PERIODICITY_UNITS.includes(unit)) {
        throw new AppError(`periodicityUnit debe ser uno de: ${PERIODICITY_UNITS.join(', ')}`, 400);
    }
};

const encodeRule = (rule) => {
    encodeInstanceField(rule, 'id');
    rule.dataValues.recommendedMaterials.forEach((material) => {
        encodeInstanceField(material, 'id');
        encodeInstanceField(material, 'ruleId');
        encodeInstanceField(material, 'productId');
        encodeInstanceField(material.dataValues.product, 'id');
    });
};

const getAllRules = async (req, res, next) => {
    try {
        const result = await MaintenanceService.getAllRules();
        result.forEach(encodeRule);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const createRule = async (req, res, next) => {
    try {
        const { name, periodicityValue, periodicityUnit, instructions, recommendedMaterials } = req.body;
        if (typeof name !== 'string' || !name.trim()) {
            throw new AppError('name es obligatorio', 400);
        }
        validatePeriodicityUnit(periodicityUnit);
        validateRecommendedMaterials(recommendedMaterials);

        const decodedMaterials = (recommendedMaterials || []).map((m) => ({
            productId: decodeId(m.productId, 'ID de producto'),
            recommendedQuantity: m.recommendedQuantity,
        }));

        await MaintenanceService.createRule({
            name,
            periodicityValue: periodicityValue ?? null,
            periodicityUnit: periodicityUnit ?? null,
            instructions: instructions ?? null,
            recommendedMaterials: decodedMaterials,
        });
        res.status(200).json({ data: 'resource created successfully' });
    } catch (error) {
        next(error);
    }
};

const updateRule = async (req, res, next) => {
    try {
        const ruleId = decodeId(req.params.rule_id, 'ID de regla');
        const existing = await MaintenanceService.getRuleById(ruleId);
        if (!existing) {
            throw new AppError('Regla no encontrada', 404);
        }

        const { name, periodicityValue, periodicityUnit, instructions, active, recommendedMaterials } = req.body;
        if (typeof name !== 'string' || !name.trim()) {
            throw new AppError('name es obligatorio', 400);
        }
        validatePeriodicityUnit(periodicityUnit);
        validateRecommendedMaterials(recommendedMaterials);

        const decodedMaterials = (recommendedMaterials || []).map((m) => ({
            productId: decodeId(m.productId, 'ID de producto'),
            recommendedQuantity: m.recommendedQuantity,
        }));

        await MaintenanceService.updateRule(ruleId, {
            name,
            periodicityValue: periodicityValue ?? null,
            periodicityUnit: periodicityUnit ?? null,
            instructions: instructions ?? null,
            active: active !== undefined ? active : true,
            recommendedMaterials: decodedMaterials,
        });
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        next(error);
    }
};

// RULE ASSIGNMENTS

const getEquipmentRules = async (req, res, next) => {
    try {
        const equipmentId = decodeId(req.params.equipment_id, 'ID de equipo');
        const equipment = await MaintenanceService.getEquipmentById(equipmentId);
        if (!equipment) {
            throw new AppError('Equipo no encontrado', 404);
        }
        const result = await MaintenanceService.getRuleAssignmentsByEquipment(equipmentId);
        result.forEach((assignment) => {
            encodeInstanceField(assignment, 'id');
            encodeInstanceField(assignment, 'equipmentId');
            encodeInstanceField(assignment, 'ruleId');
            encodeInstanceField(assignment.dataValues.rule, 'id');
        });
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const createRuleAssignment = async (req, res, next) => {
    try {
        const { equipmentId, ruleId } = req.body;
        if (!equipmentId || !ruleId) {
            throw new AppError('equipmentId y ruleId son obligatorios', 400);
        }
        const decodedEquipmentId = decodeId(equipmentId, 'ID de equipo');
        const decodedRuleId = decodeId(ruleId, 'ID de regla');

        const equipment = await MaintenanceService.getEquipmentById(decodedEquipmentId);
        if (!equipment) {
            throw new AppError('Equipo no encontrado', 404);
        }
        const rule = await MaintenanceService.getRuleById(decodedRuleId);
        if (!rule) {
            throw new AppError('Regla no encontrada', 404);
        }
        const existing = await MaintenanceService.findRuleAssignment(decodedEquipmentId, decodedRuleId);
        if (existing) {
            throw new AppError('Esta regla ya está asignada a este equipo', 409);
        }

        await MaintenanceService.createRuleAssignment(decodedEquipmentId, decodedRuleId);
        res.status(200).json({ data: 'resource created successfully' });
    } catch (error) {
        next(error);
    }
};

const updateRuleAssignment = async (req, res, next) => {
    try {
        const assignmentId = decodeId(req.params.assignment_id, 'ID de asignación');
        const { active } = req.body;
        if (typeof active !== 'boolean') {
            throw new AppError('active es obligatorio y debe ser booleano', 400);
        }
        const existing = await MaintenanceService.getRuleAssignmentById(assignmentId);
        if (!existing) {
            throw new AppError('Asignación no encontrada', 404);
        }
        await MaintenanceService.updateRuleAssignment(assignmentId, active);
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        next(error);
    }
};

// RECORDS (historial)

const requireValidDate = (value, fieldName) => {
    if (!value || Number.isNaN(new Date(value).getTime())) {
        throw new AppError(`${fieldName} inválida`, 400);
    }
    return new Date(value);
};

const validateMaterials = (materials) => {
    if (materials === undefined) return;
    if (!Array.isArray(materials)) {
        throw new AppError('materials debe ser un array', 400);
    }
    materials.forEach((material) => {
        if (!material || !Number.isInteger(material.quantity) || material.quantity <= 0) {
            throw new AppError('Cada material debe incluir productId y quantity > 0', 400);
        }
    });
};

const MAINTENANCE_TYPES = ['preventivo', 'correctivo'];

const validateMaintenanceType = (maintenanceType) => {
    if (maintenanceType === undefined || maintenanceType === null) return;
    if (!MAINTENANCE_TYPES.includes(maintenanceType)) {
        throw new AppError(`maintenanceType debe ser uno de: ${MAINTENANCE_TYPES.join(', ')}`, 400);
    }
};

// Si el cliente no especifica el tipo, se infiere de si el registro está
// ligado a una regla preventiva o no.
const resolveMaintenanceType = (maintenanceType, ruleId) => maintenanceType ?? (ruleId ? 'preventivo' : 'correctivo');

const encodeRecord = (record) => {
    encodeInstanceField(record, 'id');
    encodeInstanceField(record, 'equipmentId');
    encodeInstanceField(record, 'yachtId');
    if (record.dataValues.ruleId) {
        encodeInstanceField(record, 'ruleId');
    }
    encodeInstanceField(record.dataValues.equipment, 'id');
    if (record.dataValues.rule) {
        encodeInstanceField(record.dataValues.rule, 'id');
    }
    record.dataValues.materials.forEach((material) => {
        encodeInstanceField(material, 'id');
        encodeInstanceField(material, 'recordId');
        encodeInstanceField(material, 'productId');
        encodeInstanceField(material.dataValues.product, 'id');
    });
};

const validateRecordPayload = (body) => {
    const { equipmentId, responsible, workPerformed, performedAt } = body;
    if (!equipmentId || typeof responsible !== 'string' || !responsible.trim()
        || typeof workPerformed !== 'string' || !workPerformed.trim()) {
        throw new AppError('equipmentId, responsible y workPerformed son obligatorios', 400);
    }
    requireValidDate(performedAt, 'performedAt');
    validateMaterials(body.materials);
    validateMaintenanceType(body.maintenanceType);
};

const getAllRecords = async (req, res, next) => {
    try {
        const filters = {
            yachtId: decodeOptionalId(req.query.yachtId, 'ID de yate'),
            equipmentId: decodeOptionalId(req.query.equipmentId, 'ID de equipo'),
            ruleId: decodeOptionalId(req.query.ruleId, 'ID de regla'),
            from: req.query.from ? requireValidDate(req.query.from, 'from') : undefined,
            to: req.query.to ? requireValidDate(req.query.to, 'to') : undefined,
        };
        const result = await MaintenanceService.getAllRecords(filters);
        result.forEach(encodeRecord);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const getRecord = async (req, res, next) => {
    try {
        const recordId = decodeId(req.params.record_id, 'ID de registro');
        const result = await MaintenanceService.getRecordById(recordId);
        if (!result) {
            throw new AppError('Registro no encontrado', 404);
        }
        encodeRecord(result);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const createRecord = async (req, res, next) => {
    try {
        validateRecordPayload(req.body);
        const { equipmentId, ruleId, responsible, workPerformed, performedAt, hoursReading, observation, materials, maintenanceType } = req.body;

        const decodedEquipmentId = decodeId(equipmentId, 'ID de equipo');
        const equipment = await MaintenanceService.getEquipmentById(decodedEquipmentId);
        if (!equipment) {
            throw new AppError('Equipo no encontrado', 404);
        }

        const decodedRuleId = decodeOptionalId(ruleId, 'ID de regla');
        if (decodedRuleId) {
            const rule = await MaintenanceService.getRuleById(decodedRuleId);
            if (!rule || !rule.active) {
                throw new AppError('Regla de mantenimiento no encontrada o inactiva', 400);
            }
        }

        const decodedMaterials = (materials || []).map((m) => ({
            productId: decodeId(m.productId, 'ID de producto'),
            quantity: m.quantity,
        }));

        await MaintenanceService.createRecord({
            equipmentId: decodedEquipmentId,
            yachtId: equipment.yachtId,
            ruleId: decodedRuleId || null,
            responsible,
            workPerformed,
            performedAt: new Date(performedAt),
            hoursReading: hoursReading ?? null,
            observation: observation ?? null,
            materials: decodedMaterials,
            maintenanceType: resolveMaintenanceType(maintenanceType, decodedRuleId),
        });

        res.status(200).json({ data: 'resource created successfully' });
    } catch (error) {
        next(error);
    }
};

const updateRecord = async (req, res, next) => {
    try {
        const recordId = decodeId(req.params.record_id, 'ID de registro');
        const existing = await MaintenanceService.getRecordById(recordId);
        if (!existing) {
            throw new AppError('Registro no encontrado', 404);
        }
        if (existing.approvedAt) {
            throw new AppError('No se puede editar un registro ya aprobado', 409);
        }

        validateRecordPayload(req.body);
        const { equipmentId, ruleId, responsible, workPerformed, performedAt, hoursReading, observation, materials, maintenanceType } = req.body;

        const decodedEquipmentId = decodeId(equipmentId, 'ID de equipo');
        const equipment = await MaintenanceService.getEquipmentById(decodedEquipmentId);
        if (!equipment) {
            throw new AppError('Equipo no encontrado', 404);
        }

        const decodedRuleId = decodeOptionalId(ruleId, 'ID de regla');
        if (decodedRuleId) {
            const rule = await MaintenanceService.getRuleById(decodedRuleId);
            if (!rule || !rule.active) {
                throw new AppError('Regla de mantenimiento no encontrada o inactiva', 400);
            }
        }

        const decodedMaterials = (materials || []).map((m) => ({
            productId: decodeId(m.productId, 'ID de producto'),
            quantity: m.quantity,
        }));

        await MaintenanceService.updateRecord(recordId, {
            equipmentId: decodedEquipmentId,
            yachtId: equipment.yachtId,
            ruleId: decodedRuleId || null,
            responsible,
            workPerformed,
            performedAt: new Date(performedAt),
            hoursReading: hoursReading ?? null,
            observation: observation ?? null,
            materials: decodedMaterials,
            maintenanceType: resolveMaintenanceType(maintenanceType, decodedRuleId),
        });

        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        next(error);
    }
};

const approveRecord = async (req, res, next) => {
    try {
        const recordId = decodeId(req.params.record_id, 'ID de registro');
        const { approvedBy } = req.body;
        if (typeof approvedBy !== 'string' || !approvedBy.trim()) {
            throw new AppError('approvedBy es obligatorio', 400);
        }

        const existing = await MaintenanceService.getRecordById(recordId);
        if (!existing) {
            throw new AppError('Registro no encontrado', 404);
        }
        if (existing.approvedAt) {
            throw new AppError('Registro ya aprobado', 409);
        }

        await MaintenanceService.approveRecord(recordId, approvedBy);
        res.status(200).json({ data: 'resource approved successfully' });
    } catch (error) {
        next(error);
    }
};

// ALERTS

const getRuleAlerts = async (req, res, next) => {
    try {
        const yachtId = decodeOptionalId(req.query.yachtId, 'ID de yate');
        const alerts = await MaintenanceService.getRuleAlerts(yachtId);
        const encoded = alerts.map((alert) => ({
            ...alert,
            equipmentId: Utils.encode(alert.equipmentId),
            yachtId: Utils.encode(alert.yachtId),
            ruleId: Utils.encode(alert.ruleId),
        }));
        res.status(200).json(encoded);
    } catch (error) {
        next(error);
    }
};

// BOOK

const getMaintenanceBook = async (req, res, next) => {
    try {
        const yachtId = decodeId(req.params.yacht_id, 'ID de yate');
        const yacht = await MaintenanceService.getYachtForBook(yachtId);
        if (!yacht) {
            throw new AppError('Yate no encontrado', 404);
        }
        const equipment = await MaintenanceService.getMaintenanceBook(yachtId);

        encodeInstanceField(yacht, 'id');

        const equipmentBook = equipment.map((item) => {
            encodeInstanceField(item, 'id');
            encodeInstanceField(item, 'yachtId');

            const rules = item.dataValues.ruleAssignments.map((assignment) => {
                const rule = assignment.dataValues.rule;
                encodeRule(rule);
                return rule;
            });

            const history = item.dataValues.records.map((record) => {
                encodeRecord(record);
                return record;
            });

            item.dataValues.rules = rules;
            item.dataValues.history = history;
            delete item.dataValues.ruleAssignments;
            delete item.dataValues.records;
            return item;
        });

        res.status(200).json({ yacht, equipment: equipmentBook });
    } catch (error) {
        next(error);
    }
};

const MaintenanceController = {
    getAllEquipment,
    createEquipment,
    updateEquipment,
    getAllRules,
    createRule,
    updateRule,
    getEquipmentRules,
    createRuleAssignment,
    updateRuleAssignment,
    getAllRecords,
    getRecord,
    createRecord,
    updateRecord,
    approveRecord,
    getRuleAlerts,
    getMaintenanceBook,
};
module.exports = MaintenanceController;
