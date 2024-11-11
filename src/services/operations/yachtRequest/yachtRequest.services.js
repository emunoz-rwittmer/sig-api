const Staff = require('../../../models/catalogs/staff.models');
const itemsRequest = require('../../../models/operations/yachtRequest/itemsRequest.models');
const Request = require('../../../models/operations/yachtRequest/request.models');

class RequestService {
    static async getRequestById(id) {
        try {
            const result = await Request.findOne({
                where: { id },
                attributes: ['id', 'name', 'status','pax','cruise','supplyDate'],
                include : [{
                    model: Staff,
                    as: 'responsible',
                    attributes: ['id', 'firstName', 'lastName']
                }]
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async updateYachtRequest(data, id) {
        try {
            const result = await Request.update(data, id);
            return result;
        } catch (error) {
            throw error;

        }
    }

    static async updateQuantityItemRequest(data, id) {
        try {
            const result = await itemsRequest.update(data, id);
            return result;
        } catch (error) {
            throw error;

        }
    }
}

module.exports = RequestService;