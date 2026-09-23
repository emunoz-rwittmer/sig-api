const IndicatorService = require('../../../services/operations/indicators/indicators.services');
const Utils = require('../../../utils/Utils');
const AppError = require('../../../errors/AppError');
const { create, all } = require('mathjs'); // Para evaluar fórmulas dinámicas

const decodeId = (value, fieldName) => {
    let id;
    try {
        id = Utils.decode(value);
    } catch {
        throw new AppError(`${fieldName} inválido`, 400);
    }
    if (!Number.isInteger(id) || id <= 0) {
        throw new AppError(`${fieldName} inválido`, 400);
    }
    return id;
};

const encodeIndicator = (indicator) => {
    indicator.dataValues.id = Utils.encode(indicator.id);
    indicator.dataValues.departamentId = Utils.encode(indicator.departamentId);
    indicator.dataValues.formulaId = Utils.encode(indicator.formulaId);
    if (indicator.dataValues.departament) {
        indicator.dataValues.departament.dataValues.id = Utils.encode(indicator.dataValues.departament.id);
        if (indicator.dataValues.departament.dataValues.departamento) {
            indicator.dataValues.departament.dataValues.departamento.dataValues.id =
                Utils.encode(indicator.dataValues.departament.dataValues.departamento.id);
        }
    }
    (indicator.dataValues.tabulations ?? []).forEach((tabulation) => {
        tabulation.dataValues.id = Utils.encode(tabulation.id);
        tabulation.dataValues.indicatorId = Utils.encode(tabulation.indicatorId);
    });
    return indicator;
};

const getAllIndicators = async (req, res, next) => {
    try {
        const result = await IndicatorService.getAllIndicators();
        result.forEach(encodeIndicator);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const getIndicatorsByDepartament = async (req, res, next) => {
    try {
        const departamentId = decodeId(req.params.departament_id, 'departament_id');
        const result = await IndicatorService.getIndicatorsByDepartament(departamentId);
        result.forEach((x) => {
            x.dataValues.id = Utils.encode(x.dataValues.id);
            x.dataValues.departamentId = Utils.encode(x.dataValues.departamentId);
            x.dataValues.formulaId = Utils.encode(x.dataValues.formulaId);
        });
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const getFormulas = async (req, res, next) => {
    try {
        const result = await IndicatorService.getFormulas();
        result.forEach((x) => {
            x.dataValues.id = Utils.encode(x.dataValues.id);
        });
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const createIndicator = async (req, res, next) => {
    try {
        const data = req.body;
        data.departamentId = decodeId(data.departamentId, 'departamentId');
        data.formulaId = decodeId(data.formulaId, 'formulaId');
        await IndicatorService.createIndicator(data);
        res.status(200).json({ data: 'resource created successfully' });
    } catch (error) {
        next(error);
    }
};

const updateIndicator = async (req, res, next) => {
    try {
        const indicatorId = decodeId(req.params.indicator_id, 'indicator_id');
        const data = req.body;
        delete data.id;
        data.formulaId = decodeId(data.formulaId, 'formulaId');
        data.departamentId = decodeId(data.departamentId, 'departamentId');
        await IndicatorService.updateIndicator(data, {
            where: { id: indicatorId }
        });
        res.status(200).json({ data: 'resource updated successfully' });
    } catch (error) {
        next(error);
    }
};

const deleteIndicator = async (req, res, next) => {
    try {
        const indicatorId = decodeId(req.params.indicator_id, 'indicator_id');
        await IndicatorService.deleteIndicator(indicatorId);
        res.status(200).json({ data: 'resource deleted successfully' });
    } catch (error) {
        next(error);
    }
};

const createTabulation = async (req, res, next) => {
    try {
        const math = create(all);
        const data = req.body;
        data.indicatorId = decodeId(data.indicatorId, 'indicatorId');
        const indicador = await IndicatorService.getIndicatorById(data.indicatorId);
        if (!indicador || !indicador.formula) {
            throw new AppError('Indicador o fórmula no encontrados', 404);
        }

        const formula = indicador.formula_indicator.name;
        const scope = { a: data.a, b: data.b };

        let percent;
        try {
            percent = Number(data.b) === 0 ? null : math.evaluate(formula, scope);
        } catch (evalError) {
            throw new AppError('No se pudo evaluar la fórmula del indicador', 400);
        }

        data.percent = percent;
        await IndicatorService.createTabulation(data);
        res.status(200).json({ data: 'resource created successfully' });
    } catch (error) {
        next(error);
    }
};

const getTabulationsByIndicator = async (req, res, next) => {
    try {
        const indicatorId = decodeId(req.params.indicator_id, 'indicator_id');
        const result = await IndicatorService.getTabulationsByIndicator(indicatorId);
        if (!result) throw new AppError('Indicador no encontrado', 404);
        encodeIndicator(result);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

//idicator staffs

const getProcesStaffs = async (req, res, next) => {
    try {
        const staffId = decodeId(req.params.staff_id, 'staff_id');
        const result = await IndicatorService.getProcesStaffs(staffId);
        result.forEach((x) => {
            x.dataValues.id = Utils.encode(x.dataValues.id);
        });
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const getAllStaffsByProces = async (req, res, next) => {
    try {
        const processId = decodeId(req.params.process_id, 'process_id');
        const result = await IndicatorService.getAllStaffsByProces(processId);
        result.forEach((x) => {
            x.dataValues.id = Utils.encode(x.dataValues.id);
        });
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

const assignStaff = async (req, res, next) => {
    try {
        const data = req.body;
        if (!Array.isArray(data.staffs)) {
            data.staffs = [data.staffs];
        }
        data.staffs = data.staffs.map((staffId) => ({ staffId: decodeId(staffId, 'staffId') }));
        data.processId = decodeId(req.params.process_id, 'process_id');
        await IndicatorService.assignStaff(data);
        res.status(200).json({ data: 'resource created successfully' });
    } catch (error) {
        next(error);
    }
};

const deleteStafft = async (req, res, next) => {
    try {
        const id = decodeId(req.params.staff_id, 'staff_id');
        await IndicatorService.deleteStafft({
            where: { id }
        });
        res.status(200).json({ data: 'resource deleted successfully' });
    } catch (error) {
        next(error);
    }
};

const IndicatorController = {
    getAllIndicators,
    getIndicatorsByDepartament,
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
