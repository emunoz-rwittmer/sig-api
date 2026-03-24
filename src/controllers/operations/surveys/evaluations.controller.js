const EvaluationService = require('../../../services/operations/surveys/evaluations.services');
const Utils = require('../../../utils/Utils');
const Staffervice = require('../../../services/catalogs/staff.services');
const DepartamentService = require('../../../services/catalogs/departaments.services');
const moment = require('moment');

const getAllEvaluations = async (req, res) => {
    try {
        const { userName } = req.query;
        let evaluations = await EvaluationService.getEvaluationsByUser(userName);

        await Promise.all(
            evaluations.map(async (evaluation) => {
                if (isTempPasswordExpired(evaluation.expirationDate)) {
                    await EvaluationService.updateEvaluation(evaluation.id);
                }
            })
        );

        evaluations = await EvaluationService.getEvaluationsByUser(userName);

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
        const evaluationId = Utils.decode(req.params.evaluation_id);
        const result = await EvaluationService.getEvaluationById(evaluationId);
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
        const evaluationId = Utils.decode(req.params.evaluation_id)
        const answers = req.body
        await EvaluationService.respondEvaluation(evaluationId, answers);
        res.status(200).json({ data: 'resource created successfully' });
    } catch (error) {

        res.status(400).json(error.message);
    }
}

//EVALUATIONS REPORTING

const getReportingByCompany = async (req, res) => {
    try {
        const companyId = Utils.decode(req.params.company_id);
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        const result = await EvaluationService.getEvaluationsByCompany(companyId, startDate, endDate)
        
        await Promise.all(
            result.map(async (evaluation) => {
                if (isTempPasswordExpired(evaluation.expirationDate)) {
                    await EvaluationService.updateEvaluation(evaluation.id);
                }
            })
        );

        if (result instanceof Array) {
            result.map((x) => {
                x.dataValues.id = Utils.encode(x.dataValues.id);
                x.dataValues.companyId = Utils.encode(x.dataValues.companyId);
                return x;
            });
        }
        res.status(200).json(result);
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
        const yacht = await DepartamentService.getDepartamentById(departamentId);
        const evaluations = await EvaluationService.getEvaluationsByDepartament(departamentId, startDate, endDate);
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
        res.status(200).json({ yacht, result, evaluations });
    } catch (error) {

        res.status(400).json(error.message)
    }
}

const getReportingEvaluationsByCrew = async (req, res) => {
    try {
        const crewId = req.params.crew_id;
        const yachtId = Utils.decode(req.query.yachtId)
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        const staff = await Staffervice.getStaffById(crewId)
        const evaluations = await EvaluationService.getEvaluationByEvaluated(crewId, startDate, endDate, yachtId)
        res.status(200).json({ staff, evaluations });

    } catch (error) {

        res.status(400).json(error.message)
    }
}

const deleteEvaluation = async (req, res) => {
    try {
        const evaluatedId = Utils.decode(req.params.evaluation_id);
        await EvaluationService.delete({
            where: { id: evaluatedId, state: ['Pendiente', 'Caducada'] }
        });
        res.status(200).json({ data: 'resource deleted successfully' })
    } catch (error) {
        res.status(400).json(error.message);
    }
}

isTempPasswordExpired = (expirationDate) => {
    return moment().isAfter(moment(expirationDate));
};

const EvaluationController = {
    getAllEvaluations,
    getEvaluation,
    respondEvaluation,
    getReportingByCompany,
    getReportingByDepartament,
    getReportingEvaluationsByCrew,
    deleteEvaluation
}
module.exports = EvaluationController