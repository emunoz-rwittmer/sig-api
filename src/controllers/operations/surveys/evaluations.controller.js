const EvaluationService = require('../../../services/operations/surveys/evaluations.services');
const Utils = require('../../../utils/Utils');
const CaptainService = require('../../../services/catalogs/captains.services');
const YachtService = require('../../../services/catalogs/yachts.services');
const CrewService = require('../../../services/catalogs/crews.services');

const getAllEvaluations = async (req, res) => {
    try {
        const userId = Utils.decode(req.query.user_id)
        if (req.query.rol === "captain") {
            const captain = await CaptainService.getCaptainById(userId)
            const names = captain.dataValues.first_name + " " + captain.dataValues.last_name
            const result = await EvaluationService.getEvaluationsByCapitanl(names);
            if (result instanceof Array) {
                result.map((x) => {
                    x.dataValues.id = Utils.encode(x.dataValues.id);
                    x.dataValues.formId = Utils.encode(x.dataValues.formId);
                });
            }
            res.status(200).json(result);
        }
    } catch (error) {
        res.status(400).json(error.message)
    }
}

const getEvaluation = async (req, res) => {
    try {
        const formId = Utils.decode(req.params.form_id);
        const result = await EvaluationService.getEvaluationById(formId);
        if (result instanceof Object) {
            result.dataValues.id = Utils.encode(result.dataValues.id);
        }
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json(error.message)
    }
}

const respondEvaluation = async (req, res) => {
    try {
        const evaluationId = Utils.decode(req.body.evaluation_id)
        const evaluation = req.body
        const result = await EvaluationService.createAnswers(evaluationId, evaluation);
        const response = await EvaluationService.updateStatusHeaderAnswers(evaluationId)
        if (response) {
            res.status(200).json({ data: 'resource created successfully' });
        }
    } catch (error) {
        console.log(error)
        res.status(400).json(error.message);
    }
}

//EVALUATIONS REPORTING

const getReportingByYacht = async (req, res) => {
    try {
        const yachtId = Utils.decode(req.params.yacht_id);
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        const yacht = await YachtService.getYachtById(yachtId)
        const evaluations = await EvaluationService.getEvaluationsByYacht(yachtId, startDate, endDate)
        const result = await EvaluationService.getReportingByYacht(yachtId);
        console.log(result)
        if (result.captains instanceof Array) {
            result.captains.map((x) => {
                console.log(x.captain_yacht.id)
                x.captain_yacht.id = Utils.encode(x.captain_yacht.id);

            });
        }
        if (result.crews instanceof Array) {
            result.crews.map((x) => {
                x.crew_yacht.id = Utils.encode(x.crew_yacht.id);
            });
        }
        result.yacht = yacht.dataValues
        result.evaluations = evaluations
        
        res.status(200).json(result);
    } catch (error) {
        console.log(error)
        res.status(400).json(error.message)
    }
}

const getReportingEvaluationsByCrew = async (req, res) => {
    try {
        const crewId = Utils.decode(req.params.crew_id);
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        const type = req.query.type;
        let result = {}
        if (type === 'captain') {
            const captain = await CaptainService.getCaptainById(crewId);
            const names = captain.dataValues.first_name + " " + captain.dataValues.last_name
            const evaluations = await EvaluationService.getEvaluationByEvaluated(names, startDate, endDate)
            result.crew = captain
            result.evaluations = evaluations
            res.status(200).json(result);
        } else {
            const crew = await CrewService.getCrewById(crewId);
            const names = crew.dataValues.first_name + " " + crew.dataValues.last_name;
            const evaluations = await EvaluationService.getEvaluationByEvaluated(names, startDate, endDate);
            result.crew = crew
            result.evaluations = evaluations
            res.status(200).json(result);
        }
    } catch (error) {
        console.log(error)
        res.status(400).json(error.message)
    }
}



const EvaluationController = {
    getAllEvaluations,
    getEvaluation,
    respondEvaluation,
    getReportingByYacht,
    getReportingEvaluationsByCrew
}
module.exports = EvaluationController