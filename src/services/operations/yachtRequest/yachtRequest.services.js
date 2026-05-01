const Staff = require('../../../models/catalogs/staff.models');
const Warehouse = require('../../../models/catalogs/wareHouse.models');
const requestItems = require('../../../models/operations/yachtRequest/requestItems.models');
const Request = require('../../../models/operations/yachtRequest/request.models');
const db = require('../../../utils/database');
const RequestItems = require('../../../models/operations/yachtRequest/requestItems.models');
const ProductConfiguration = require('../../../models/operations/inventory/productConfiguration');
const Product = require('../../../models/operations/inventory/product.models');

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
                attributes: ['id', 'name', 'warehouseId', 'status', 'pax', 'cruise', 'supplyDate'],
                include: [
                    {
                        model: RequestItems,
                        as: 'requestItems',
                        include: [{
                            model: ProductConfiguration,
                            as: 'configuracion',
                            attributes: { exclude: ['createdAt', 'updatedAt'] },
                            include: [{
                                model: Product,
                                as: 'product',
                                attributes: ['name']
                            }]
                        }]
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
                    }
                ],
                order: [
                    [
                        { model: RequestItems, as: 'requestItems' },
                        { model: ProductConfiguration, as: 'configuracion' },
                        { model: Product, as: 'product' },
                        'name',
                        'ASC'
                    ]
                ]
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

        if (data.items && (Array.isArray(data.items) && data.items.length > 0)) {
            for (const item of data.items) {
                const quantity = parseInt(item.quantity, 10);
                if (isNaN(quantity) || quantity < 0) {
                    throw new Error(`Invalid quantity for item ${item.id}`);
                }
            }
        }

        const transaction = await db.transaction();

        try {
            const result = await Request.update(data,
                { where: { id }, transaction });

            // Update items if provided
            if (data.items && Array.isArray(data.items) && data.items.length > 0) {
                await Promise.all(
                    data.items.map((item) => {
                        const quantity = parseInt(item.quantity, 10);
                        return requestItems.update(
                            { quantity },
                            { where: { id: item.id }, transaction }
                        );
                    })
                );
            }

            await transaction.commit();
            return result;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
}

module.exports = RequestService;