const Form = require('../../../models/operations/surveys/form.models');
const FormQuestion = require("../../../models/operations/surveys/formQuestion.models");
const FormRespond = require('../../../models/operations/surveys/formRespond.models')
const db = require('../../../utils/database');

class FormService {
    static async getAll() {
        try {
            const result = await Form.findAll({
                where: { active: true },
                attributes: ['id', 'name', 'active', 'positions', 'createdAt'],
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
                attributes: ['id', 'name', 'active', 'positions', 'createdAt'],
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

    static async createForm(info) {
        const { preguntas = [], data } = info;
        const transaction = await db.transaction();
        try {
            const result = await Form.create(data, { transaction });

            if (!result) {
                throw new Error('No se pudo crear formulario');
            }

            const questions = preguntas.map(pregunta => {
                const opciones = Array.isArray(pregunta.options)
                    ? pregunta.options
                    : [];

                return {
                    ...pregunta,
                    formId: result.id,
                    opciones
                };
            });

            await FormQuestion.bulkCreate(questions, { transaction });

            await transaction.commit();
            return result;
        } catch (error) {
            await transaction.rollback();
            throw new Error(error.message);
        }
    }

    static async updateForm(info) {
        const { preguntas = [], data, formId } = info;
        const transaction = await db.transaction();

        try {
            await Form.update(
                data,
                {
                    where: { id: formId },
                    transaction,
                }
            );

            if (preguntas && Array.isArray(preguntas)) {
                await Promise.all(
                    preguntas.map(async (pregunta) => {
                        const opciones = Array.isArray(pregunta.options)
                            ? pregunta.options
                            : [];

                        const payload = {
                            title: pregunta.title,
                            type: pregunta.type,
                            required: pregunta.required,
                            opciones,
                            formId: formId,
                        };

                        if (!pregunta.id) {
                            console.log('estoy aqwui')
                            return FormQuestion.create(payload, { transaction });
                        }

                        return FormQuestion.update(
                            payload,
                            {
                                where: { id: pregunta.id },
                                transaction,
                            }
                        );
                    })
                );
            }

            await transaction.commit();
            return true;
        } catch (error) {
            await transaction.rollback();
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

    static async deleteQuestionForm(questionId) {
        try {
            const result = await FormQuestion.destroy({
                where: { id: questionId }
            })
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async createFormRespond(data) {
        const {
            yachtId = null,
            formId,
            evaluator = [],
            evaluated = [],
            expirationDate
        } = data;

        if (!formId || !evaluator.length || !evaluated.length) {
            throw new Error('Datos incompletos para enviar evaluacion ');
        }

        const payload = [];

        for (const evaluatedId of evaluated) {
            for (const evaluatorId of evaluator) {
                payload.push({
                    yachtId,
                    formId,
                    state: 'Pendiente',
                    evaluatorId,
                    evaluatedId,
                    expirationDate
                });
            }
        }

        return await FormRespond.bulkCreate(payload);
    }
}

module.exports = FormService;