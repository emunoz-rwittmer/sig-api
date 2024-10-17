const YachtRequestService = require('../../../services/operations/yachtRequest/yachtRequest.services');
const Utils = require('../../../utils/Utils');

const updateStatusYachtRequest = async (req, res) => {
    try {
        console.log("estor aiu")
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

const YachtRequestController = {
    updateStatusYachtRequest,
}
module.exports = YachtRequestController