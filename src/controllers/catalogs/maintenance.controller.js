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

// Usuario logueado que firma la acción (registrar, aprobar, reportar).
const getActor = (req) => ({
    id: req.userId ? decodeId(req.userId, 'usuario') : null,
    kind: req.userKind ?? null,
    name: req.userName ?? null,
});

// EQUIPMENT

const EQUIPMENT_CATEGORIES = ['propulsion', 'generacion', 'electrico', 'seguridad', 'navegacion', 'casco', 'hidraulico', 'otros'];

const parseEquipmentClass = ({ category, critical }) => {
    if (category != null && !EQUIPMENT_CATEGORIES.includes(category)) {
        throw new AppError(`category debe ser uno de: ${EQUIPMENT_CATEGORIES.join(', ')}`, 400);
    }
    if (critical != null && typeof critical !== 'boolean') {
        throw new AppError('critical debe ser booleano', 400);
    }
    return { category: category ?? null, critical: Boolean(critical) };
};

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
            ...parseEquipmentClass(req.body),
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
            ...parseEquipmentClass(req.body),
            active: active !== undefined ? active : true,
        });
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        next(error);
    }
};

// HOUR READINGS

const parsePastDate = (value, fieldName) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime()) || date > new Date()) {
        throw new AppError(`${fieldName} debe ser una fecha válida y no futura`, 400);
    }
    return date;
};

const parseHours = (value, fieldName) => {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
        throw new AppError(`${fieldName} debe ser un número mayor o igual a 0`, 400);
    }
    return value;
};

const createHourReading = async (req, res, next) => {
    try {
        const equipmentId = decodeId(req.params.equipment_id, 'ID de equipo');
        const equipment = await MaintenanceService.getEquipmentById(equipmentId);
        if (!equipment) {
            throw new AppError('Equipo no encontrado', 404);
        }
        const reading = parseHours(req.body.reading, 'reading');
        const readAt = req.body.readAt ? parsePastDate(req.body.readAt, 'readAt') : new Date();

        const current = await MaintenanceService.getCurrentHours(equipmentId);
        if (current && reading < current.hours) {
            throw new AppError(`La lectura no puede ser menor a la última registrada (${current.hours} h)`, 400);
        }

        const actor = getActor(req);
        await MaintenanceService.createHourReading({
            equipmentId,
            reading,
            readAt,
            registeredById: actor.id,
            registeredByKind: actor.kind,
        });
        res.status(200).json({ data: 'resource created successfully' });
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

const CALENDAR_UNITS = ['dias', 'meses', 'anios'];

// Segundo intervalo (solo calendario y solo en reglas por horas); ambos vacíos = sin segundo intervalo.
const parseSecondaryInterval = ({ periodicityUnit, secondaryValue, secondaryUnit }) => {
    if (secondaryValue == null && secondaryUnit == null) return { secondaryValue: null, secondaryUnit: null };
    if (periodicityUnit !== 'horas') {
        throw new AppError('El segundo intervalo solo aplica a reglas por horas', 400);
    }
    if (!CALENDAR_UNITS.includes(secondaryUnit) || typeof secondaryValue !== 'number' || !(secondaryValue > 0)) {
        throw new AppError(`El segundo intervalo necesita un valor mayor a 0 y una unidad: ${CALENDAR_UNITS.join(', ')}`, 400);
    }
    return { secondaryValue, secondaryUnit };
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
        const secondary = parseSecondaryInterval(req.body);

        const decodedMaterials = (recommendedMaterials || []).map((m) => ({
            productId: decodeId(m.productId, 'ID de producto'),
            recommendedQuantity: m.recommendedQuantity,
        }));

        await MaintenanceService.createRule({
            name,
            periodicityValue: periodicityValue ?? null,
            periodicityUnit: periodicityUnit ?? null,
            ...secondary,
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
        const secondary = parseSecondaryInterval(req.body);

        const decodedMaterials = (recommendedMaterials || []).map((m) => ({
            productId: decodeId(m.productId, 'ID de producto'),
            recommendedQuantity: m.recommendedQuantity,
        }));

        await MaintenanceService.updateRule(ruleId, {
            name,
            periodicityValue: periodicityValue ?? null,
            periodicityUnit: periodicityUnit ?? null,
            ...secondary,
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

// Línea base opcional: solo se tocan los campos que vienen en el body (null los limpia).
const parseBaseline = (body) => {
    const baseline = {};
    if (body.baselineDate !== undefined) {
        baseline.baselineDate = body.baselineDate === null ? null : parsePastDate(body.baselineDate, 'baselineDate');
    }
    if (body.baselineHours !== undefined) {
        baseline.baselineHours = body.baselineHours === null ? null : parseHours(body.baselineHours, 'baselineHours');
    }
    if (body.intervalOverride !== undefined) {
        if (body.intervalOverride !== null && !(typeof body.intervalOverride === 'number' && body.intervalOverride > 0)) {
            throw new AppError('intervalOverride debe ser un número mayor a 0', 400);
        }
        baseline.intervalOverride = body.intervalOverride;
    }
    return baseline;
};

const createRuleAssignment = async (req, res, next) => {
    try {
        const { equipmentId, ruleId } = req.body;
        if (!equipmentId || !ruleId) {
            throw new AppError('equipmentId y ruleId son obligatorios', 400);
        }
        const baseline = parseBaseline(req.body);
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

        await MaintenanceService.createRuleAssignment(decodedEquipmentId, decodedRuleId, baseline);
        res.status(200).json({ data: 'resource created successfully' });
    } catch (error) {
        next(error);
    }
};

const updateRuleAssignment = async (req, res, next) => {
    try {
        const assignmentId = decodeId(req.params.assignment_id, 'ID de asignación');
        const { active } = req.body;
        const data = parseBaseline(req.body);
        if (typeof active === 'boolean') data.active = active;
        if (active !== undefined && typeof active !== 'boolean' || !Object.keys(data).length) {
            throw new AppError('Envía active (booleano), la línea base (baselineDate, baselineHours) o intervalOverride', 400);
        }
        const existing = await MaintenanceService.getRuleAssignmentById(assignmentId);
        if (!existing) {
            throw new AppError('Asignación no encontrada', 404);
        }
        await MaintenanceService.updateRuleAssignment(assignmentId, data);
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        next(error);
    }
};

const postponeRuleAssignment = async (req, res, next) => {
    try {
        const assignmentId = decodeId(req.params.assignment_id, 'ID de asignación');
        const { untilDate, untilHours, reason } = req.body;
        if (typeof reason !== 'string' || !reason.trim()) {
            throw new AppError('El motivo de la posposición es obligatorio', 400);
        }
        if (untilDate == null && untilHours == null) {
            throw new AppError('Indica hasta qué fecha (untilDate) o hasta qué horas (untilHours) se pospone', 400);
        }
        const date = untilDate == null ? null : new Date(untilDate);
        if (date && (Number.isNaN(date.getTime()) || date <= new Date())) {
            throw new AppError('untilDate debe ser una fecha futura', 400);
        }
        const hours = untilHours == null ? null : parseHours(untilHours, 'untilHours');
        const existing = await MaintenanceService.getRuleAssignmentById(assignmentId);
        if (!existing) {
            throw new AppError('Asignación no encontrada', 404);
        }
        const actor = getActor(req);
        const lastRecord = await MaintenanceService.getLastRuleRecord(existing.equipmentId, existing.ruleId);
        await MaintenanceService.updateRuleAssignment(assignmentId, {
            postponedAfterRecordId: lastRecord?.id ?? null,
            postponedUntilDate: date,
            postponedUntilHours: hours,
            postponeReason: reason.trim(),
            postponedBy: actor.name,
            postponedById: actor.id,
            postponedByKind: actor.kind,
            postponedAt: new Date(),
        });
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
    encodeInstanceField(record, 'createdById');
    encodeInstanceField(record, 'approvedById');
    encodeInstanceField(record, 'voidedById');
    if (record.dataValues.cost != null) {
        record.dataValues.cost = Number(record.dataValues.cost);
    }
    encodeInstanceField(record.dataValues.equipment, 'id');
    if (record.dataValues.rule) {
        encodeInstanceField(record.dataValues.rule, 'id');
    }
    if (record.dataValues.fault) {
        encodeInstanceField(record.dataValues.fault, 'id');
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

const PERFORMED_BY_TYPES = ['tripulacion', 'taller'];

// Quién ejecutó el trabajo, proveedor y costo: todos opcionales.
const parseExecution = ({ performedByType, provider, cost }) => {
    if (performedByType != null && !PERFORMED_BY_TYPES.includes(performedByType)) {
        throw new AppError(`performedByType debe ser uno de: ${PERFORMED_BY_TYPES.join(', ')}`, 400);
    }
    if (provider != null && typeof provider !== 'string') {
        throw new AppError('provider debe ser texto', 400);
    }
    if (cost != null && !(typeof cost === 'number' && Number.isFinite(cost) && cost >= 0)) {
        throw new AppError('cost debe ser un número mayor o igual a 0', 400);
    }
    return { performedByType: performedByType ?? null, provider: provider?.trim() || null, cost: cost ?? null };
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

// Falla que atiende el registro: debe existir, ser del mismo equipo y seguir abierta.
const resolveFaultToClose = async (faultId, equipmentId, cause) => {
    const decodedFaultId = decodeOptionalId(faultId, 'ID de falla');
    if (!decodedFaultId) return null;
    const fault = await MaintenanceService.getFaultById(decodedFaultId);
    if (!fault || fault.equipmentId !== equipmentId) {
        throw new AppError('La falla no existe o no pertenece a este equipo', 400);
    }
    if (fault.status !== 'abierta') {
        throw new AppError('La falla ya fue atendida', 409);
    }
    if (cause !== undefined && cause !== null && typeof cause !== 'string') {
        throw new AppError('cause debe ser texto', 400);
    }
    return { id: decodedFaultId, cause: cause?.trim() || null };
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

        const fault = await resolveFaultToClose(req.body.faultId, decodedEquipmentId, req.body.cause);
        const actor = getActor(req);
        await MaintenanceService.createRecord({
            fault,
            createdBy: actor.name,
            createdById: actor.id,
            createdByKind: actor.kind,
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
            ...parseExecution(req.body),
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
        if (existing.voidedAt) {
            throw new AppError('No se puede editar un registro anulado', 409);
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
            ...parseExecution(req.body),
        });

        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        next(error);
    }
};

const approveRecord = async (req, res, next) => {
    try {
        const recordId = decodeId(req.params.record_id, 'ID de registro');
        const actor = getActor(req);
        // Firma el usuario logueado; `approvedBy` del body solo cubre sesiones sin nombre en el token.
        const approvedBy = actor.name ?? (typeof req.body.approvedBy === 'string' ? req.body.approvedBy.trim() : '');
        if (!approvedBy) {
            throw new AppError('approvedBy es obligatorio', 400);
        }
        const existing = await MaintenanceService.getRecordById(recordId);
        if (!existing) {
            throw new AppError('Registro no encontrado', 404);
        }
        if (existing.approvedAt) {
            throw new AppError('Registro ya aprobado', 409);
        }
        if (existing.voidedAt) {
            throw new AppError('No se puede aprobar un registro anulado', 409);
        }
        if (existing.createdById != null && existing.createdById === actor.id && existing.createdByKind === actor.kind) {
            throw new AppError('No puedes aprobar un registro que cargaste tú; debe aprobarlo otra persona', 409);
        }
        await MaintenanceService.approveRecord(recordId, { ...actor, name: approvedBy });
        res.status(200).json({ data: 'resource approved successfully' });
    } catch (error) {
        next(error);
    }
};

const voidRecord = async (req, res, next) => {
    try {
        const recordId = decodeId(req.params.record_id, 'ID de registro');
        const { reason } = req.body;
        if (typeof reason !== 'string' || !reason.trim()) {
            throw new AppError('El motivo de la anulación es obligatorio', 400);
        }
        const existing = await MaintenanceService.getRecordById(recordId);
        if (!existing) {
            throw new AppError('Registro no encontrado', 404);
        }
        if (existing.voidedAt) {
            throw new AppError('El registro ya estaba anulado', 409);
        }
        const actor = getActor(req);
        await MaintenanceService.voidRecord(recordId, {
            voidedAt: new Date(),
            voidReason: reason.trim(),
            voidedBy: actor.name,
            voidedById: actor.id,
            voidedByKind: actor.kind,
        });
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        next(error);
    }
};

// FAULTS

const FAULT_SEVERITIES = ['baja', 'media', 'alta', 'critica'];
const FAULT_STATUSES = ['abierta', 'cerrada'];

const encodeFault = (fault) => {
    encodeInstanceField(fault, 'id');
    encodeInstanceField(fault, 'equipmentId');
    encodeInstanceField(fault, 'yachtId');
    encodeInstanceField(fault, 'recordId');
    encodeInstanceField(fault, 'reportedById');
    encodeInstanceField(fault.dataValues.equipment, 'id');
};

const validateFaultPayload = ({ description, severity }) => {
    if (typeof description !== 'string' || !description.trim()) {
        throw new AppError('description es obligatoria', 400);
    }
    if (!FAULT_SEVERITIES.includes(severity)) {
        throw new AppError(`severity debe ser uno de: ${FAULT_SEVERITIES.join(', ')}`, 400);
    }
};

const getFaults = async (req, res, next) => {
    try {
        const { status } = req.query;
        if (status && !FAULT_STATUSES.includes(status)) {
            throw new AppError(`status debe ser uno de: ${FAULT_STATUSES.join(', ')}`, 400);
        }
        const result = await MaintenanceService.getFaults({
            yachtId: decodeOptionalId(req.query.yachtId, 'ID de yate'),
            equipmentId: decodeOptionalId(req.query.equipmentId, 'ID de equipo'),
            status,
        });
        result.forEach(encodeFault);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const createFault = async (req, res, next) => {
    try {
        validateFaultPayload(req.body);
        const equipmentId = decodeId(req.body.equipmentId, 'ID de equipo');
        const equipment = await MaintenanceService.getEquipmentById(equipmentId);
        if (!equipment) {
            throw new AppError('Equipo no encontrado', 404);
        }
        const actor = getActor(req);
        await MaintenanceService.createFault({
            equipmentId,
            yachtId: equipment.yachtId,
            description: req.body.description.trim(),
            severity: req.body.severity,
            reportedAt: req.body.reportedAt ? parsePastDate(req.body.reportedAt, 'reportedAt') : new Date(),
            reportedBy: actor.name,
            reportedById: actor.id,
            reportedByKind: actor.kind,
        });
        res.status(200).json({ data: 'resource created successfully' });
    } catch (error) {
        next(error);
    }
};

const updateFault = async (req, res, next) => {
    try {
        const faultId = decodeId(req.params.fault_id, 'ID de falla');
        validateFaultPayload(req.body);
        const existing = await MaintenanceService.getFaultById(faultId);
        if (!existing) {
            throw new AppError('Falla no encontrada', 404);
        }
        if (existing.status !== 'abierta') {
            throw new AppError('No se puede editar una falla ya atendida', 409);
        }
        await MaintenanceService.updateFault(faultId, { description: req.body.description.trim(), severity: req.body.severity });
        res.status(200).json({ data: 'resource updated successfully' });
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
            assignmentId: Utils.encode(alert.assignmentId),
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
                if (assignment.intervalOverride != null) {
                    rule.dataValues.periodicityValue = assignment.intervalOverride;
                    rule.dataValues.intervalOverridden = true;
                }
                rule.dataValues.assignmentId = Utils.encode(assignment.id);
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
    createHourReading,
    getAllRules,
    createRule,
    updateRule,
    getEquipmentRules,
    createRuleAssignment,
    updateRuleAssignment,
    postponeRuleAssignment,
    getAllRecords,
    getRecord,
    createRecord,
    updateRecord,
    approveRecord,
    voidRecord,
    getFaults,
    createFault,
    updateFault,
    getRuleAlerts,
    getMaintenanceBook,
};
module.exports = MaintenanceController;
