const IndicatorService = require('../../../services/operations/indicators/indicators.services');
const Utils = require('../../../utils/Utils');
const { create, all, cos } = require('mathjs'); // Para evaluar fórmulas dinámicas

const getAllDepartamentsWhitIndicators = async (req, res) => {
    try {
        const result = await IndicatorService.getAllDepartamentsWhitIndicators();
        if (result instanceof Array) {
            result.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
            });
        }
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json(error.message)
    }
}

const getIndicatorsByDepartament = async (req, res) => {
    try {
        const departamentId = Utils.decode(req.params.departament_id);
        const departament = await IndicatorService.getProcessById(departamentId);
        if (departament instanceof Object) {
            departament.id = Utils.encode(departament.id);
        }

        const result = await IndicatorService.getIndicatorsByDepartament(departamentId);
        if (result instanceof Array) {
            result.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
                x.dataValues.departamentId = Utils.encode(x.dataValues.departamentId);
            });
        }
        res.status(200).json({ departament, result });
    } catch (error) {
        res.status(400).json(error.message)
    }
}

const getTabulationsyDepartament = async (req, res) => {
    try {
        const departamentId = Utils.decode(req.params.departament_id);
        const departament = await IndicatorService.getProcessById(departamentId);
        if (departament instanceof Array) {
            departament.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
            });
        }
        const result = await IndicatorService.getTabulationsyDepartament(departamentId);

        if (result instanceof Array) {

            const currentYear = new Date().getFullYear();

            for (const x of result) {
                const changesPercent = await IndicatorService.getChangePercentageByMeasurement(x.id);
                const yearsTabulation = x.tabulations.reduce((acc, tabulation) => {
                    const year = new Date(tabulation.createdAt).getFullYear();
                    if (!acc[year]) {
                        acc[year] = { tabulations: [], averagePercent: 0 };
                    }
                    acc[year].tabulations.push(tabulation);
                    acc[year].averagePercent = acc[year].tabulations.reduce((sum, tab) => sum + tab.percent, 0) / acc[year].tabulations.length;
                    return acc;
                }, {});

                const currentYearTabulations = x.tabulations.filter(tabulation => new Date(tabulation.createdAt).getFullYear() === currentYear);
                const totalAchieved = currentYearTabulations.reduce((sum, tabulation) => sum + tabulation.percent, 0);
                const averageAchieved = currentYearTabulations.length > 0 ? totalAchieved / currentYearTabulations.length : 0;
                x.dataValues.yearsTabulation = yearsTabulation;
                x.dataValues.id = Utils.encode(x.dataValues.id);
                x.dataValues.averageAchieved = averageAchieved.toFixed(2);
                x.dataValues.changesPercent = changesPercent;
            }
        }

        res.status(200).json({ departament, result });
    } catch (error) {

        res.status(400).json(error.message)
    }
}

const getIndicatorById = async (req, res) => {
    try {
        const indicatorId = Utils.decode(req.params.indicator_id)
        const result = await IndicatorService.getIndicatorById(indicatorId);
        if (result instanceof Object) {
            result.id = Utils.encode(result.id);
            result.formulaId = Utils.encode(result.formulaId);
            result.departamentId = Utils.encode(result.departamentId);
        };
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json(error.message)
    }
}

const getFormulas = async (req, res) => {
    try {
        const result = await IndicatorService.getFormulas();
        if (result instanceof Array) {
            result.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
            });
        }
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json(error.message)
    }
}

const createIndicator = async (req, res) => {
    try {
        const data = req.body;
        data.departamentId = Utils.decode(data.departamentId)
        data.formulaId = Utils.decode(data.formulaId)
        const result = await IndicatorService.createIndicator(data);
        if (result) {
            res.status(200).json({ data: 'resource created successfully' });
        }
    } catch (error) {
        res.status(400).json(error.message);
    }
}

const updateIndicator = async (req, res) => {
    try {
        const indicatorId = Utils.decode(req.params.indicator_id);
        const data = req.body
        data.formulaId = Utils.decode(data.formulaId);
        data.departamentId = Utils.decode(data.departamentId)
        const result = await IndicatorService.updateIndicator(data, {
            where: { id: indicatorId }
        });

        if (result) {
            res.status(200).json({ data: 'resource updated successfully' });
        }
    } catch (error) {
        res.status(400).json(error.message);
    }
}

const deleteIndicator = async (req, res) => {
    try {
        const indicatorId = Utils.decode(req.params.indicator_id);
        const result = await IndicatorService.deleteIndicator(indicatorId);
        res.status(200).json({ data: result })
    } catch (error) {
        res.status(400).json(error.message);
    }
}

const createTabulation = async (req, res) => {
    try {
        const math = create(all);
        const data = req.body;
        data.indicatorId = Utils.decode(data.indicatorId);
        const indicador = await IndicatorService.getIndicatorById(data.indicatorId);
        if (!indicador || !indicador.formula) {
            return res.status(404).json('Indicador o fórmula no encontrados');
        }

        const formula = indicador.formula_indicator.name;
        let a = data.a;
        let b = data.b;
        let scope = { a, b };

        try {
            percent = b === 0 ? null : math.evaluate(formula, scope);
        } catch (error) {
            throw error.message;
        }

        data.percent = percent
        const result = await IndicatorService.createTabulation(data);
        if (result) {
            return res.status(200).json({ data: 'resource created successfully' });
        }
    } catch (error) {
        console.log(error)
        res.status(400).json(error.message);
    }
}


const getTabulationsByIndicator = async (req, res) => {
    try {
        const indicatorId = Utils.decode(req.params.indicator_id);
        const indicator = await IndicatorService.getIndicatorById(indicatorId);
        if (indicator instanceof Object) {
            indicator.dataValues.id = Utils.encode(indicator.dataValues.id);
            indicator.dataValues.departamentId = Utils.encode(indicator.dataValues.departamentId);
            indicator.dataValues.formulaId = Utils.encode(indicator.dataValues.formulaId);
        }
        const result = await IndicatorService.getTabulationsByIndicator(indicatorId);
        res.status(200).json({ indicator, result });
    } catch (error) {

        res.status(400).json(error.message)
    }
}

//idicator staffs

const getProcesStaffs = async (req, res) => {
    try {
        const staffId = Utils.decode(req.params.staff_id)
        const result = await IndicatorService.getProcesStaffs(staffId);
        if (result instanceof Array) {
            result.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
            });
        }
        res.status(200).json(result);
    } catch (error) {

        res.status(400).json(error.message);
    }
}

const getAllStaffsByProces = async (req, res) => {
    try {
        const processId = Utils.decode(req.params.process_id)
        const result = await IndicatorService.getAllStaffsByProces(processId);
        if (result instanceof Array) {
            result.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
            });
        }
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json(error.message);
    }
}

const assignStaff = async (req, res) => {
    try {
        const data = req.body;
        if (!Array.isArray(data.staffs)) {
            data.staffs = [data.staffs];
        }
        data.staffs = data.staffs.map(staffId => ({ staffId: Utils.decode(staffId) }))
        data.processId = Utils.decode(req.params.process_id)
        const result = await IndicatorService.assignStaff(data);
        if (result) {
            res.status(200).json({ data: 'resource created successfully' });
        }
    } catch (error) {
        res.status(400).json(error.message);
    }
}

const deleteStafft = async (req, res) => {
    try {
        const id = Utils.decode(req.params.staff_id)
        const result = await IndicatorService.deleteStafft({
            where: { id }
        });
        res.status(200).json({ data: 'resource deleted successfully' })
    } catch (error) {
        res.status(400).json(error.message);
    }
}

const IndicatorController = {
    getAllDepartamentsWhitIndicators,
    getIndicatorsByDepartament,
    getTabulationsyDepartament,
    getIndicatorById,
    getFormulas,
    createIndicator,
    updateIndicator,
    deleteIndicator,
    createTabulation,
    getTabulationsByIndicator,
    getProcesStaffs,
    getAllStaffsByProces,
    assignStaff,
    deleteStafft,
}
module.exports = IndicatorController