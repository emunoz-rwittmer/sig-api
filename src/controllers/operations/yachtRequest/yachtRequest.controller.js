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

const getRequestById = async (req, res, next) => {
    try {
        const requestId = decodeId(req.params.request_id, 'request_id');
        const result = await YachtRequestService.getRequestById(requestId);
        if (!result) throw new AppError('Solicitud no encontrada', 404);

        result.id = Utils.encode(result.id);
        result.warehouseId = Utils.encode(result.warehouseId);
        result.requestItems.map(x => (
            x.stock = Quantity.viewCorrectQuantity(x.configuracion?.product, x.stock)
        ))

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
    getRequestById,
    createRequest,
    updateRequest,
}
module.exports = YachtRequestController
