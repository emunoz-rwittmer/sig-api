const RequestService = require('../../../services/operations/yachtRequest/yachtRequest.services');
const YachtRequestService = require('../../../services/operations/yachtRequest/yachtRequest.services');
const Utils = require('../../../utils/Utils');

const getAllRequests = async (req, res) => {
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
        res.status(400).json(error.message)
    }
}

const getRequestById = async (req, res) => {
    try {
        const requestId = Utils.decode(req.params.request_id);
        const result = await YachtRequestService.getRequestById(requestId)
        if (result instanceof Object) {
            result.dataValues.id = Utils.encode(result.dataValues.id);
            result.dataValues.warehouseId = Utils.encode(result.dataValues.warehouseId);
        }
        res.status(200).json(result);
    } catch (error) {

        res.status(400).json(error.message)
    }
}

const createRequest = async (req, res) => {
    try {
        const data = req.body;
        data.warehouseId = Utils.decode(req.body.warehouseId);
        data.userId = Utils.decode(req.body.userId)

        await RequestService.createRequest(data)
        // const company = await WarehouseService.getWarehouseById(warehouseId)
        // const staff = await Staffervice.getStaffById(userId)
        // action = 'requerimiento'
        // // sendEmailNewRequest(company.name);
        // // sendConfirmationEmail(action, company.name, staff)
        res.status(200).json({ data: 'resource created successfully' });
    } catch (error) {
        res.status(400).json(error.message);
    }
}

const updateRequest = async (req, res) => {
    try {
        const requestId = Utils.decode(req.params.request_id);
        const data = req.body
        await YachtRequestService.updateRequest(data, requestId);

        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {

        res.status(400).json(error.message)
    }
}


const YachtRequestController = {
    getAllRequests,
    getRequestById,
    createRequest,
    updateRequest,
}
module.exports = YachtRequestController