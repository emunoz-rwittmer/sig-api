const { Sequelize, Op, where } = require("sequelize");
const Departaments = require('../../../models/catalogs/departament.models');
const Indicator = require('../../../models/operations/indicators/indicator.models');
const Formula = require('../../../models/operations/indicators/formula.models');
const Tabulation = require("../../../models/operations/indicators/tabulation.models");



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
                    as: 'formula_indicator',
                }],
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getTabulationsyDepartament(departamentId) {
        try {
            const result = await Indicator.findAll({
                where: { departamentId },
                include: [{
                    model: Tabulation,
                    as: 'tabulations',
                }],
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    // Función para obtener el cambio porcentual según la periodicidad de la medición
    static async getChangePercentageByMeasurement(indicatorId) {
        const indicator = await Indicator.findByPk(indicatorId);
        if (!indicator) {
            throw new Error('Indicator not found');
        }

        const tabulations = await Tabulation.findAll({
            where: { indicatorId },
            order: [['createdAt', 'ASC']],
        });

        if (tabulations.length < 2) {
            throw new Error('Not enough tabulations to calculate change');
        }

        const changes = [];
        let previousValue = null;

        // Obtener el intervalo de comparación basado en el tipo de medición
        const intervalMonths = {
            mensual: 1,
            trimestral: 3,
            //semiannual: 6,
            //annual: 12,
        }[indicator.reading.toLowerCase()];

        tabulations.forEach((tabulation, index) => {
            const currentDate = tabulation.createdAt;
            const currentValue = parseInt(tabulation.percent);

            if (previousValue) {
                const previousDate = previousValue.createdAt;

                const monthsDiff = (currentDate.getFullYear() - previousDate.getFullYear()) * 12 + 
                                    (currentDate.getMonth() - previousDate.getMonth());

                if (monthsDiff === intervalMonths) {
                    const changePercentage = ((currentValue - parseInt(previousValue.percent)) / parseInt(previousValue.percent)) * 100;
                    changes.push({
                        period: `${previousDate.toISOString().slice(0, 7)} to ${currentDate.toISOString().slice(0, 7)}`,
                        changePercentage: changePercentage.toFixed(2),
                    });
                    previousValue = tabulation;
                }
            } else {
                previousValue = tabulation;
            }
        });

        return changes;
    }

    static async getIndicatorById(id) {
        try {
            const result = await Indicator.findOne({
                where: { id },
                include: [{
                    model: Formula,
                    as: 'formula_indicator',
                }],
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getFormulas() {
        try {
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