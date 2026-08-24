const ShippingGuideItems = require('../../../models/operations/shippingGuide/shippingGuideItems.models');
const ShippingGuide = require('../../../models/operations/shippingGuide/shippingGuide.models');
const db = require('../../../utils/database');
const Utils = require('../../../utils/Utils');
const AppError = require('../../../errors/AppError');
const fs = require('fs');
const path = require('path');


class ShippingGuideService {
    static async getShippingGuides() {
        try {
            const result = await ShippingGuide.findAll({
                include: [{
                    model: ShippingGuideItems,
                    as: 'details',
                }],
                order:[['createdAt', 'DESC']]
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getShippingGuideById(id) {
        try {
            const result = await ShippingGuide.findOne({
                where: { id },
                include: [
                    {
                        model: ShippingGuideItems,
                        as: 'details',
                    },
                ]
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async createShippingGuide(data) {
        const transaction = await db.transaction();
        try {
            const result = await ShippingGuide.create(data, { transaction });
            if (!result) {
                throw new Error('No se pudo crear guia');
            }

            const details = data.details.map(detail => ({
                ...detail,
                guideId: result.id
            }));

            await ShippingGuideItems.bulkCreate(details, { transaction });
            await transaction.commit();
            return result;
        } catch (error) {
            await transaction.rollback();
            throw error;

        }
    }

    static async updateShippingGuide(data) {
        try {
            const results = await Promise.all(data.map(async (item) => {
                const result = await ShippingGuideItems.update({
                    product: item.product,
                    quantity: item.quantity,
                    originalQuantity: item.originalQuantity,
                },
                    {
                        where: { id: Utils.decode(item.id) }
                    });
                return result;
            }));
            return results;
        } catch (error) {

            throw error;
        }
    }

    static async createItemsOfShippingGuide(items) {
        try {
            const result = await ShippingGuideItems.bulkCreate(items);
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async deleteItem(itemId) {
        try {
            const result = await ShippingGuideItems.destroy({
                where: { id: itemId }
            });
            if (result) {
                return 'resource deleted successfully'
            }
        } catch (error) {
            throw error;
        }
    }

    static async deleteShippingGuide(id) {
        const existing = await ShippingGuide.findByPk(id);
        if (!existing) {
            throw new AppError('Guía no encontrada', 404);
        }

        const filePath = existing.file;

        const transaction = await db.transaction();
        try {
            await ShippingGuideItems.destroy({ where: { guideId: id }, transaction });
            await ShippingGuide.destroy({ where: { id }, transaction });
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }

        if (filePath) {
            const absolutePath = path.resolve(path.join(__dirname, '../../../../'), `.${filePath}`);
            try {
                fs.unlinkSync(absolutePath);
            } catch (error) {
                console.error('No se pudo borrar el PDF de la guía eliminada:', error.message);
            }
        }

        return 'resource deleted successfully';
    }

}

module.exports = ShippingGuideService;