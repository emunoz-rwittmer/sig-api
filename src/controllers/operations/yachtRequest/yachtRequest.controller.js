const YachtRequestService = require('../../../services/operations/yachtRequest/yachtRequest.services');
const Utils = require('../../../utils/Utils');

const updateStatusYachtRequest = async (req, res) => {
    try {
        const requestId = Utils.decode(req.params.request_id);
        const data = req.body
        const result = await YachtRequestService.updateStatusYachtRequest(data, {
            where: { id: requestId }
        });
        if (result) {
            res.status(200).json({ data: 'resource updated successfully' });
        }
    } catch (error) {
        console.log(error)
        res.status(400).json(error.message)
    }
}

const updateQuantityItemRequest = async (req, res) => {
    try {
        const data = req.body;
        const result = await Promise.all(
            data.map(async (item) => {
                const result = await YachtRequestService.updateQuantityItemRequest({ quantity: parseInt(item.quantity) }, {
                    where: { id: Utils.decode(item.id) }
                });
                return result
            })
        )
        if (result) {
            res.status(200).json({ data: 'resource updated successfully' });
        }
    } catch (error) {
        console.log(error)
        res.status(400).json(error.message)
    }
}

const YachtRequestController = {
    updateStatusYachtRequest,
    updateQuantityItemRequest
}
module.exports = YachtRequestController