const Indicator = require('../../../models/operations/indicators/indicator.models');
const Formula = require('../../../models/operations/indicators/formula.models');
const Tabulation = require("../../../models/operations/indicators/tabulation.models");
const Process = require("../../../models/operations/indicators/process.models");
const ProcessStaff = require("../../../models/operations/indicators/processStaffs.models");
const Staff = require("../../../models/catalogs/staff.models");
const Positions = require("../../../models/catalogs/positions.models");
const Departaments = require("../../../models/catalogs/departament.models");

const INDICATOR_INCLUDE = [
    {
        model: Process,
        as: 'departament',
        attributes: ['id', 'name', 'departamentId'],
        include: [{ model: Departaments, as: 'departamento', attributes: ['id', 'name'] }],
    },
    { model: Formula, as: 'formula_indicator' },
    { model: Tabulation, as: 'tabulations' },
];

class IndicatorService {

    static async getProcessById(id) {
        return Process.findByPk(id);
    }

    // Dashboard rediseñado: todos los indicadores de todos los procesos en
    // una sola llamada (el filtro por proceso/tipo/búsqueda es client-side,
    // mismo patrón que `regulations`/`inductions`). Cada indicador trae sus
    // tabulaciones para que el front calcule "actual" (última tabulación)
    // sin una segunda llamada por indicador.
    static async getAllIndicators() {
        return Indicator.findAll({
            include: INDICATOR_INCLUDE,
            order: [['name', 'ASC']],
        });
    }

    static async getIndicatorsByDepartament(departamentId) {
        return Indicator.findAll({
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
    }

    static async getIndicatorById(id) {
        return Indicator.findOne({
            where: { id },
            include: [{
                model: Formula,
                as: 'formula_indicator',
                attributes: ['name']
            }],
        });
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
        return Formula.findAll();
    }

    static async createIndicator(indicator) {
        return Indicator.create(indicator);
    }

    static async updateIndicator(data, id) {
        return Indicator.update(data, id);
    }

    static async deleteIndicator(id) {
        const result = await Indicator.destroy({ where: { id } });
        return result ? 'resource deleted successfully' : null;
    }

    // tabulation

    static async createTabulation(tabulation) {
        return Tabulation.create(tabulation);
    }

    static async getTabulationsByIndicator(id) {
        return Indicator.findOne({
            where: { id },
            include: INDICATOR_INCLUDE,
            order: [
                [{ model: Tabulation, as: 'tabulations' }, 'periodYear', 'DESC'],
                [{ model: Tabulation, as: 'tabulations' }, 'periodMonth', 'DESC'],
                [{ model: Tabulation, as: 'tabulations' }, 'createdAt', 'DESC'],
            ],
        });
    }

    // indicator - staff

    static async getProcesStaffs(staffId) {
        return ProcessStaff.findAll({
            where: { staffId },
            attributes: ['id'],
            include: {
                model: Process,
                as: 'process',
                attributes: ['id', 'name'],
            }
        });
    }

    static async getAllStaffsByProces(id) {
        return ProcessStaff.findAll({
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
    }

    static async assignStaff(data) {
        return Promise.all(data.staffs.map((staff) => ProcessStaff.create({
            processId: data.processId,
            staffId: staff.staffId,
        })));
    }

    static async deleteStafft(id) {
        return ProcessStaff.destroy(id);
    }

}

module.exports = IndicatorService;
