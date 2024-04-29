const EvaluationService = require('../../../services/operations/evaluations/evaluations.services');
const Utils = require('../../../utils/Utils');
const CaptainService = require('../../../services/catalogs/captains.services');

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
        if(response){
            res.status(200).json({ data: 'resource created successfully' });
        }
    } catch (error) {
        console.log(error)
        res.status(400).json(error.message);
    }
}



const EvaluationController = {
    getAllEvaluations,
    getEvaluation,
    respondEvaluation,
}
module.exports = EvaluationController