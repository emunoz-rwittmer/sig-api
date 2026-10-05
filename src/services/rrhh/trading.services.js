
const Trading = require('../../models/rrhh/trading.models');
const StaffTradingView = require('../../models/rrhh/staffTradingView.models');
const { Sequelize } = require('sequelize');

class TradingService {
    static async getAll() {
        try {
            const result = await Trading.findAll({
                attributes: ['id', 'name', 'url', 'type', 'categoria', 'createdAt'],
                order: [
                    [
                        Sequelize.literal('CASE WHEN id = 16 THEN 0 ELSE 1 END'),
                        'ASC'
                    ],
                    ['id', 'ASC']
                ]
            });

            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getAllForStaff(staffId) {
        const [tradings, views] = await Promise.all([
            TradingService.getAll(),
            StaffTradingView.findAll({ where: { staffId }, attributes: ['tradingId'] }),
        ]);
        const viewedIds = new Set(views.map((view) => view.tradingId));
        tradings.forEach((trading) => {
            trading.dataValues.viewed = viewedIds.has(trading.id);
        });
        return tradings;
    }

    static async markViewed(staffId, tradingId) {
        const exists = await Trading.count({ where: { id: tradingId } });
        if (!exists) return false;
        await StaffTradingView.findOrCreate({
            where: { staffId, tradingId },
            defaults: { viewedAt: new Date() },
        });
        return true;
    }

    static async getTradingById(id) {
        try {
            const result = await Trading.findOne({
                where: { id },
                attributes: ['id', 'name', 'url', 'type', 'categoria', 'createdAt']
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async createTrading(data) {
        try {
            const result = await Trading.create(data);
            return result;
        } catch (error) {
            throw error;

        }
    }

    static async updateTrading(data, id) {
        try {
            const result = await Trading.update(data, id);
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async delete(id) {
        try {
            const result = await Trading.destroy(id);
            return result;
        } catch (error) {
            throw error;
        }
    }

}

module.exports = TradingService;