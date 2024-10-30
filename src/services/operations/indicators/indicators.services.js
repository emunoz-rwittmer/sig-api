const Staff = require('../../../models/catalogs/staff.models');
//const itemsIndicator = require('../../../models/operations/orders/itemsIndicator.models');

const { Sequelize, Op, where } = require("sequelize");
const Utils = require('../../../utils/Utils');
const Company = require('../../../models/catalogs/company.models');
const Departaments = require('../../../models/catalogs/departament.models');
const Indicator = require('../../../models/operations/indicators/indicator.models');
const Formula = require('../../../models/operations/indicators/formula.models');



class IndicatorService {
    static async getAllDepartamentsWhitIndicators() {
        try {
            const result = await Departaments.findAll({
                where: { indicators: true },
                attributes: [
                    'id', 'name',
                    [Sequelize.fn('COUNT', Sequelize.col('indicadores.id')), 'indicatorsCount']
                ],
                include: [{
                    model: Indicator,
                    as: 'indicadores',
                    attributes: []
                }],
                group: ['id'],
                order: [['name', 'ASC']]
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getIndicatorsByDepartament(departamentId) {
        try {
            const result = await Indicator.findAll({
                where: { departamentId },
                include: [{
                    model: Formula,
                    as: 'formula',
                }],
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getIndicatorById(id) {
        try {
            const result = await Indicator.findOne({
                where: { id },
                include: [{
                    model: Formula,
                    as: 'formula',
                }],
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getFormulas() {
        try {
            console.log('estoy aqui')
            const result = await Formula.findAll();
            return result;
        } catch (error) {
            console.log(error)
            throw error;
        }
    }

    static async createIndicator(indicator) {
        try {
            const result = await Indicator.create(indicator);
            return result;
        } catch (error) {
            throw error;

        }
    }

    static async updateIndicator(data, id) {
        try {
            const result = await Indicator.update(data, id);
            return result;
        } catch (error) {
            throw error;

        }
    }

    static async deleteIndicator(id) {
        try {
            const result = await Indicator.destroy({
                where: { id }
            });
            if (result) {
                return 'resource deleted successfully'
            }
        } catch (error) {
            throw error;
        }
    }

}

module.exports = IndicatorService;