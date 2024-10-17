const productCalculations = require('../../../models/operations/orders/productCalculations.models');
const itemsRequest = require('../../../models/operations/yachtRequest/itemsRequest.models');
const Request = require('../../../models/operations/yachtRequest/request.models');

class RequestService {
    static async getRequestById(id) {
        try {
            const result = await Request.findOne({
                where: { id },
                attributes: ['id', 'name', 'status']
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async updateStatusYachtRequest(data, id) {
        try {
            const result = await Request.update(data, id);
            return result;
        } catch (error) {
            throw error;

        }
    }
}

module.exports = RequestService;