const itemsGuide = require('../../../models/operations/referralGuides/itemsGuides.models');
const Guide = require('../../../models/operations/referralGuides/guides.models');
const Company = require('../../../models/catalogs/company.models');
const db = require('../../../utils/database');


class GuideService {
    static async getGuidesByCompany(companyId) {
        try {
            const result = await Guide.findAll({
                where: { companyId },
                include: [{
                    model: itemsGuide,
                    as: 'details',
                }]
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getGuideById(id) {
        try {
            const result = await Guide.findOne({
                where: { id },
                include: [
                    {
                        model: itemsGuide,
                        as: 'details',
                    },
                    {
                        model: Company,
                        as: 'company',
                    }]
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async createGuide(data) {
        const transaction = await db.transaction();
        try {
            const result = await Guide.create(data, { transaction });
            if (!result) {
                throw new Error('No se pudo crear guia');
            }

            const details = data.details.map(detail => ({
                ...detail,
                guideId: result.id
            }));

            await itemsGuide.bulkCreate(details, { transaction });
            await transaction.commit();
            return result;
        } catch (error) {
            await transaction.rollback();
            throw error;

        }
    }

    static async updateGuide(data) {
        try {
            const results = await Promise.all(data.map(async (item) => {
                const result = await itemsGuide.update({
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

    static async deleteItem(itemId) {
        try {
            const result = await itemsGuide.destroy({
                where: { id: itemId }
            });
            if (result) {
                return 'resource deleted successfully'
            }
        } catch (error) {
            throw error;
        }
    }

}

module.exports = GuideService;