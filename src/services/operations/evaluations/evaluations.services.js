const Form = require('../../../models/operations/surveys/form.models');
const EstructureQuestion = require("../../../models/operations/surveys/estructureQuestion.models");
const FormEstructure = require("../../../models/operations/surveys/formEstructure.models");
const HeaderAnswer = require('../../../models/operations/surveys/headerAnwer.models')
const FormAnswer = require('../../../models/operations/surveys/formAnswer.models');
//CATALOGS MODELS
const Captain = require('../../../models/catalogs/captains.models');
const CaptainYacht = require('../../../models/catalogs/captainYacht.models');
const CrewYacht = require('../../../models/catalogs/crewYacht.models');
const Crew = require('../../../models/catalogs/crews.models');
const Yacht = require('../../../models/catalogs/yacht.models');


class EvaluationService {
    static async getEvaluationsByCapitanl(names) {
        try {
            const result = await HeaderAnswer.findAll({
                where: { evaluator: names, isComplete: false },
                include: [{
                    model: Form,
                    as: "header_form",
                    attributes: ['title'],
                }, {
                    model: Yacht,
                    as: "header_yacht",
                    attributes: ['name'],
                }]
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getEvaluationByCrew(names) {
        try {
            const result = await HeaderAnswer.findOne({
                where: { evaluator: names, isComplete: false },
                include: [{
                    model: Form,
                    as: "header_form",
                    attributes: ['id','title'],
                }, {
                    model: Yacht,
                    as: "header_yacht",
                    attributes: ['name'],
                }]
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getEvaluationById(id) {
        try {
            const result = await Form.findOne({
                where: { id },
                attributes: ['id', 'title', 'active', 'people', 'createdAt'],
                include: [{
                    model: FormEstructure,
                    as: "form_estructure",
                    attributes: ['id'],
                    include: [{
                        model: EstructureQuestion,
                        as: "questions_estucture",
                    }]
                }]
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async createAnswers(evaluationId, evaluation) {
        try {
            const falta = evaluation.falta
            Object.entries(evaluation.respuestas).forEach(([numeroPregunta, answer]) => {
                FormAnswer.create({
                    headerAnswerId: evaluationId,
                    estructureQuestionId: parseInt(numeroPregunta),
                    answer,
                    description: answer === "Falta leve" || answer === "Falta grave" || answer === "Falta muy grave" ? falta : " "
                }).then(res => {
                    return res;
                }).catch(error => {
                    throw error;
                });
            });
        } catch (error) {
            throw error;

        }
    }

    static async updateStatusHeaderAnswers(evaluationId) {
        try {
            console.log("entre aqui")
            const result = HeaderAnswer.update({isComplete: true}, {where: { id: evaluationId}});
            return result
        } catch (error) {
            console.log(error)
            throw error;
        }
    }

}

module.exports = EvaluationService;