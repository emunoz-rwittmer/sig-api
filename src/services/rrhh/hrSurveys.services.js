const dayjs = require('dayjs');
const { Op, fn, col, literal } = require('sequelize');
const db = require('../../utils/database');
const Staff = require('../../models/catalogs/staff.models');
const Departaments = require('../../models/catalogs/departament.models');
const HrSurvey = require('../../models/rrhh/hrSurvey.models');
const HrSurveyDepartament = require('../../models/rrhh/hrSurveyDepartament.models');
const HrSurveyQuestion = require('../../models/rrhh/hrSurveyQuestion.models');
const HrSurveyOption = require('../../models/rrhh/hrSurveyOption.models');
const HrSurveyParticipation = require('../../models/rrhh/hrSurveyParticipation.models');
const HrSurveyResponse = require('../../models/rrhh/hrSurveyResponse.models');
const HrSurveyAnswer = require('../../models/rrhh/hrSurveyAnswer.models');
const { validateSurveyForPublish, resolveSurveyStatus, computeResults } = require('../../utils/hrSurveyScoring');
const AppError = require('../../errors/AppError');

const DATE_FORMAT = 'YYYY-MM-DD';
const DRAFT_NAME = 'Encuesta sin título';
const LOCKED_MESSAGE = 'La encuesta ya tiene respuestas: solo puedes cambiar nombre, descripción, fecha de cierre o agregar departamentos';

const FULL_INCLUDE = [
    { model: HrSurveyDepartament, as: 'departaments', include: [{ model: Departaments, as: 'departament', attributes: ['id', 'name'] }] },
    { model: HrSurveyQuestion, as: 'questions', include: [{ model: HrSurveyOption, as: 'options' }] },
];

const toDay = (value) => dayjs(value).format(DATE_FORMAT);
const draftName = (name) => String(name ?? '').trim() || DRAFT_NAME;
const sortByOrder = (list) => [...(list ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
const nullableNumber = (value) => (value === undefined || value === null || value === '' ? null : Number(value));

// Forma comparable de una pregunta, igual para lo guardado y para el payload.
const normalizeQuestion = (question) => ({
    statement: String(question.statement ?? ''),
    type: question.type ?? null,
    required: question.required === undefined ? true : Boolean(question.required),
    scaleMin: nullableNumber(question.scaleMin),
    scaleMax: nullableNumber(question.scaleMax),
    options: (question.options ?? []).map((option) => ({
        text: String(option.text ?? ''),
        score: Number(option.score),
    })),
});

const toQuestionInput = (question) => normalizeQuestion({
    ...question.dataValues,
    options: sortByOrder(question.options),
});

const sameQuestions = (payloadQuestions, storedQuestions) => (
    JSON.stringify(payloadQuestions.map(normalizeQuestion))
    === JSON.stringify(sortByOrder(storedQuestions).map(toQuestionInput))
);

function assertPublishable({ startsAt, endsAt, departamentIds, questions }) {
    const validationError = validateSurveyForPublish({ startsAt, endsAt, departamentIds, questions });
    if (validationError) throw new AppError(validationError, 400);
}

function assertName(name) {
    if (!String(name ?? '').trim()) throw new AppError('La encuesta debe tener un nombre', 400);
}

async function createQuestions(surveyId, questions, transaction) {
    for (let index = 0; index < questions.length; index += 1) {
        const input = questions[index];
        // Un borrador puede guardarse incompleto: se rellenan los NOT NULL con valores neutros.
        const question = await HrSurveyQuestion.create({
            surveyId,
            statement: String(input.statement ?? ''),
            type: input.type ?? 'texto',
            required: input.required === undefined ? true : Boolean(input.required),
            scaleMin: nullableNumber(input.scaleMin),
            scaleMax: nullableNumber(input.scaleMax),
            sortOrder: index,
        }, { transaction });

        const options = input.options ?? [];
        if (options.length) {
            await HrSurveyOption.bulkCreate(
                options.map((option, optionIndex) => ({
                    questionId: question.id,
                    text: String(option.text ?? ''),
                    score: Number.isFinite(Number(option.score)) ? Number(option.score) : 0,
                    sortOrder: optionIndex,
                })),
                { transaction },
            );
        }
    }
}

const createDepartaments = (surveyId, departamentIds, transaction) => HrSurveyDepartament.bulkCreate(
    [...new Set(departamentIds)].map((departamentId) => ({ surveyId, departamentId })),
    { transaction },
);

/** Participaciones registradas = personas que respondieron. */
async function countResponses(surveyId) {
    return HrSurveyParticipation.count({ where: { surveyId } });
}

/**
 * Personal activo hoy en cada departamento que todavía no participó.
 * Devuelve Map<departamentId, n> (con 0 para los departamentos sin pendientes).
 */
async function countAssignedPending(surveyId, departamentIds) {
    const result = new Map(departamentIds.map((id) => [id, 0]));
    if (!departamentIds.length) return result;

    const rows = await Staff.findAll({
        attributes: ['departamentId', [fn('COUNT', col('id')), 'total']],
        where: {
            active: true,
            departamentId: departamentIds,
            id: { [Op.notIn]: literal(`(SELECT staff_id FROM hr_survey_participations WHERE survey_id = ${Number(surveyId)})`) },
        },
        group: ['departamentId'],
        raw: true,
    });
    rows.forEach((row) => result.set(row.departamentId, Number(row.total)));
    return result;
}

const withStatus = (survey) => resolveSurveyStatus({
    active: survey.active,
    startsAt: survey.startsAt,
    endsAt: survey.endsAt,
});

class HrSurveyService {
    static async getAll() {
        const surveys = await HrSurvey.findAll({
            include: [{ model: HrSurveyDepartament, as: 'departaments', include: [{ model: Departaments, as: 'departament', attributes: ['id', 'name'] }] }],
            order: [['createdAt', 'DESC']],
        });

        return Promise.all(surveys.map(async (survey) => {
            const departamentIds = survey.departaments.map((entry) => entry.departamentId);
            const [responded, pending] = await Promise.all([
                countResponses(survey.id),
                countAssignedPending(survey.id, departamentIds),
            ]);
            const pendingTotal = [...pending.values()].reduce((sum, value) => sum + value, 0);
            return {
                id: survey.id,
                name: survey.name,
                startsAt: survey.startsAt,
                endsAt: survey.endsAt,
                active: survey.active,
                status: withStatus(survey),
                departaments: survey.departaments.map((entry) => ({
                    id: entry.departamentId,
                    name: entry.departament?.name ?? null,
                })),
                responded,
                assigned: responded + pendingTotal,
            };
        }));
    }

    static async getById(id) {
        const survey = await HrSurvey.findByPk(id, {
            include: FULL_INCLUDE,
            order: [
                [{ model: HrSurveyQuestion, as: 'questions' }, 'sortOrder', 'ASC'],
                [{ model: HrSurveyQuestion, as: 'questions' }, { model: HrSurveyOption, as: 'options' }, 'sortOrder', 'ASC'],
            ],
        });
        if (!survey) throw new AppError('Encuesta no encontrada', 404);

        survey.dataValues.status = withStatus(survey);
        survey.dataValues.responded = await countResponses(id);
        return survey;
    }

    /**
     * Tabulación agregada. Los ids salen crudos (el controlador los codifica) y nunca
     * se devuelven ids de respuestas ni de personas.
     */
    static async getResults(id) {
        const survey = await HrSurvey.findByPk(id, {
            include: FULL_INCLUDE,
            order: [
                [{ model: HrSurveyQuestion, as: 'questions' }, 'sortOrder', 'ASC'],
                [{ model: HrSurveyQuestion, as: 'questions' }, { model: HrSurveyOption, as: 'options' }, 'sortOrder', 'ASC'],
            ],
        });
        if (!survey) throw new AppError('Encuesta no encontrada', 404);

        const [responseRows, participationRows] = await Promise.all([
            HrSurveyResponse.findAll({
                where: { surveyId: id },
                attributes: ['id', 'departamentId'],
                include: [{ model: HrSurveyAnswer, as: 'answers', attributes: ['questionId', 'optionId', 'score', 'text'] }],
            }),
            HrSurveyParticipation.findAll({
                where: { surveyId: id },
                attributes: ['departamentId', [fn('COUNT', col('id')), 'total']],
                group: ['departamentId'],
                raw: true,
            }),
        ]);

        const participationCounts = new Map(participationRows.map((row) => [row.departamentId, Number(row.total)]));
        const responses = responseRows.map((response) => ({
            departamentId: response.departamentId,
            answers: response.answers.map((answer) => ({
                questionId: answer.questionId,
                optionId: answer.optionId,
                score: answer.score,
                text: answer.text,
            })),
        }));

        // Departamentos asignados + los que quedaron en los snapshots aunque ya no estén asignados.
        const departaments = survey.departaments.map((entry) => ({
            id: entry.departamentId,
            name: entry.departament?.name ?? null,
        }));
        const known = new Set(departaments.map((departament) => departament.id));
        const orphanIds = [...new Set([
            ...participationCounts.keys(),
            ...responses.map((response) => response.departamentId),
        ])].filter((departamentId) => !known.has(departamentId));
        if (orphanIds.length) {
            const orphans = await Departaments.findAll({ where: { id: orphanIds }, attributes: ['id', 'name'] });
            orphans.forEach((departament) => departaments.push({ id: departament.id, name: departament.name }));
        }

        const assignedPending = await countAssignedPending(id, departaments.map((departament) => departament.id));
        const results = computeResults({
            questions: sortByOrder(survey.questions),
            departaments,
            responses,
            participationCounts,
            assignedPending,
        });

        return { survey: { ...survey.toJSON(), status: withStatus(survey) }, ...results };
    }

    static async create(data) {
        const active = data.active === true;
        assertName(data.name);
        if (active) {
            assertPublishable({
                startsAt: data.startsAt,
                endsAt: data.endsAt,
                departamentIds: data.departamentIds,
                questions: data.questions,
            });
        }

        return db.transaction(async (transaction) => {
            // Las fechas son NOT NULL: un borrador sin fechas toma hoy y se ajusta al publicar.
            const today = dayjs().format(DATE_FORMAT);
            const survey = await HrSurvey.create({
                name: draftName(data.name),
                description: data.description ?? null,
                startsAt: data.startsAt || today,
                endsAt: data.endsAt || data.startsAt || today,
                active,
            }, { transaction });

            if (data.departamentIds?.length) await createDepartaments(survey.id, data.departamentIds, transaction);
            await createQuestions(survey.id, data.questions ?? [], transaction);
            return survey;
        });
    }

    static async update(id, data) {
        const survey = await HrSurvey.findByPk(id, { include: FULL_INCLUDE });
        if (!survey) throw new AppError('Encuesta no encontrada', 404);

        const responded = await countResponses(id);
        if (responded > 0) return HrSurveyService.updateLocked(survey, data);

        if (data.name !== undefined) assertName(data.name);
        const active = data.active !== undefined ? data.active : survey.active;
        const next = {
            startsAt: data.startsAt ?? survey.startsAt,
            endsAt: data.endsAt ?? survey.endsAt,
            departamentIds: data.departamentIds ?? survey.departaments.map((entry) => entry.departamentId),
            questions: data.questions ?? sortByOrder(survey.questions).map(toQuestionInput),
        };
        // Se valida el estado final: un `{ active: true }` suelto no publica un borrador incompleto.
        if (active) assertPublishable(next);

        return db.transaction(async (transaction) => {
            await survey.update({
                name: data.name !== undefined ? draftName(data.name) : survey.name,
                description: data.description !== undefined ? data.description : survey.description,
                startsAt: next.startsAt,
                endsAt: next.endsAt,
                active,
            }, { transaction });

            if (data.departamentIds) {
                await HrSurveyDepartament.destroy({ where: { surveyId: id }, transaction });
                await createDepartaments(id, data.departamentIds, transaction);
            }

            if (data.questions) {
                // Reemplazo completo, como en inducciones: el formulario reenvía el set entero.
                const stored = await HrSurveyQuestion.findAll({ where: { surveyId: id }, transaction });
                await HrSurveyOption.destroy({ where: { questionId: stored.map((question) => question.id) }, transaction });
                await HrSurveyQuestion.destroy({ where: { surveyId: id }, transaction });
                await createQuestions(id, data.questions, transaction);
            }

            return survey;
        });
    }

    // Con respuestas, solo se aceptan nombre, descripción, cierre y departamentos nuevos.
    static async updateLocked(survey, data) {
        const reject = () => { throw new AppError(LOCKED_MESSAGE, 400); };

        if (data.startsAt !== undefined && toDay(data.startsAt) !== toDay(survey.startsAt)) reject();
        if (data.active !== undefined && Boolean(data.active) !== survey.active) reject();
        if (data.questions !== undefined && !sameQuestions(data.questions, survey.questions)) reject();

        const currentIds = survey.departaments.map((entry) => entry.departamentId);
        const requestedIds = data.departamentIds !== undefined ? [...new Set(data.departamentIds)] : currentIds;
        if (currentIds.some((departamentId) => !requestedIds.includes(departamentId))) reject();

        const endsAt = data.endsAt ?? survey.endsAt;
        if (toDay(endsAt) < toDay(survey.startsAt)) {
            throw new AppError('La fecha de fin no puede ser anterior a la de inicio', 400);
        }
        if (data.name !== undefined) assertName(data.name);

        return db.transaction(async (transaction) => {
            await survey.update({
                name: data.name !== undefined ? draftName(data.name) : survey.name,
                description: data.description !== undefined ? data.description : survey.description,
                endsAt,
            }, { transaction });

            const newIds = requestedIds.filter((departamentId) => !currentIds.includes(departamentId));
            if (newIds.length) await createDepartaments(survey.id, newIds, transaction);
            return survey;
        });
    }

    static async remove(id) {
        const survey = await HrSurvey.findByPk(id);
        if (!survey) throw new AppError('Encuesta no encontrada', 404);
        if (await countResponses(id) > 0) {
            throw new AppError('No se puede eliminar una encuesta que ya tiene respuestas', 400);
        }

        // destroy de instancia: dispara los hooks de cascada (preguntas, opciones, etc.).
        await db.transaction(async (transaction) => {
            await survey.destroy({ transaction });
        });
        return 1;
    }
}

HrSurveyService.countResponses = countResponses;
HrSurveyService.countAssignedPending = countAssignedPending;

module.exports = HrSurveyService;
module.exports.countResponses = countResponses;
module.exports.countAssignedPending = countAssignedPending;
