const { Sequelize, Op, where } = require("sequelize");
const Departaments = require('../../../models/catalogs/departament.models');
const Indicator = require('../../../models/operations/indicators/indicator.models');
const Formula = require('../../../models/operations/indicators/formula.models');
const Tabulation = require("../../../models/operations/indicators/tabulation.models");
const Process = require("../../../models/operations/indicators/process.models");



class IndicatorService {
    static async getAllDepartamentsWhitIndicators() {
        try {
            const result = await Process.findAll({
                //where: { indicators: true },
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
                    separate: true, // Esto asegura que las tabulaciones se ordenen por separado
                    order: [['createdAt', 'ASC']], // Ordena las tabulaciones por la fecha de creación
                }],
                order: [
                    ['createdAt', 'ASC'], // Ordena los indicadores por su propia fecha de creación
                ],
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getChangePercentageByMeasurement(indicatorId) {
        const indicator = await Indicator.findByPk(indicatorId);
        if (!indicator) {
            throw new Error('Indicator not found');
        }

        const tabulations = await Tabulation.findAll({
            where: { indicatorId },
            order: [['createdAt', 'ASC']],
        });

        if (!tabulations || tabulations.length < 2) {
            return [];
        }

        const changes = [];
        let previousValue = null;

        const intervalMonths = {
            mensual: 1,
            trimestral: 3,
            semiannual: 6,
            annual: 12,
        }[indicator.reading.toLowerCase()] || 1; // Predeterminado a 1 mes si el tipo no coincide

        tabulations.forEach((tabulation) => {
            const currentDate = tabulation.createdAt;
            const currentValue = parseInt(tabulation.percent, 10);

            if (previousValue) {
                const previousDate = previousValue.createdAt;
                const monthsDiff =
                    (currentDate.getFullYear() - previousDate.getFullYear()) * 12 +
                    (currentDate.getMonth() - previousDate.getMonth());

                if (monthsDiff >= intervalMonths) {
                    const changePercentage =
                        ((currentValue - parseInt(previousValue.percent, 10)) /
                            parseInt(previousValue.percent, 10)) *
                        100;

                    changes.push({
                        period: `${previousDate.toISOString().slice(0, 7)} to ${currentDate.toISOString().slice(0, 7)}`,
                        changePercentage: isNaN(changePercentage) ? 0 : changePercentage.toFixed(2),
                    });

                    previousValue = tabulation;
                }
            } else {
                previousValue = tabulation;
            }
        });

        if (changes.length === 0) {
            return [];
        }

        return changes;
    }

    static async getIndicatorById(id) {
        try {
            const result = await Indicator.findOne({
                where: { id },
                include: [{
                    model: Formula,
                    as: 'formula_indicator',
                    attributes: ['name']
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
            console.log(error)
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

    // tabulation

    static async createTabulation(tabulation) {
        try {
            const result = await Tabulation.create(tabulation);
            return result;
        } catch (error) {
            throw error;

        }
    }

    static async getTabulationsByIndicator(indicatorId) {
        try {
            const result = await Tabulation.findAll({ where: { indicatorId } });
            return result;
        } catch (error) {
            console.log(error)
            throw error;
        }
    }

}

module.exports = IndicatorService;