const { Op } = require('sequelize');
const db = require('../../utils/database');
const Staff = require('../../models/catalogs/staff.models');
const HrSurvey = require('../../models/rrhh/hrSurvey.models');
const HrSurveyPosition = require('../../models/rrhh/hrSurveyPosition.models');
const HrSurveyQuestion = require('../../models/rrhh/hrSurveyQuestion.models');
const HrSurveyOption = require('../../models/rrhh/hrSurveyOption.models');
const HrSurveyParticipation = require('../../models/rrhh/hrSurveyParticipation.models');
const HrSurveyResponse = require('../../models/rrhh/hrSurveyResponse.models');
const HrSurveyAnswer = require('../../models/rrhh/hrSurveyAnswer.models');
const { resolveSurveyStatus, scoreAnswer } = require('../../utils/hrSurveyScoring');
const AppError = require('../../errors/AppError');

const ALREADY_ANSWERED = 'Ya respondiste esta encuesta';
const NOT_FOUND = 'Encuesta no encontrada';

const statusOf = (survey) => resolveSurveyStatus({
    active: survey.active,
    startsAt: survey.startsAt,
    endsAt: survey.endsAt,
});

const isBlank = (value) => value === undefined || value === null || String(value).trim() === '';
const isUnanswered = (answer) => isBlank(answer.optionId) && isBlank(answer.value) && isBlank(answer.text);

async function findStaff(staffId) {
    const staff = await Staff.findByPk(staffId, { attributes: ['id', 'departamentId', 'positionId', 'active'] });
    if (!staff) throw new AppError('Usuario no encontrado', 404);
    return staff;
}

async function hasParticipation(surveyId, staffId, transaction) {
    return Boolean(await HrSurveyParticipation.count({ where: { surveyId, staffId }, transaction }));
}

async function isAssigned(surveyId, positionId) {
    if (!positionId) return false;
    return Boolean(await HrSurveyPosition.count({ where: { surveyId, positionId } }));
}

/**
 * Una encuesta es visible para el colaborador si está publicada y asignada
 * a su cargo actual, o si ya participó en ella (aunque luego haya cambiado
 * de cargo).
 */
async function findVisibleSurvey(staff, surveyId) {
    const survey = await HrSurvey.findByPk(surveyId, {
        include: [{ model: HrSurveyQuestion, as: 'questions', include: [{ model: HrSurveyOption, as: 'options' }] }],
        order: [
            [{ model: HrSurveyQuestion, as: 'questions' }, 'sortOrder', 'ASC'],
            [{ model: HrSurveyQuestion, as: 'questions' }, { model: HrSurveyOption, as: 'options' }, 'sortOrder', 'ASC'],
        ],
    });
    if (!survey?.active) throw new AppError(NOT_FOUND, 404);

    const [answered, assigned] = await Promise.all([
        hasParticipation(surveyId, staff.id),
        isAssigned(surveyId, staff.positionId),
    ]);
    if (!answered && !assigned) throw new AppError(NOT_FOUND, 404);

    return { survey, answered, assigned };
}

/**
 * Valida cada respuesta contra las preguntas de la encuesta y devuelve las
 * filas a guardar. El score sale siempre de la BD (scoreAnswer).
 */
function buildAnswerRows(questions, answers) {
    const byId = new Map(questions.map((question) => [question.id, question]));
    const seen = new Set();
    const rows = [];

    for (const answer of answers) {
        const question = byId.get(answer.questionId);
        if (!question) throw new AppError('La respuesta corresponde a una pregunta que no pertenece a la encuesta', 400);
        if (seen.has(question.id)) throw new AppError('Cada pregunta se responde una sola vez', 400);
        seen.add(question.id);

        if (isUnanswered(answer)) continue;
        const scored = scoreAnswer(question, answer);
        // Un texto opcional en blanco simplemente no se guarda.
        if (scored.optionId === null && scored.score === null && scored.text === null) continue;
        rows.push({ questionId: question.id, ...scored });
    }

    const answeredIds = new Set(rows.map((row) => row.questionId));
    const missing = questions.find((question) => question.required && !answeredIds.has(question.id));
    if (missing) throw new AppError('Debes responder todas las preguntas obligatorias', 400);

    return rows;
}

class HrSurveyResponseService {
    static async listMine(staffId) {
        const staff = await findStaff(staffId);
        const [assignments, participations] = await Promise.all([
            staff.positionId
                ? HrSurveyPosition.findAll({ where: { positionId: staff.positionId }, attributes: ['surveyId'] })
                : [],
            HrSurveyParticipation.findAll({ where: { staffId }, attributes: ['surveyId'] }),
        ]);

        const answeredIds = new Set(participations.map((entry) => entry.surveyId));
        const surveyIds = [...new Set([...assignments.map((entry) => entry.surveyId), ...answeredIds])];
        if (!surveyIds.length) return [];

        const surveys = await HrSurvey.findAll({
            where: { id: { [Op.in]: surveyIds }, active: true },
            order: [['startsAt', 'DESC'], ['id', 'DESC']],
        });

        return surveys.map((survey) => ({
            id: survey.id,
            name: survey.name,
            description: survey.description,
            startsAt: survey.startsAt,
            endsAt: survey.endsAt,
            status: statusOf(survey),
            answered: answeredIds.has(survey.id),
        }));
    }

    static async getMineDetail(staffId, surveyId) {
        const staff = await findStaff(staffId);
        const { survey, answered } = await findVisibleSurvey(staff, surveyId);

        return {
            id: survey.id,
            name: survey.name,
            description: survey.description,
            startsAt: survey.startsAt,
            endsAt: survey.endsAt,
            status: statusOf(survey),
            answered,
            questions: survey.questions.map((question) => ({
                id: question.id,
                statement: question.statement,
                type: question.type,
                required: question.required,
                scaleMin: question.scaleMin,
                scaleMax: question.scaleMax,
                // Sin score: el colaborador no ve el puntaje de las opciones.
                options: (question.options ?? []).map((option) => ({ id: option.id, text: option.text })),
            })),
        };
    }

    static async submit(staffId, surveyId, answers) {
        const staff = await findStaff(staffId);
        const { survey, answered, assigned } = await findVisibleSurvey(staff, surveyId);

        if (!staff.active) throw new AppError('Tu usuario no está activo', 403);
        if (statusOf(survey) !== 'open') throw new AppError('La encuesta no está abierta', 400);
        if (answered) throw new AppError(ALREADY_ANSWERED, 409);
        if (!assigned) throw new AppError('Esta encuesta no está asignada a tu cargo', 403);
        // Los resultados se tabulan por departamento: sin él, la respuesta no tendría dónde contarse.
        if (!staff.departamentId) throw new AppError('Tu usuario no tiene un departamento asignado', 403);

        const rows = buildAnswerRows(survey.questions, answers);
        const departamentId = staff.departamentId;

        try {
            await db.transaction(async (transaction) => {
                // La participación va primero: la unicidad (survey_id, staff_id)
                // hace fallar de inmediato un envío concurrente duplicado.
                await HrSurveyParticipation.create({ surveyId, staffId, departamentId }, { transaction });
                const response = await HrSurveyResponse.create({ surveyId, departamentId }, { transaction });
                if (rows.length) {
                    await HrSurveyAnswer.bulkCreate(
                        rows.map((row) => ({ ...row, responseId: response.id })),
                        { transaction },
                    );
                }
            });
        } catch (error) {
            if (error?.name === 'SequelizeUniqueConstraintError') throw new AppError(ALREADY_ANSWERED, 409);
            throw error;
        }

        return { ok: true };
    }
}

module.exports = HrSurveyResponseService;
