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

const MaintenanceController = {
    getAllEquipment,
    createEquipment,
    updateEquipment,
};
module.exports = MaintenanceController;
