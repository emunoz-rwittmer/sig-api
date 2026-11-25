const fs = require('fs');
const path = require('path');
const MaintenanceService = require('../../services/catalogs/maintenance.services');
const { MAINTENANCE_UPLOAD_DIR } = require('../../utils/uploadConfiguration');
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

const SYSTEM_ACTOR = { id: null, kind: 'system', name: 'Sistema' };

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
        if (!req.body.confirmDuplicate) await checkDuplicateSerial(serialNumber);
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
        // Solo se avisa si la serie cambió: un equipo que ya la tenía repetida se puede seguir editando.
        if (!req.body.confirmDuplicate && normalizeSerial(serialNumber) !== normalizeSerial(existing.serialNumber)) {
            await checkDuplicateSerial(serialNumber, equipmentId);
        }
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

// Margen para relojes algo adelantados: registrar "ahora" no cuenta como fecha futura.
const CLOCK_SKEW_MS = 10 * 60 * 1000;

const parsePastDate = (value, fieldName) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime()) || date.getTime() > Date.now() + CLOCK_SKEW_MS) {
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

const formatDay = (date) => new Date(date).toLocaleDateString('es-EC', { timeZone: 'America/Guayaquil' });

// El horómetro solo avanza: una lectura no puede ser menor a otra de antes ni mayor a otra de después.
// Se compara en horas acumuladas (respetando reinicios) y se muestra lo que marcaba el horómetro.
const checkHoursFit = ({ points, toLifetime }, at, meter) => {
    const time = new Date(at).getTime();
    const hours = toLifetime(meter, at);
    const before = points.filter((point) => point.at.getTime() <= time && point.hours > hours).sort((a, b) => b.hours - a.hours)[0];
    if (before) {
        throw new AppError(`El horómetro no cuadra: el ${formatDay(before.at)} ya marcaba ${before.meter} h y no puede bajar a ${meter} h. Si se cambió o reinició el horómetro, regístralo como reinicio`, 400, 'HOURS_OUT_OF_ORDER');
    }
    const after = points.filter((point) => point.at.getTime() > time && point.hours < hours).sort((a, b) => a.hours - b.hours)[0];
    if (after) {
        throw new AppError(`El horómetro no cuadra: el ${formatDay(after.at)} marcaba ${after.meter} h, menos que las ${meter} h que indicas para una fecha anterior`, 400, 'HOURS_OUT_OF_ORDER');
    }
};

// Mismo trabajo (regla) en el mismo equipo a pocos días: casi siempre es una carga repetida.
const DUPLICATE_WINDOW_DAYS = 3;
const checkDuplicateRecord = async ({ equipmentId, ruleId, performedAt, excludeRecordId }) => {
    const nearby = await MaintenanceService.findNearbyRecord({ equipmentId, ruleId, performedAt, days: DUPLICATE_WINDOW_DAYS, excludeRecordId });
    if (nearby) {
        const hours = nearby.hoursReading != null ? ` (${nearby.hoursReading} h)` : '';
        throw new AppError(`Ya hay un registro de "${nearby.workPerformed}" en este equipo el ${formatDay(nearby.performedAt)}${hours}. ¿Es otro trabajo distinto?`, 409, 'DUPLICATE_RECORD');
    }
};

// Valores de relleno que no identifican a un equipo ("N/A", "NA", "-", "S/N").
const isPlaceholderSerial = (value) => /^(n\/?a|s\/?n|-+|ninguno|no aplica)?$/i.test(String(value ?? '').trim());
const normalizeSerial = (value) => String(value ?? '').toUpperCase().replace(/\s+/g, '');
const checkDuplicateSerial = async (serialNumber, excludeId = null) => {
    if (isPlaceholderSerial(serialNumber)) return;
    const others = await MaintenanceService.getEquipmentWithSerial(excludeId);
    const same = others.find((item) => !isPlaceholderSerial(item.serialNumber) && normalizeSerial(item.serialNumber) === normalizeSerial(serialNumber));
    if (same) {
        const yacht = same.yacht?.name ? ` del ${same.yacht.name}` : '';
        throw new AppError(`El número de serie ${serialNumber.trim()} ya lo tiene "${same.name}"${yacht}. ¿Es de verdad otro equipo con la misma serie?`, 409, 'DUPLICATE_SERIAL');
    }
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
        const hourPoints = await MaintenanceService.getHourPoints(equipmentId);

        // Reinicio: horómetro cambiado o puesto en cero. Exige motivo y lo último que marcó el viejo.
        const resetReason = typeof req.body.resetReason === 'string' ? req.body.resetReason.trim() : '';
        let previousReading = null;
        if (req.body.resetReason != null) {
            if (!resetReason) throw new AppError('Indica el motivo del reinicio del horómetro', 400);
            previousReading = parseHours(req.body.previousReading, 'previousReading');
            const later = hourPoints.points.find((point) => point.at.getTime() > readAt.getTime());
            if (later) {
                throw new AppError(`Hay una lectura del ${formatDay(later.at)}, posterior a este reinicio. El reinicio debe ser la última lectura del equipo`, 400, 'HOURS_OUT_OF_ORDER');
            }
            checkHoursFit(hourPoints, readAt, previousReading);
        } else {
            checkHoursFit(hourPoints, readAt, reading);
        }

        const actor = getActor(req);
        await MaintenanceService.createHourReading({
            equipmentId,
            reading,
            readAt,
            resetReason: resetReason || null,
            previousReading,
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
    encodeInstanceField(record, 'stockWarehouseId');
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
    (record.dataValues.attachments ?? []).forEach((attachment) => {
        encodeInstanceField(attachment, 'id');
        encodeInstanceField(attachment, 'recordId');
        encodeInstanceField(attachment, 'uploadedById');
    });
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

// Fecha no futura, horómetro coherente con el resto de lecturas y aviso de posible duplicado.
const checkRecordConsistency = async (body, equipmentId, ruleId, excludeRecordId = null) => {
    const performedAt = parsePastDate(body.performedAt, 'performedAt');
    const hoursReading = body.hoursReading == null ? null : parseHours(body.hoursReading, 'hoursReading');
    if (hoursReading != null) {
        checkHoursFit(await MaintenanceService.getHourPoints(equipmentId, excludeRecordId), performedAt, hoursReading);
    }
    if (ruleId && !body.confirmDuplicate) {
        await checkDuplicateRecord({ equipmentId, ruleId, performedAt, excludeRecordId });
    }
    return { performedAt, hoursReading };
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
        const { equipmentId, ruleId, responsible, workPerformed, observation, materials, maintenanceType } = req.body;

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

        const checked = await checkRecordConsistency(req.body, decodedEquipmentId, decodedRuleId);
        const fault = await resolveFaultToClose(req.body.faultId, decodedEquipmentId, req.body.cause);
        // Si la regla tenía una tarea generada por el sistema, el registro la completa y queda a nombre
        // del sistema: así el mismo jefe de máquinas que lo llena puede aprobarlo.
        const task = decodedRuleId ? await MaintenanceService.findOpenTask(decodedEquipmentId, decodedRuleId) : null;
        const actor = task ? SYSTEM_ACTOR : getActor(req);
        await MaintenanceService.createRecord({
            fault,
            taskId: task?.id ?? null,
            createdBy: actor.name,
            createdById: actor.id,
            createdByKind: actor.kind,
            equipmentId: decodedEquipmentId,
            yachtId: equipment.yachtId,
            ruleId: decodedRuleId || null,
            responsible,
            workPerformed,
            ...checked,
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
        const { equipmentId, ruleId, responsible, workPerformed, observation, materials, maintenanceType } = req.body;

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

        const checked = await checkRecordConsistency(req.body, decodedEquipmentId, decodedRuleId, recordId);
        await MaintenanceService.updateRecord(recordId, {
            equipmentId: decodedEquipmentId,
            yachtId: equipment.yachtId,
            ruleId: decodedRuleId || null,
            responsible,
            workPerformed,
            ...checked,
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

// Materiales del registro que salen de la bodega del barco al aprobar; null si no usó materiales.
// Con varias bodegas hay que elegir una (`warehouseId`); sin bodega no se puede aprobar.
const resolveStockExit = async (record, warehouseId, actor) => {
    const materials = record.materials ?? [];
    if (!materials.length) return null;
    // Inventario registra cada movimiento a nombre de personal (transactions.user_id -> staffs).
    if (actor.kind !== 'staff') {
        throw new AppError('Este registro descuenta materiales del inventario y eso queda a nombre de quien aprueba: apruébalo desde una cuenta de colaborador', 409);
    }
    const warehouses = await MaintenanceService.getYachtStockWarehouses(record.yachtId);
    let warehouse;
    if (warehouseId) {
        const decoded = decodeId(warehouseId, 'ID de bodega');
        warehouse = warehouses.find((item) => item.id === decoded);
        if (!warehouse) throw new AppError('La bodega elegida no es de este barco', 400);
    } else if (warehouses.length === 1) {
        [warehouse] = warehouses;
    } else if (!warehouses.length) {
        throw new AppError('El barco no tiene una bodega de inventario de la que descontar los materiales usados', 409);
    } else {
        throw new AppError('El barco tiene varias bodegas: elige de cuál se descuentan los materiales', 409);
    }
    return {
        products: materials.map((material) => ({ id: material.productId, quantity: material.quantity })),
        warehouseFromId: warehouse.id,
        userId: actor.id,
        reason: 'Consumo de mantenimiento',
        note: `Mantenimiento: ${record.workPerformed}`.slice(0, 250),
    };
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
        const stockExit = await resolveStockExit(existing, req.body.warehouseId, actor);
        await MaintenanceService.approveRecord(recordId, { ...actor, name: approvedBy }, stockExit);
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
        // Si al aprobarlo se descontaron materiales, vuelven a la misma bodega.
        const stockReturn = existing.stockWarehouseId && existing.materials?.length
            ? {
                products: existing.materials.map((material) => ({ id: material.productId, quantity: material.quantity })),
                warehouseToId: existing.stockWarehouseId,
                userId: actor.id,
                reason: 'Anulación de mantenimiento',
                note: `Mantenimiento anulado: ${existing.workPerformed}`.slice(0, 250),
            }
            : null;
        await MaintenanceService.voidRecord(recordId, {
            voidedAt: new Date(),
            voidReason: reason.trim(),
            voidedBy: actor.name,
            voidedById: actor.id,
            voidedByKind: actor.kind,
        }, stockReturn);
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        next(error);
    }
};

// ATTACHMENTS

// Borra del disco los archivos recién subidos cuando la petición no prospera.
const discardUploads = (files) => (files ?? []).forEach((file) => fs.unlink(file.path, () => {}));

const addRecordAttachments = async (req, res, next) => {
    try {
        const recordId = decodeId(req.params.record_id, 'ID de registro');
        if (!req.files?.length) {
            throw new AppError('Adjunta al menos un archivo (imagen o PDF)', 400);
        }
        const record = await MaintenanceService.getRecordById(recordId);
        if (!record) {
            throw new AppError('Registro no encontrado', 404);
        }
        if (record.voidedAt) {
            throw new AppError('No se pueden adjuntar archivos a un registro anulado', 409);
        }
        const actor = getActor(req);
        await MaintenanceService.addAttachments(req.files.map((file) => ({
            recordId,
            fileName: file.originalname,
            url: `/uploads/maintenance/${file.filename}`,
            mimeType: file.mimetype,
            size: file.size,
            uploadedBy: actor.name,
            uploadedById: actor.id,
            uploadedByKind: actor.kind,
        })));
        res.status(200).json({ data: 'resource created successfully' });
    } catch (error) {
        discardUploads(req.files);
        next(error);
    }
};

const deleteRecordAttachment = async (req, res, next) => {
    try {
        const attachmentId = decodeId(req.params.attachment_id, 'ID de adjunto');
        const attachment = await MaintenanceService.getAttachmentById(attachmentId);
        if (!attachment) {
            throw new AppError('Adjunto no encontrado', 404);
        }
        const record = await MaintenanceService.getRecordById(attachment.recordId);
        if (record?.approvedAt || record?.voidedAt) {
            throw new AppError('Solo se quitan adjuntos de registros pendientes de aprobación', 409);
        }
        await MaintenanceService.deleteAttachment(attachmentId);
        fs.unlink(path.join(MAINTENANCE_UPLOAD_DIR, path.basename(attachment.url)), () => {});
        res.status(200).json({ data: 'resource deleted successfully' });
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

// TASKS

const TASK_STATUSES = ['pendiente', 'completada', 'cerrada'];

const getTasks = async (req, res, next) => {
    try {
        const yachtId = decodeOptionalId(req.query.yachtId, 'ID de yate');
        const { status } = req.query;
        if (status && !TASK_STATUSES.includes(status)) {
            throw new AppError(`status debe ser uno de: ${TASK_STATUSES.join(', ')}`, 400);
        }
        const tasks = await MaintenanceService.getTasks({ yachtId, status });
        res.status(200).json(tasks.map((task) => ({
            id: Utils.encode(task.id),
            assignmentId: Utils.encode(task.assignmentId),
            equipmentId: Utils.encode(task.equipmentId),
            yachtId: Utils.encode(task.yachtId),
            ruleId: Utils.encode(task.ruleId),
            recordId: task.recordId ? Utils.encode(task.recordId) : null,
            status: task.status,
            dueStatus: task.dueStatus,
            createdAt: task.createdAt,
            closedAt: task.closedAt,
            equipmentName: task.equipment?.name ?? null,
            equipmentCritical: Boolean(task.equipment?.critical),
            ruleName: task.rule?.name ?? null,
            instructions: task.rule?.instructions ?? null,
        })));
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
        const [equipment, warehouses] = await Promise.all([
            MaintenanceService.getMaintenanceBook(yachtId),
            MaintenanceService.getYachtStockWarehouses(yachtId),
        ]);

        encodeInstanceField(yacht, 'id');
        yacht.dataValues.warehouses = warehouses.map((warehouse) => ({ id: Utils.encode(warehouse.id), name: warehouse.name, type: warehouse.type }));

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
    addRecordAttachments,
    deleteRecordAttachment,
    getFaults,
    createFault,
    updateFault,
    getRuleAlerts,
    getTasks,
    getMaintenanceBook,
};
module.exports = MaintenanceController;
