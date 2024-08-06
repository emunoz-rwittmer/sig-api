const EvaluationService = require('../../../services/operations/surveys/evaluations.services');
const Utils = require('../../../utils/Utils');
const CaptainService = require('../../../services/catalogs/captains.services');
const YachtService = require('../../../services/catalogs/yachts.services');
const CrewService = require('../../../services/catalogs/crews.services');
const moment = require('moment');
const Staffervice = require('../../../services/catalogs/staff.services');
const DepartamentService = require('../../../services/catalogs/departaments.services');

const getAllEvaluations = async (req, res) => {
    try {
        const userId = Utils.decode(req.query.user_id);
        let evaluations = await EvaluationService.getEvaluationsByUser(userId);

        await Promise.all(
            evaluations.map(async (evaluation) => {
                if (isTempPasswordExpired(evaluation.expirationDate)) {
                    await EvaluationService.updateEvaluation(evaluation.id);
                }
            })
        );

        evaluations = await EvaluationService.getEvaluationsByUser(userId);

        if (evaluations instanceof Array) {
            evaluations = evaluations.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
                x.dataValues.formId = Utils.encode(x.dataValues.formId);
                return x;
            });
        }

        res.status(200).json(evaluations);
    } catch (error) {
        res.status(400).json(error.message);
    }
};

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
        if (evaluations instanceof Array) {
            evaluations.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
                x.dataValues.evaluatedId = Utils.encode(x.dataValues.evaluatedId);
            });
        }
        const result = await EvaluationService.getReportingByYacht(yachtId);
        if (result instanceof Array) {
            result.map((x) => {
                x.staff_yacht.dataValues.id = Utils.encode(x.staff_yacht.dataValues.id);
            });
        }
        res.status(200).json({ yacht, result, evaluations });
    } catch (error) {
        console.log(error)
        res.status(400).json(error.message)
    }
}

const getReportingByDepartament = async (req, res) => {
    try {
        const departamentId = Utils.decode(req.params.departament_id);
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        const departament = await DepartamentService.getDepartamentById(departamentId);
        const evaluations = await EvaluationService.getEvaluationsByDepartament(departamentId, startDate, endDate)
        if (evaluations instanceof Array) {
            evaluations.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
                x.dataValues.evaluatedId = Utils.encode(x.dataValues.evaluatedId);
            });
        }
        const result = await EvaluationService.getReportingByDepartament(departamentId);
        if (result instanceof Array) {
            result.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
            });
        }

        console.log(evaluations)
        res.status(200).json({ departament, result, evaluations });
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
        const staff = await Staffervice.getStaffById(crewId)
        const evaluations = await EvaluationService.getEvaluationByEvaluated(crewId, startDate, endDate)
        res.status(200).json({staff, evaluations});

    } catch (error) {
        console.log(error)
        res.status(400).json(error.message)
    }
}

isTempPasswordExpired = (expirationDate) => {
    return moment().isAfter(moment(expirationDate));
};

const EvaluationController = {
    getAllEvaluations,
    getEvaluation,
    respondEvaluation,
    getReportingByYacht,
    getReportingByDepartament,
    getReportingEvaluationsByCrew
}
module.exports = EvaluationController