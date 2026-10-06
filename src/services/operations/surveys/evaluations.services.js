const Form = require('../../../models/operations/surveys/form.models');
const FormQuestion = require("../../../models/operations/surveys/formQuestion.models");
const FormRespond = require('../../../models/operations/surveys/formRespond.models')
const FormAnswers = require('../../../models/operations/surveys/formAnswers.models');
const Yacht = require('../../../models/catalogs/yacht.models');
const Staff = require('../../../models/catalogs/staff.models');
const Departaments = require('../../../models/catalogs/departament.models');
const Positions = require('../../../models/catalogs/positions.models');
const { Op, where } = require('sequelize');
const Company = require('../../../models/catalogs/company.models');
const db = require('../../../utils/database');
const AppError = require('../../../errors/AppError');

class EvaluationService {
    static async getEvaluationsByUser(evaluator) {
        try {
            const result = await FormRespond.findAll({
                where: { evaluator, state: 'Pendiente' },
                include: [{
                    model: Form,
                    as: "formulario",
                    attributes: ['id', 'name', 'positions', 'type', 'isAdministrative'],
                    // Solo ids: el portal necesita el total de criterios para mostrar el avance del borrador.
                    include: [{ model: FormQuestion, as: 'preguntas', attributes: ['id'] }],
                }, {
                    model: Company,
                    as: "empresa",
                    attributes: ['id', 'name'],
                    include: [{
                        model: Yacht,
                        as: 'yacht',
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
            const result = await FormRespond.findOne({
                where: { id },
                include: [{
                    model: Form,
                    as: "formulario",
                    include: [{
                        model: FormQuestion,
                        as: "preguntas",
                    }]
                }]
            });
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async saveDraft(evaluationId, { answers, comment }) {
        const evaluation = await FormRespond.findOne({ where: { id: evaluationId } });
        if (!evaluation) {
            throw new AppError('Evaluación no encontrada', 404);
        }
        if (evaluation.state !== 'Pendiente') {
            throw new AppError('Solo se puede guardar el borrador de una evaluación pendiente', 400);
        }

        await evaluation.update({ draft: { answers: answers ?? {}, comment: comment ?? '' } });
        return evaluation;
    }

    static async respondEvaluation(evaluationId, answers, comment) {
        const evaluation = await FormRespond.findOne({ where: { id: evaluationId } });
        if (!evaluation) {
            throw new AppError('Evaluación no encontrada', 404);
        }
        if (evaluation.state !== 'Pendiente') {
            throw new AppError('La evaluación ya fue respondida o caducó', 400);
        }

        const t = await db.transaction();
        try {
            const answersToCreate = Object.entries(answers).map(([numeroPregunta, answer]) => ({
                respuestaId: evaluationId,
                questionId: parseInt(numeroPregunta),
                answer
            }));

            const result = await FormAnswers.bulkCreate(answersToCreate, { transaction: t });

            if (result) {
                await FormRespond.update(
                    { state: 'Completada', comment: comment || null, draft: null },
                    { where: { id: evaluationId }, transaction: t }
                );
            }
            await t.commit();
            return result;
        } catch (error) {
            await t.rollback();
            throw error;
        }
    }

    static async updateEvaluation(id) {
        try {
            const result = await FormRespond.update(
                { state: 'Caducada' },
                { where: { id, state: 'Pendiente' } });
            return result
        } catch (error) {
            throw error;
        }
    }

    //REPORTING EVALUATIONS

    // Marca como Caducada, en una sola consulta, toda evaluación pendiente vencida.
    static async expirePendingEvaluations(companyId) {
        const where = { state: 'Pendiente', expirationDate: { [Op.lt]: new Date() } };
        if (companyId) where.companyId = companyId;
        return FormRespond.update({ state: 'Caducada' }, { where });
    }

    static async getEvaluationsByCompany(companyId, startDate, endDate, options = {}) {
        const { year, estado, tipo, summary } = options;  
        try {

            const where = {};

            if (companyId && companyId !== "undefined" && companyId !== "null") {
                where.companyId = companyId;
            }

            if ((startDate && (startDate !== "undefined" && startDate !== 'null')) && (endDate && (endDate !== "undefined" && endDate !== 'null'))) {
                where.createdAt = {
                    [Op.between]: [new Date(startDate), new Date(endDate)]
                };
            } else if (year) {
                where.createdAt = {
                    [Op.between]: [new Date(year, 0, 1), new Date(year, 11, 31, 23, 59, 59, 999)]
                };
            }

            if (estado) where.state = estado;

            const formWhere = {};
            if (tipo) {
                // Formularios antiguos sin `type`: se deduce de isAdministrative (igual que el front).
                formWhere[Op.or] = tipo === 'Administrativa'
                    ? [{ type: tipo }, { type: null, isAdministrative: true }]
                    : tipo === 'Liderazgo'
                        ? [{ type: tipo }, { type: null, isAdministrative: false }]
                        : [{ type: tipo }];
            }

            const result = await FormRespond.findAll({
                where: where,
                include: [
                    {
                        model: Company,
                        as: "empresa",
                        attributes: ['id', 'name'],
                        include: [{
                            model: Yacht,
                            as: "yacht",
                            attributes: ['id', 'name'],
                        }]
                    },
                    {
                        model: Form,
                        as: "formulario",
                        attributes: ['id', 'name', 'positions', 'isAdministrative', 'type', 'active'],
                        where: tipo ? formWhere : undefined,
                        required: !!tipo,
                    },
                    ...(summary ? [] : [{
                        model: FormAnswers,
                        as: 'respuestas',
                        attributes: ['id', 'answer'],
                        include: [{
                            model: FormQuestion,
                            as: 'pregunta',
                            attributes: ['id', 'title', 'questionId'],
                        }]
                    }]),
                ],

                order: [
                    ['createdAt', 'DESC'],
                    ...(summary ? [] : [[
                        { model: FormAnswers, as: 'respuestas' },
                        { model: FormQuestion, as: 'pregunta' },
                        'id',
                        'ASC'
                    ]])
                ],

                distinct: true
            });
            return result;
        } catch (error) {
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