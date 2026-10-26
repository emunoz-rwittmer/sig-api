const dayjs = require('dayjs');
const { Op, fn, col, literal } = require('sequelize');
const db = require('../../utils/database');
const Staff = require('../../models/catalogs/staff.models');
const Departaments = require('../../models/catalogs/departament.models');
const StaffCompany = require('../../models/catalogs/staffCompany.models');
const Company = require('../../models/catalogs/company.models');
const Yacht = require('../../models/catalogs/yacht.models');
const Positions = require('../../models/catalogs/positions.models');
const HrSurvey = require('../../models/rrhh/hrSurvey.models');
const HrSurveyPosition = require('../../models/rrhh/hrSurveyPosition.models');
const HrSurveyQuestion = require('../../models/rrhh/hrSurveyQuestion.models');
const HrSurveyOption = require('../../models/rrhh/hrSurveyOption.models');
const HrSurveyParticipation = require('../../models/rrhh/hrSurveyParticipation.models');
const HrSurveyResponse = require('../../models/rrhh/hrSurveyResponse.models');
const HrSurveyAnswer = require('../../models/rrhh/hrSurveyAnswer.models');
const { validateSurveyForPublish, resolveSurveyStatus, computeResults, computeReport, isValidDay } = require('../../utils/hrSurveyScoring');
const AppError = require('../../errors/AppError');

const DATE_FORMAT = 'YYYY-MM-DD';
const DRAFT_NAME = 'Encuesta sin título';
const LOCKED_MESSAGE = 'La encuesta ya tiene respuestas: solo puedes cambiar nombre, descripción, fecha de cierre o agregar cargos';

const POSITIONS_INCLUDE = {
    model: HrSurveyPosition,
    as: 'positions',
    include: [{
        model: Positions,
        as: 'position',
        attributes: ['id', 'name', 'departamentId'],
        include: [{ model: Departaments, as: 'departament', attributes: ['id', 'name'] }],
    }],
};

const FULL_INCLUDE = [
    POSITIONS_INCLUDE,
    { model: HrSurveyQuestion, as: 'questions', include: [{ model: HrSurveyOption, as: 'options' }] },
];

const toDay = (value) => dayjs(value).format(DATE_FORMAT);
const draftName = (name) => String(name ?? '').trim() || DRAFT_NAME;
const sortByOrder = (list) => [...(list ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
const nullableText = (value) => String(value ?? '').trim() || null;
const nullableNumber = (value) => (value === undefined || value === null || value === '' ? null : Number(value));

// Forma comparable de una pregunta, igual para lo guardado y para el payload.
const normalizeQuestion = (question) => ({
    statement: String(question.statement ?? ''),
    type: question.type ?? null,
    required: question.required === undefined ? true : Boolean(question.required),
    scaleMin: nullableNumber(question.scaleMin),
    scaleMax: nullableNumber(question.scaleMax),
    category: nullableText(question.category),
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

// `checkExpired`: solo al publicar (transición a activa), nunca al editar una ya publicada.
function assertPublishable({ startsAt, endsAt, positionIds, questions }, { checkExpired = false } = {}) {
    const validationError = validateSurveyForPublish({ startsAt, endsAt, positionIds, questions });
    if (validationError) throw new AppError(validationError, 400);
    if (checkExpired && toDay(endsAt) < dayjs().format(DATE_FORMAT)) {
        throw new AppError('La fecha de cierre ya pasó', 400);
    }
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
            category: nullableText(input.category),
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

const createPositions = (surveyId, positionIds, transaction) => HrSurveyPosition.bulkCreate(
    [...new Set(positionIds)].map((positionId) => ({ surveyId, positionId })),
    { transaction },
);

const toPositionDto = (entry) => ({
    id: entry.positionId,
    name: entry.position?.name ?? null,
    departament: entry.position?.departament?.name ?? null,
});

/** Participaciones registradas = personas que respondieron. */
async function countResponses(surveyId) {
    return HrSurveyParticipation.count({ where: { surveyId } });
}

/**
 * Personal activo hoy en los cargos asignados que todavía no participó, agrupado
 * por su departamento (los resultados se tabulan por departamento).
 * Devuelve Map<departamentId, n>; el personal sin departamento no puede responder y no cuenta.
 */
async function countAssignedPending(surveyId, positionIds, field = 'departamentId') {
    const result = new Map();
    if (!positionIds.length) return result;

    const rows = await Staff.findAll({
        attributes: [field, [fn('COUNT', col('id')), 'total']],
        where: {
            active: true,
            positionId: positionIds,
            departamentId: { [Op.ne]: null },
            id: { [Op.notIn]: literal(`(SELECT staff_id FROM hr_survey_participations WHERE survey_id = ${Number(surveyId)})`) },
        },
        group: [field],
        raw: true,
    });
    rows.forEach((row) => result.set(row[field], Number(row.total)));
    return result;
}

const STAFF_TYPE_GROUPS = [
    { id: 'administrativo', name: 'Administrativo' },
    { id: 'operativo', name: 'Operativo' },
];
const OFFICE_GROUP = { id: 'office', name: 'Oficina' };

const includesCompany = (entry, companyId) => (entry.companyIds ?? []).includes(companyId);

// Invitados de la encuesta: quienes ya participaron y el personal activo pendiente de los cargos asignados.
async function loadMembers(surveyId, positionIds) {
    const [participations, pending] = await Promise.all([
        HrSurveyParticipation.findAll({
            where: { surveyId },
            attributes: ['departamentId', 'positionId', 'staffType', 'companyIds'],
            raw: true,
        }),
        positionIds.length ? Staff.findAll({
            attributes: ['departamentId', 'positionId', 'staffType'],
            where: {
                active: true,
                positionId: positionIds,
                departamentId: { [Op.ne]: null },
                id: { [Op.notIn]: literal(`(SELECT staff_id FROM hr_survey_participations WHERE survey_id = ${Number(surveyId)})`) },
            },
            include: [{ model: StaffCompany, as: 'companies', attributes: ['companyId'] }],
        }) : [],
    ]);
    return [
        ...participations.map((row) => ({ ...row, responded: true })),
        ...pending.map((staff) => ({
            departamentId: staff.departamentId,
            positionId: staff.positionId,
            staffType: staff.staffType,
            companyIds: staff.companies.map(({ companyId }) => companyId),
            responded: false,
        })),
    ];
}

// Reporte por departamento, cargo, tipo de personal, empresa y yate. `companyId` filtra toda la
// población a una empresa. Las respuestas anteriores a estos campos caen en "Sin clasificar".
async function buildReport({ survey, responses, departaments, companyId }) {
    const positionIds = survey.positions.map((entry) => entry.positionId);
    let members = await loadMembers(survey.id, positionIds);

    const positions = survey.positions.map(({ positionId, position }) => ({ id: positionId, name: position?.name ?? `Cargo ${positionId}` }));
    const extraPositionIds = [...new Set([...members.map((m) => m.positionId), ...responses.map((r) => r.positionId)])]
        .filter((positionId) => positionId != null && !positions.some(({ id }) => id === positionId));
    if (extraPositionIds.length) {
        const extra = await Positions.findAll({ where: { id: extraPositionIds }, attributes: ['id', 'name'] });
        extra.forEach(({ id, name }) => positions.push({ id, name }));
    }

    const companyIds = [...new Set([...members, ...responses].flatMap((entry) => entry.companyIds ?? []))];
    const companies = companyIds.length
        ? (await Company.findAll({ where: { id: companyIds }, attributes: ['id', 'name'], include: [{ model: Yacht, as: 'yacht', attributes: ['name'] }] }))
            .map((company) => ({ id: company.id, name: company.name, yachtName: company.yacht?.name ?? null }))
            .sort((a, b) => a.name.localeCompare(b.name))
        : [];
    const yachtCompanyIds = new Set(companies.filter(({ yachtName }) => yachtName).map(({ id }) => id));

    let scoped = responses;
    if (companyId) {
        members = members.filter((member) => includesCompany(member, companyId));
        scoped = responses.filter((response) => includesCompany(response, companyId));
    }

    const yachtKeys = (entry) => {
        const ids = entry.companyIds ?? [];
        const yachts = ids.filter((id) => yachtCompanyIds.has(id));
        if (yachts.length) return yachts;
        return ids.length ? [OFFICE_GROUP.id] : [];
    };

    const report = computeReport({
        questions: sortByOrder(survey.questions),
        members,
        responses: scoped,
        dimensions: [
            { key: 'company', groups: companies.map(({ id, name }) => ({ id, name })), keysOf: (entry) => entry.companyIds ?? [] },
            { key: 'departament', groups: departaments, keysOf: (entry) => [entry.departamentId] },
            { key: 'position', groups: positions, keysOf: (entry) => [entry.positionId] },
            { key: 'yacht', groups: [...companies.filter(({ yachtName }) => yachtName).map(({ id, yachtName }) => ({ id, name: yachtName })), OFFICE_GROUP], keysOf: yachtKeys },
            { key: 'staffType', groups: STAFF_TYPE_GROUPS, keysOf: (entry) => [entry.staffType] },
        ],
    });
    return { ...report, companies: companies.map(({ id, name }) => ({ id, name })) };
}

const withStatus = (survey) => resolveSurveyStatus({
    active: survey.active,
    startsAt: survey.startsAt,
    endsAt: survey.endsAt,
});

class HrSurveyService {
    static async getAll() {
        const surveys = await HrSurvey.findAll({
            include: [POSITIONS_INCLUDE],
            order: [['createdAt', 'DESC']],
        });

        return Promise.all(surveys.map(async (survey) => {
            const positionIds = survey.positions.map((entry) => entry.positionId);
            const [responded, pending] = await Promise.all([
                countResponses(survey.id),
                countAssignedPending(survey.id, positionIds),
            ]);
            const pendingTotal = [...pending.values()].reduce((sum, value) => sum + value, 0);
            return {
                id: survey.id,
                name: survey.name,
                startsAt: survey.startsAt,
                endsAt: survey.endsAt,
                active: survey.active,
                status: withStatus(survey),
                positions: survey.positions.map(toPositionDto),
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
    static async getResults(id, { companyId } = {}) {
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
                attributes: ['id', 'departamentId', 'positionId', 'staffType', 'companyIds'],
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
            positionId: response.positionId,
            staffType: response.staffType,
            companyIds: response.companyIds,
            answers: response.answers.map((answer) => ({
                questionId: answer.questionId,
                optionId: answer.optionId,
                score: answer.score,
                text: answer.text,
            })),
        }));

        // Se asigna por cargo pero se tabula por departamento: los de los cargos asignados,
        // los del personal pendiente y los que quedaron en los snapshots.
        const assignedPending = await countAssignedPending(id, survey.positions.map((entry) => entry.positionId));
        const departaments = [];
        const known = new Set();
        survey.positions.forEach(({ position }) => {
            const departament = position?.departament;
            if (!departament || known.has(departament.id)) return;
            known.add(departament.id);
            departaments.push({ id: departament.id, name: departament.name });
        });
        const orphanIds = [...new Set([
            ...assignedPending.keys(),
            ...participationCounts.keys(),
            ...responses.map((response) => response.departamentId),
        ])].filter((departamentId) => !known.has(departamentId));
        if (orphanIds.length) {
            const orphans = await Departaments.findAll({ where: { id: orphanIds }, attributes: ['id', 'name'] });
            orphans.forEach((departament) => departaments.push({ id: departament.id, name: departament.name }));
        }

        const results = computeResults({
            questions: sortByOrder(survey.questions),
            departaments,
            responses,
            participationCounts,
            assignedPending,
        });

        const report = await buildReport({ survey, responses, departaments, companyId });

        return { survey: { ...survey.toJSON(), status: withStatus(survey) }, ...results, report };
    }

    static async create(data) {
        const active = data.active === true;
        assertName(data.name);
        if (active) {
            assertPublishable({
                startsAt: data.startsAt,
                endsAt: data.endsAt,
                positionIds: data.positionIds,
                questions: data.questions,
            }, { checkExpired: true });
        }

        return db.transaction(async (transaction) => {
            const survey = await HrSurvey.create({
                name: draftName(data.name),
                description: data.description ?? null,
                startsAt: data.startsAt ?? null,
                endsAt: data.endsAt ?? null,
                active,
            }, { transaction });

            if (data.positionIds?.length) await createPositions(survey.id, data.positionIds, transaction);
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
            // undefined conserva la fecha; null la limpia (borrador sin fechas).
            startsAt: data.startsAt === undefined ? survey.startsAt : data.startsAt,
            endsAt: data.endsAt === undefined ? survey.endsAt : data.endsAt,
            positionIds: data.positionIds ?? survey.positions.map((entry) => entry.positionId),
            questions: data.questions ?? sortByOrder(survey.questions).map(toQuestionInput),
        };
        // Se valida el estado final: un `{ active: true }` suelto no publica un borrador incompleto.
        if (active) assertPublishable(next, { checkExpired: !survey.active });

        return db.transaction(async (transaction) => {
            await survey.update({
                name: data.name !== undefined ? draftName(data.name) : survey.name,
                description: data.description !== undefined ? data.description : survey.description,
                startsAt: next.startsAt,
                endsAt: next.endsAt,
                active,
            }, { transaction });

            if (data.positionIds) {
                await HrSurveyPosition.destroy({ where: { surveyId: id }, transaction });
                await createPositions(id, data.positionIds, transaction);
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

    // Con respuestas, solo se aceptan nombre, descripción, cierre y cargos nuevos.
    static async updateLocked(survey, data) {
        const reject = () => { throw new AppError(LOCKED_MESSAGE, 400); };

        if (data.startsAt !== undefined && (data.startsAt === null || toDay(data.startsAt) !== toDay(survey.startsAt))) reject();
        if (data.active !== undefined && Boolean(data.active) !== survey.active) reject();
        if (data.questions !== undefined && !sameQuestions(data.questions, survey.questions)) reject();

        const currentIds = survey.positions.map((entry) => entry.positionId);
        const requestedIds = data.positionIds !== undefined ? [...new Set(data.positionIds)] : currentIds;
        if (currentIds.some((positionId) => !requestedIds.includes(positionId))) reject();

        const endsAt = data.endsAt === undefined ? survey.endsAt : data.endsAt;
        if (!isValidDay(endsAt)) throw new AppError('Fecha inválida', 400);
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

            const newIds = requestedIds.filter((positionId) => !currentIds.includes(positionId));
            if (newIds.length) await createPositions(survey.id, newIds, transaction);
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
