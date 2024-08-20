const Form = require('../../../models/operations/surveys/form.models');
const EstructureQuestion = require("../../../models/operations/surveys/estructureQuestion.models");
const FormEstructure = require("../../../models/operations/surveys/formEstructure.models");
const HeaderAnswer = require('../../../models/operations/surveys/headerAnwer.models')
const FormAnswer = require('../../../models/operations/surveys/formAnswer.models');
const Yacht = require('../../../models/catalogs/yacht.models');
const { Op, where } = require('sequelize');
const Staff = require('../../../models/catalogs/staff.models');
const Departaments = require('../../../models/catalogs/departament.models');
const Positions = require('../../../models/catalogs/positions.models');
const StaffYacht = require('../../../models/catalogs/staffYacht.models');
const StatusEvaluation = require('../../../models/operations/surveys/statusEvaluations.models');

class EvaluationService {
    static async getEvaluationsByUser(evaluatorId) {
        try {
            const result = await HeaderAnswer.findAll({
                where: { evaluatorId, stateId: 1 },
                attributes: ['id', 'formId', 'expirationDate', 'createdAt'],
                include: [{
                    model: Yacht,
                    as: 'header_yacht',
                    attributes: ['name'],
                }, {
                    model: Form,
                    as: "header_form",
                    attributes: ['title'],
                }, {
                    model: Staff,
                    as: "header_evaluted",
                    attributes: ['id', 'firstName', 'lastName'],
                    include: [{
                        model: Departaments,
                        as: 'staff_departament',
                        attributes: ['id', 'name'],
                    }, {
                        model: Positions,
                        as: 'staff_position',
                        attributes: ['id', 'name'],
                    }]
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

    static async getEvaluationsToDay(startDate, endDate, positionId) {
        try {

            const evaluatedInclude = {
                model: Staff,
                as: "header_evaluted",
                attributes: ['firstName', 'lastName'],
                include: [{
                    model: Positions,
                    as: 'staff_position',
                    attributes: ['name'],
                }]
            }

            if (positionId) {
                evaluatedInclude.where = { positionId: positionId };
            }

            const result = await HeaderAnswer.findAll({
                where: {
                    createdAt: {
                        [Op.between]: [startDate, endDate]
                    }
                },
                attributes: ['id', 'formId', 'expirationDate', 'createdAt'],
                include: [{
                    model: Form,
                    as: "header_form",
                    attributes: ['title'],
                }, {
                    model: Staff,
                    as: "header_evalutor",
                    attributes: ['firstName', 'lastName'],
                },{
                    model: Staff,
                    as: "header_evalutor",
                    attributes: ['firstName', 'lastName'],
                },{
                    model: StatusEvaluation,
                    as: "state",
                    attributes: ['state'],
                }, evaluatedInclude
                ]
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

    static async updateStatusHeaderAnswers(id) {
        try {
            const result = await HeaderAnswer.update(
                { stateId: 2 },
                { where: { id } });
            return result
        } catch (error) {
            throw error;
        }
    }

    static async updateEvaluation(id) {
        try {
            const result = await HeaderAnswer.update(
                { stateId: 3 },
                { where: { id, stateId:1 } });
            return result
        } catch (error) {
            throw error;
        }
    }

    //REPORTING EVALUATIONS

    static async getReportingByYacht(yachtId) {
        try {
            const result = await StaffYacht.findAll({
                where: { yachtId },
                attributes: ['id'],
                include: [{
                    model: Staff,
                    as: "staff_yacht",
                    attributes: ['id', 'first_name', 'last_name', 'email', 'cell_phone', 'active'],
                    include: [
                        {
                            model: Positions,
                            as: 'staff_position',
                            attributes: ['id', 'name'],
                        }
                    ]
                }]
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getEvaluationsByYacht(yachtId, startDate, endDate) {
        try {
            const result = await HeaderAnswer.findAll({
                where: {
                    yachtId,
                    createdAt: {
                        [Op.between]: [startDate, endDate]
                    }
                },
                attributes: ['id', 'evaluatedId'],
                include: [
                    {
                        model: FormAnswer,
                        as: 'answer_header'
                    }
                ]
            })
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getEvaluationsByDepartament(departamentId, startDate, endDate) {
        try {
            const result = await HeaderAnswer.findAll({
                where: {
                    createdAt: {
                        [Op.between]: [new Date(startDate), new Date(endDate)]
                    },

                },
                attributes: ['id', 'evaluatedId'],
                include: [
                    {
                        model: Staff,
                        as: 'header_evaluted',
                        where: { departamentId }
                    },
                    {
                        model: FormAnswer,
                        as: 'answer_header'
                    }
                ],

            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getReportingByDepartament(departamentId) {
        try {
            const result = await Staff.findAll({
                where: { departamentId },
                attributes: ['id', 'first_name', 'last_name', 'email', 'cell_phone', 'company', 'active'],
                order: [
                    ['first_name', 'ASC']
                ],
                include: [{
                    model: Departaments,
                    as: 'staff_departament',
                    attributes: ['id', 'name'],
                }, {
                    model: Positions,
                    as: 'staff_position',
                    attributes: ['id', 'name'],
                }],
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getEvaluationByEvaluated(evaluatedId, startDate, endDate, yachtId) {
        try {

            const whereClause = {
                evaluatedId,
                createdAt: {
                    [Op.between]: [startDate, endDate]
                }
            };

            if (yachtId) {
                whereClause.yachtId = yachtId;
            }

            const result = await HeaderAnswer.findAll({
                where: whereClause,
                attributes: ['id', 'stateId', 'updatedAt', 'createdAt'],
                include: [{
                    model: Staff,
                    as: "header_evalutor",
                    attributes: ['firstName', 'lastName'],
                    include: [
                        {
                            model: Positions,
                            as: 'staff_position',
                            attributes: ['id', 'name'],
                        }
                    ]
                }, {
                    model: StatusEvaluation,
                    as: "state",
                    attributes: ['state'],
                }, {
                    model: Form,
                    as: "header_form",
                    attributes: ['id', 'title'],
                }, {
                    model: Yacht,
                    as: "header_yacht",
                    attributes: ['name'],
                }, {
                    model: FormAnswer,
                    as: 'answer_header',
                    include: [{
                        model: EstructureQuestion,
                        as: 'aswer_question',
                        attributes: ['pregunta'],
                    }]

                }]
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

}

module.exports = EvaluationService;