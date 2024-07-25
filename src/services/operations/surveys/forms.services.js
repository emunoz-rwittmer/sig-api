const Form = require('../../../models/operations/surveys/form.models');
const EstructureQuestion = require("../../../models/operations/surveys/estructureQuestion.models");
const FormEstructure = require("../../../models/operations/surveys/formEstructure.models");
const HeaderAnswer = require('../../../models/operations/surveys/headerAnwer.models')
//CATALOGS MODELS
const Captain = require('../../../models/catalogs/captains.models');
const CaptainYacht = require('../../../models/catalogs/captainYacht.models');
const CrewYacht = require('../../../models/catalogs/crewYacht.models');
const Crew = require('../../../models/catalogs/crews.models');


class FormService {
    static async getAll() {
        try {
            const result = await Form.findAll({
                attributes: ['id', 'title', 'active', 'people', 'createdAt']
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

    static async serchCrew(yachtId) {
        try {
            const captains = await CaptainYacht.findAll({
                where: { yachtId },
                attributes: ['id'],
                include: [{
                    model: Captain,
                    as: "captain_yacht",
                    attributes: ['id', 'first_name', 'last_name', 'email', 'cell_phone', 'active'],
                    where: { active : true}
                }]
            });
            const crew = await CrewYacht.findAll({
                where: { yachtId },
                attributes: ['id'],
                include: [{
                    model: Crew,
                    as: "crew_yacht",
                    attributes: ['id', 'first_name', 'last_name', 'email', 'cell_phone', 'active'],
                    where: { active : true}
                }]
            });
            return { captains, crew };
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
            for (const evaluado of data.evaluated) {
                for (const evaluador of data.evaluator) {
                    const result = await HeaderAnswer.create({
                        formId: data.formId,
                        yachtId: data.yachtId,
                        evaluator: evaluador.dataValues.first_name + " " + evaluador.dataValues.last_name,
                        evaluated: evaluado.dataValues.first_name + " " + evaluado.dataValues.last_name,
                    });
                }
            }
            return "Is Ok"
        } catch (error) {
            throw error;
        }
    }

}

module.exports = FormService;