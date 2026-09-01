// src/controllers/reports/desempenoDashboard.controller.js
const {
    getOverview,
    getYates,
    getPersonas,
    getPreguntas,
} = require('../../services/reports/desempenoDashboard.services');

const asString = (value) => (typeof value === 'string' ? value : undefined);

const getDesempenoOverview = async (req, res, next) => {
    try {
        const overview = await getOverview(asString(req.query.yate));
        res.status(200).json(overview);
    } catch (error) {
        next(error);
    }
};

const getDesempenoYates = async (req, res, next) => {
    try {
        const yates = await getYates(asString(req.query.yate));
        res.status(200).json(yates);
    } catch (error) {
        next(error);
    }
};

const getDesempenoPersonas = async (req, res, next) => {
    try {
        const { yate, evaluado, funcion, area, anio } = req.query;
        const personas = await getPersonas({
            yate: asString(yate),
            evaluado: asString(evaluado),
            funcion: asString(funcion),
            area: asString(area),
            anio: asString(anio),
        });
        res.status(200).json(personas);
    } catch (error) {
        next(error);
    }
};

const getDesempenoPreguntas = async (req, res, next) => {
    try {
        const { evaluado, funcion, anio } = req.query;
        const preguntas = await getPreguntas({
            evaluado: asString(evaluado),
            funcion: asString(funcion),
            anio: asString(anio),
        });
        res.status(200).json(preguntas);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getDesempenoOverview,
    getDesempenoYates,
    getDesempenoPersonas,
    getDesempenoPreguntas,
};
