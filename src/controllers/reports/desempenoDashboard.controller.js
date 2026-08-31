// src/controllers/reports/desempenoDashboard.controller.js
const {
    getOverview,
    getYates,
    getPersonas,
    getPreguntas,
} = require('../../services/reports/desempenoDashboard.services');

const getDesempenoOverview = async (req, res, next) => {
    try {
        const overview = await getOverview(req.query.yate);
        res.status(200).json(overview);
    } catch (error) {
        next(error);
    }
};

const getDesempenoYates = async (req, res, next) => {
    try {
        const yates = await getYates(req.query.yate);
        res.status(200).json(yates);
    } catch (error) {
        next(error);
    }
};

const getDesempenoPersonas = async (req, res, next) => {
    try {
        const { yate, evaluado, funcion, anio } = req.query;
        const personas = await getPersonas({ yate, evaluado, funcion, anio });
        res.status(200).json(personas);
    } catch (error) {
        next(error);
    }
};

const getDesempenoPreguntas = async (req, res, next) => {
    try {
        const { evaluado, funcion, anio } = req.query;
        const preguntas = await getPreguntas({ evaluado, funcion, anio });
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
