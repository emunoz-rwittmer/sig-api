// src/controllers/reports/desempenoDashboard.controller.js
const {
    getOverview,
    getYates,
    getPersonas,
    getPreguntas,
    getColaborador,
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
        const yates = await getYates(asString(req.query.yate), asString(req.query.anio));
        res.status(200).json(yates);
    } catch (error) {
        next(error);
    }
};

const getDesempenoPersonas = async (req, res, next) => {
    try {
        const { yate, evaluado, funcion, area, anio, tipoEvaluacion, desde, hasta } = req.query;
        const personas = await getPersonas({
            desde: asString(desde),
            hasta: asString(hasta),
            yate: asString(yate),
            evaluado: asString(evaluado),
            funcion: asString(funcion),
            area: asString(area),
            anio: asString(anio),
            tipoEvaluacion: asString(tipoEvaluacion),
        });
        res.status(200).json(personas);
    } catch (error) {
        next(error);
    }
};

const getDesempenoPreguntas = async (req, res, next) => {
    try {
        const { evaluado, funcion, anio, yate } = req.query;
        const preguntas = await getPreguntas({
            evaluado: asString(evaluado),
            funcion: asString(funcion),
            anio: asString(anio),
            yate: asString(yate),
        });
        res.status(200).json(preguntas);
    } catch (error) {
        next(error);
    }
};

const getDesempenoColaborador = async (req, res, next) => {
    try {
        const { evaluado, anio } = req.query;
        const colaborador = await getColaborador({
            evaluado: asString(evaluado),
            anio: asString(anio),
        });
        res.status(200).json(colaborador);
    } catch (error) {
        next(error);
    }
};

const Bono = require('../../services/reports/bonoDesempeno.services');

const getBonoCumplimiento = async (req, res, next) => {
    try {
        res.status(200).json(await Bono.getCumplimiento({ anio: asString(req.query.anio), semestre: asString(req.query.semestre) }));
    } catch (error) {
        next(error);
    }
};

const createBonoIncident = async (req, res, next) => {
    try {
        const { staffId, kind, date, description } = req.body;
        if (!staffId || !['memo', 'reglamento'].includes(kind) || !/^\d{4}-\d{2}-\d{2}$/.test(date || '')) {
            return res.status(400).json({ message: 'staffId, kind (memo|reglamento) y date (YYYY-MM-DD) son obligatorios' });
        }
        res.status(201).json(await Bono.createIncident({ staffId, kind, date, description }));
    } catch (error) {
        next(error);
    }
};

const deleteBonoIncident = async (req, res, next) => {
    try {
        await Bono.deleteIncident(req.params.id);
        res.status(204).end();
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getBonoCumplimiento,
    createBonoIncident,
    deleteBonoIncident,
    getDesempenoOverview,
    getDesempenoYates,
    getDesempenoPersonas,
    getDesempenoPreguntas,
    getDesempenoColaborador,
};
