const IndicatorService = require('../../../services/operations/indicators/indicators.services');
const Utils = require('../../../utils/Utils');
const DepartamentService = require('../../../services/catalogs/departaments.services');
const { create, all } = require('mathjs'); // Para evaluar fórmulas dinámicas

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
        const departament = await DepartamentService.getDepartamentById(departamentId);
        if (departament instanceof Array) {
            departament.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
            });
        }
        const result = await IndicatorService.getIndicatorsByDepartament(departamentId);
        if (result instanceof Array) {
            result.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
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
        const departament = await DepartamentService.getDepartamentById(departamentId);
        if (departament instanceof Array) {
            departament.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
            });
        }
        const result = await IndicatorService.getTabulationsyDepartament(departamentId);

        if (result instanceof Array) {
            for (const x of result) {
                const changesPercent = await IndicatorService.getChangePercentageByMeasurement(x.id);
                const totalAchieved = x.tabulations.reduce((sum, tabulation) => sum + parseInt(tabulation.percent), 0);
                const averageAchieved = totalAchieved / x.tabulations.length;
                // Asignar valores adicionales a dataValues
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
        console.log(error)
        res.status(400).json(error.message);
    }
}

const updateIndicator = async (req, res) => {
    try {
        const indicatorId = Utils.decode(req.params.indicator_id);
        const data = req.body
        data.departamentId = Utils.decode(data.departamentId);
        data.formulaId = Utils.decode(data.formulaId);
        const result = await IndicatorService.updateIndicator(data, {
            where: { id: indicatorId }
        });

        if (result) {
            res.status(200).json({ data: 'resource updated successfully' });
        }
    } catch (error) {
        console.log(error)
        res.status(400).json(error.message);
    }
}

const deleteIndicator = async (req, res) => {
    try {
        const indicatorId = Utils.decode(req.params.indicator_id);
        const result = await IndicatorService.deleteIndicator(indicatorId);
        res.status(200).json({ data: result })
    } catch (error) {
        console.log(error)
        res.status(400).json(error.message);
    }
}

const createTabulation = async (req, res) => {
    try {
        const math = create(all);
        let { a, b, indicatorId } = req.body;
        indicatorId = Utils.decode(indicatorId)

        const indicador = await IndicatorService.getIndicatorById(indicatorId);

        if (!indicador || !indicador.formula) {
            return res.status(404).json('Indicador o fórmula no encontrados');
        }

        const formula = indicador.formula_indicator.name;
        let scope = { a, b };
        let percent;

        try {
            percent = math.evaluate(formula, scope);
        } catch (error) {
            res.status(400).json(error.message);
        }

        const result = await IndicatorService.createTabulation({ a, b, percent, indicatorId });

        if (result) {
            res.status(200).json({ data: 'resource created successfully' });
        }
    } catch (error) {
        console.log(error)
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
    createTabulation
}
module.exports = IndicatorController