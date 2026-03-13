const { Sequelize, Op, where } = require("sequelize");
const Indicator = require('../../../models/operations/indicators/indicator.models');
const Formula = require('../../../models/operations/indicators/formula.models');
const Tabulation = require("../../../models/operations/indicators/tabulation.models");
const Process = require("../../../models/operations/indicators/process.models");
const ProcessStaff = require("../../../models/operations/indicators/processStaffs.models");
const Staff = require("../../../models/catalogs/staff.models");
const Positions = require("../../../models/catalogs/positions.models");

class IndicatorService {

    static async getProcessById(id) {
        try {
            const result = await Process.findByPk(id);
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getIndicatorsByDepartament(departamentId) {
        try {
            const result = await Indicator.findAll({
                where: { departamentId },
                include: [
                    {
                        model: Process,
                        as: 'departament',
                        attributes: ['name'],
                    },
                    {
                        model: Formula,
                        as: 'formula_indicator',
                    }],
                order: [['name', 'ASC']]
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
                    as: 'formula_indicator',
                    attributes: ['name']
                }],
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
            semestral: 6,
            anual: 12,
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

    static async getFormulas() {
        try {
            const result = await Formula.findAll();
            return result;
        } catch (error) {

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

    // tabulation

    static async createTabulation(tabulation) {
        try {
            const result = await Tabulation.create(tabulation);
            return result;
        } catch (error) {
            throw error;

        }
    }

    static async getTabulationsByIndicator(id) {
        try {
            const result = await Indicator.findOne(
                {
                    where: { id },
                    include: [
                        {
                            model: Process,
                            as: 'departament'
                        },
                        {
                            model: Tabulation,
                            as: 'tabulations'
                        }
                    ],
                    order: [
                        [{ model: Tabulation, as: 'tabulations' }, 'createdAt', 'DESC']
                    ]
                });
            return result;
        } catch (error) {
            throw error;
        }
    }

    // indicator - staff 

    static async getProcesStaffs(staffId) {
        try {
            const result = await ProcessStaff.findAll({
                where: { staffId },
                attributes: ['id'],
                include: {
                    model: Process,
                    as: 'process',
                    attributes: ['id', 'name'],
                }
            });
            return result;
        } catch (error) {

            throw error;
        }
    }

    static async getAllStaffsByProces(id) {
        try {
            const result = await ProcessStaff.findAll({
                where: { processId: id },
                attributes: ['id'],
                include: {
                    model: Staff,
                    as: 'staffs',
                    attributes: ['firstName', 'lastName'],
                    include: {
                        model: Positions,
                        as: 'staff_position',
                        attributes: ['name'],
                    }
                }
            });
            return result;
        } catch (error) {

            throw error;
        }
    }

    static async assignStaff(data) {
        try {
            const result = await Promise.all(data.staffs.map(async (staff) => {
                const response = await ProcessStaff.create({
                    processId: data.processId,
                    staffId: staff.staffId
                });
                return response;
            }));
            return result; // Devuelve el resultado después de que todas las promesas se resuelvan
        } catch (error) {
            throw error;
        }
    }


    static async deleteStafft(id) {
        try {
            const result = await ProcessStaff.destroy(id);
            return result;
        } catch (error) {
            throw error;
        }
    }

}

module.exports = IndicatorService;