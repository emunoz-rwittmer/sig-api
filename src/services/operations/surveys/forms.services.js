const Form = require('../../../models/operations/surveys/form.models');
const EstructureQuestion = require("../../../models/operations/surveys/estructureQuestion.models");
const FormEstructure = require("../../../models/operations/surveys/formEstructure.models");
const HeaderAnswer = require('../../../models/operations/surveys/headerAnwer.models')
const Positions = require('../../../models/catalogs/positions.models');


class FormService {
    static async getAll() {
        try {
            const result = await Form.findAll({
                attributes: ['id', 'title', 'active', 'createdAt'],
                include: [{
                    model: Positions,
                    as: 'position_form',
                    attributes: ['name']
                }]
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async getFormById(id) {
        try {
            const result = await Form.findOne({
                where: { id },
                attributes: ['id', 'title', 'positionId', 'active', 'createdAt'],
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

    static async createForm(form) {
        try {
            const result = await Form.create(form);
            return result;
        } catch (error) {
            throw error;

        }
    }

    static async createEstructureQuestion(formId, estructure) {
        try {
            const newEstructure = []
            estructure.forEach(item => {
                const result = EstructureQuestion.create({
                    pregunta: item.pregunta,
                    tipoRespuesta: item.tipoRespuesta,
                    opciones: item.opciones.map((opcion) => opcion)
                })
                    .then(res => {
                        const formEstructure = FormEstructure.create({
                            formId,
                            estructureQuestionId: res.id
                        })
                        return formEstructure
                    })
            });
        } catch (error) {
            throw error;

        }
    }

    static async updateEstructureQuestion(estructure, formId) {
        try {
            estructure.forEach(item => {
                if (item.questionId) {
                    const updateEstructure = EstructureQuestion.update(item,
                        {
                            where: { id: item.questionId }
                        })
                }
                if (!item.questionId) {
                    const result = EstructureQuestion.create({
                        pregunta: item.pregunta,
                        tipoRespuesta: item.tipoRespuesta,
                        opciones: item.opciones.map((opcion) => opcion)
                    })
                        .then(res => {
                            const formEstructure = FormEstructure.create({
                                formId,
                                estructureQuestionId: res.id
                            })
                        })
                }
                return "Is Ok"
            });
        } catch (error) {
            throw error;
        }
    }

    static async updateForm(form, id) {
        try {
            const result = await Form.update(form, id);
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async delete(id) {
        try {
            const result = await Form.destroy(id);
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async deleteQuestionForm(formId, questionId) {
        try {
            const formEstructure = await FormEstructure.destroy({
                where: { formId, estructureQuestionId: questionId }
            })
            const questionEstrure = await EstructureQuestion.destroy({
                where: { id: questionId }
            })
            return { formEstructure, questionEstrure };
        } catch (error) {
            throw error;
        }
    }

    static async createHeaderAnswer(data) {
        try {
            const results = await Promise.all(data.evaluated.map(async (evaluado) => {
                const resultTwo = await Promise.all(data.evaluator.map(async (evaluador) => {
                    const result = await HeaderAnswer.create({
                        yachtId: data.yachtId ? data.yachtId : null,
                        formId: data.formId,
                        stateId: 1,
                        evaluatorId: evaluador,
                        evaluatedId: evaluado,
                        expirationDate: data.expirationDate
                    });
                    return result;
                }))
                return resultTwo;
            }));

            return results
        } catch (error) {
            console.log(error)
            throw error;
        }
    }

}

module.exports = FormService;