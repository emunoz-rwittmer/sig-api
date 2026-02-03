const Form = require('../../../models/operations/surveys/form.models');
const FormQuestion = require("../../../models/operations/surveys/formQuestion.models");
const FormRespond = require('../../../models/operations/surveys/formRespond.models')
const FormAnswers = require('../../../models/operations/surveys/formAnswers.models');
const Yacht = require('../../../models/catalogs/yacht.models');
const Staff = require('../../../models/catalogs/staff.models');
const Departaments = require('../../../models/catalogs/departament.models');
const Positions = require('../../../models/catalogs/positions.models');
const { Op, where } = require('sequelize');

class EvaluationService {
    static async getEvaluationsByUser(evaluatorId) {
        try {
            const result = await FormRespond.findAll({
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
                attributes: ['id', 'name', 'active', 'createdAt'],
                include: [{
                    model: FormQuestion,
                    as: "preguntas",
                }]
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getEvaluationsToDay(startDate, endDate, positionId) {
        try {

            if (positionId) {
                evaluatedInclude.where = { positionId: positionId };
            }

            const result = await FormRespond.findAll({
                where: {
                    createdAt: {
                        [Op.between]: [startDate, endDate]
                    }
                },
                attributes: ['id', 'formId', 'state','expirationDate', 'createdAt'],
                include: [{
                    model: Form,
                    as: "formulario",
                    attributes: ['name'],
                }, {
                    model: Yacht,
                    as: "yate",
                    attributes: ['name'],
                }, {
                    model: Staff,
                    as: "evaluador",
                    attributes: ['firstName', 'lastName'],
                }, {
                    model: Staff,
                    as: "evaluado",
                    attributes: ['firstName', 'lastName'],
                    include: [{
                        model: Positions,
                        as: 'staff_position',
                        attributes: ['name'],
                    }]
                },

                ]
            });
            return result;
        } catch (error) {
            console.log(error)
            throw error;
        }
    }

    static async respondEvaluation(evaluationId, evaluation) {
        try {
            const falta = evaluation.falta
            Object.entries(evaluation.respuestas).forEach(([numeroPregunta, answer]) => {
                FormAnswers.create({
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

    static async updateStatusFormResponds(id) {
        try {
            const result = await FormRespond.update(
                { stateId: 2 },
                { where: { id } });
            return result
        } catch (error) {
            throw error;
        }
    }

    static async updateEvaluation(id) {
        try {
            const result = await FormRespond.update(
                { stateId: 3 },
                { where: { id, stateId: 1 } });
            return result
        } catch (error) {
            throw error;
        }
    }

    //REPORTING EVALUATIONS

    static async getEvaluationsByYacht(yachtId, startDate, endDate) {
        try {

            const where = {};

            if (yachtId && yachtId !== "undefined" && yachtId !== "null") {
                where.yachtId = yachtId;
            }

            if ((startDate && (startDate !== "undefined" && startDate !== 'null')) && (endDate && (endDate !== "undefined" && endDate !== 'null'))) {
                where.createdAt = {
                    [Op.between]: [new Date(startDate), new Date(endDate)]
                };
            }

            const result = await FormRespond.findAll({
                where: where,
                include: [
                    {
                        model: Yacht,
                        as: "yate",
                        //required: true,
                        attributes: ['id', 'name'],
                    },
                    {
                        model: Form,
                        as: "formulario",
                        attributes: ['id', 'name'],
                    },
                    {
                        model: Staff,
                        as: "evaluado", // 👈 evaluado
                        required: true,
                        attributes: ['id', 'firstName', 'lastName'],
                        include: [
                            {
                                model: Positions,
                                as: 'staff_position',
                                attributes: ['id', 'name'],
                            },
                        ]
                    },
                    {
                        model: Staff,
                        as: "evaluador", // 👈 evaluador
                        required: true,
                        attributes: ['id', 'firstName', 'lastName'],
                        include: [
                            {
                                model: Positions,
                                as: 'staff_position',
                                attributes: ['id', 'name'],
                            },
                        ]
                    },
                    {
                        model: FormAnswers,
                        as: 'respuestas',
                        attributes: ['id', 'answer'],
                        include: [{
                            model: FormQuestion,
                            as: 'pregunta',
                            attributes: ['id', 'title'],
                        }]
                    },
                ],
            })
            return result;
        } catch (error) {
            console.log(error)
            throw error;
        }
    }

    static async getEvaluationsByDepartament(departamentId, startDate, endDate) {
        try {
            const result = await FormRespond.findAll({
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
                        model: FormAnswers,
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

            const result = await FormRespond.findAll({
                where: whereClause,
                attributes: ['id', 'stateId', 'updatedAt', 'createdAt'],
                include: [{
                    model: Staff,
                    as: "header_evaluator",
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
                    model: FormAnswers,
                    as: 'answer_header',
                    include: [{
                        model: FormQuestion,
                        as: 'aswer_question',
                        attributes: ['pregunta'],
                    }]

                }]
            });
            return result;
        } catch (error) {
            console.log(error)
            throw error;
        }
    }

    static async delete(id) {
        try {
            const result = await FormRespond.destroy(id);
            return result;
        } catch (error) {
            throw error;
        }
    }

}

module.exports = EvaluationService;