const { sendEmailNewRequest, sendConfirmationEmail } = require('../../../mails/mailer');
const Staffervice = require('../../../services/catalogs/staff.services');
const WarehouseService = require('../../../services/operations/inventory/warehouse.services');
const YachtRequestService = require('../../../services/operations/yachtRequest/yachtRequest.services');
const Utils = require('../../../utils/Utils');
const Quantity = require('../../../utils/quantity');
const AppError = require('../../../errors/AppError');

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

const MAX_DELIVERY_PORT = 100;
const MAX_NOTE = 1000;

// Campos opcionales del formulario de nuevo requerimiento: se normalizan a null si vienen vacíos.
const validateDeliveryFields = (data) => {
    const { deliveryPort, requiredDate, note } = data;
    if (deliveryPort != null && (typeof deliveryPort !== 'string' || deliveryPort.length > MAX_DELIVERY_PORT)) {
        throw new AppError('deliveryPort inválido', 400);
    }
    if (note != null && (typeof note !== 'string' || note.length > MAX_NOTE)) {
        throw new AppError('note inválido', 400);
    }
    if (requiredDate && Number.isNaN(Date.parse(requiredDate))) {
        throw new AppError('requiredDate inválido', 400);
    }
    data.deliveryPort = deliveryPort?.trim() || null;
    data.requiredDate = requiredDate || null;
    data.note = note?.trim() || null;
};

const getAllRequests = async (req, res, next) => {
    try {
        const result = await YachtRequestService.getAllRequests();
        if (result instanceof Array) {
            result.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
                x.dataValues.warehouseId = Utils.encode(x.dataValues.warehouseId);
            });
        }
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}

const REQUEST_STATUSES = ['Pendiente', 'Procesado'];
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;
const MAX_SEARCH = 100;

const parseIntParam = (value, fallback, fieldName, { min, max }) => {
    if (value === undefined || value === '') return fallback;
    const number = Number(value);
    if (!Number.isInteger(number) || number < min || number > max) {
        throw new AppError(`${fieldName} inválido`, 400);
    }
    return number;
};

const searchRequests = async (req, res, next) => {
    try {
        const { year, warehouseIds, warehouseId, group, status, q, page, pageSize } = req.query;

        const scopeIds = warehouseIds
            ? String(warehouseIds).split(',').filter(Boolean).map((value) => decodeId(value.trim(), 'warehouseIds'))
            : [];
        const selectedWarehouse = warehouseId ? decodeId(warehouseId, 'warehouseId') : undefined;
        if (selectedWarehouse && scopeIds.length && !scopeIds.includes(selectedWarehouse)) {
            throw new AppError('warehouseId no está en warehouseIds', 400);
        }
        if (status && !REQUEST_STATUSES.includes(status)) throw new AppError('status inválido', 400);
        if (group && String(group).length > 50) throw new AppError('group inválido', 400);
        if (q && String(q).length > MAX_SEARCH) throw new AppError('q inválido', 400);

        const result = await YachtRequestService.searchRequests({
            year: parseIntParam(year, new Date().getFullYear(), 'year', { min: 2000, max: 2100 }),
            page: parseIntParam(page, 1, 'page', { min: 1, max: 100000 }),
            pageSize: parseIntParam(pageSize, DEFAULT_PAGE_SIZE, 'pageSize', { min: 1, max: MAX_PAGE_SIZE }),
            warehouseIds: scopeIds,
            warehouseId: selectedWarehouse,
            group: group || undefined,
            status: status || undefined,
            // % y _ son comodines de LIKE: se escapan para buscar el texto literal.
            search: q ? String(q).trim().replace(/[\\%_]/g, '\\$&') : undefined,
        });

        res.status(200).json({
            ...result,
            rows: result.rows.map((row) => {
                const plain = row.get({ plain: true });
                return { ...plain, id: Utils.encode(plain.id), warehouseId: Utils.encode(plain.warehouseId), productCount: Number(plain.productCount) || 0 };
            }),
            yachts: result.yachts.map((yacht) => ({ ...yacht, warehouseId: Utils.encode(yacht.warehouseId) })),
        });
    } catch (error) {
        next(error);
    }
}

const getRequestById = async (req, res, next) => {
    try {
        const requestId = decodeId(req.params.request_id, 'request_id');
        const result = await YachtRequestService.getRequestById(requestId);
        if (!result) throw new AppError('Solicitud no encontrada', 404);

        result.id = Utils.encode(result.id);
        result.warehouseId = Utils.encode(result.warehouseId);
        result.requestItems.forEach((x) => {
            x.stock = Quantity.viewCorrectQuantity(x.configuracion?.product, x.stock);
            // El front reenvía este id en la transacción entre bodegas, que espera hashid.
            if (x.configuracion?.productId) x.configuracion.productId = Utils.encode(x.configuracion.productId);
        });

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}

const createRequest = async (req, res, next) => {
    try {
        const data = req.body;
        data.warehouseId = decodeId(data.warehouseId, 'warehouseId');
        data.userId = decodeId(data.userId, 'userId');

        if (!Array.isArray(data.products)) {
            throw new AppError('products debe ser un arreglo', 400);
        }
        validateDeliveryFields(data);

        await YachtRequestService.createRequest(data)
        const warehouse = await WarehouseService.getWarehouseById(data.warehouseId)
        const staff = await Staffervice.getStaffById(data.userId)

        const action = 'requerimiento'
        sendEmailNewRequest(warehouse.dataValues.name);
        sendConfirmationEmail(action, warehouse.dataValues.name, staff)
        res.status(200).json({ data: 'resource created successfully' });
    } catch (error) {
        next(error);
    }
}

const updateRequest = async (req, res, next) => {
    try {
        const requestId = decodeId(req.params.request_id, 'request_id');
        const data = req.body
        const [affectedRows] = await YachtRequestService.updateRequest(data, requestId);
        if (affectedRows === 0) throw new AppError('Solicitud no encontrada', 404);

        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        next(error);
    }
}


const YachtRequestController = {
    getAllRequests,
    searchRequests,
    getRequestById,
    createRequest,
    updateRequest,
}
module.exports = YachtRequestController
