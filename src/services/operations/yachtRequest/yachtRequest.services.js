const Staff = require('../../../models/catalogs/staff.models');
const Warehouse = require('../../../models/catalogs/wareHouse.models');
const requestItems = require('../../../models/operations/yachtRequest/requestItems.models');
const Request = require('../../../models/operations/yachtRequest/request.models');
const db = require('../../../utils/database');

class RequestService {
    static async getAllRequests() {
        try {
            const result = await Request.findAll({
                include: [{
                    model: Warehouse,
                    as: 'warehouse',
                }, {
                    model: requestItems,
                    as: 'requestItems',
                }, {
                    model: Staff,
                    as: 'responsible',
                    attributes: ['id', 'firstName', 'lastName']
                }],
                order: [['createdAt', 'DESC']]
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getRequestById(requestId) {
        try {

            const result = await Request.findOne({
                where: { id: requestId },
                attributes: ['id', 'name', 'status', 'pax', 'cruise', 'supplyDate'],
                include: [{
                    model: requestItems,
                    as: 'requestItems',
                },
                {
                    model: Warehouse,
                    as: 'warehouse',
                    attributes: ['name']
                },
                {
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

    static async createRequest(data) {
        const transaction = await db.transaction();

        try {
            const result = await Request.create(data, { transaction });

            const productsRequest = data.products.map(item => ({
                ...item,
                requestId: result.id,
            }));

            await requestItems.bulkCreate(productsRequest, { transaction });

            await transaction.commit();
            return result;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    static async updateRequest(data, id) {
        try {
            const result = await Request.updateRequest(data, id);
            return result;
        } catch (error) {
            throw error;

        }
    }

    // Items by orders

    static async updateQuantityItemRequest(data, id) {
        try {
            const result = await requestItems.update(data, id);
            return result;
        } catch (error) {
            throw error;

        }
    }
}

module.exports = RequestService;