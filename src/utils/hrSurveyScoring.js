const dayjs = require('dayjs');
const AppError = require('../errors/AppError');

const QUESTION_TYPES = ['opcion multiple', 'lista', 'scale', 'texto', 'texto largo'];
const OPTION_TYPES = ['opcion multiple', 'lista'];
const SCORED_TYPES = [...OPTION_TYPES, 'scale'];
const TEXT_TYPES = ['texto', 'texto largo'];
const MIN_OPTIONS = 2;
const MAX_OPTIONS = 10;
const SCALE_LIMIT = 10;

const DATE_FORMAT = 'YYYY-MM-DD';

const round2 = (value) => Math.round(value * 100) / 100;

const MAX_SCORE = 9999.99;

const isNumeric = (value) => {
    if (typeof value === 'number') return Number.isFinite(value);
    if (typeof value === 'string' && value.trim() !== '') return Number.isFinite(Number(value));
    return false;
};

const toDay = (value) => dayjs(value).format(DATE_FORMAT);

/** Fecha válida YYYY-MM-DD (o Date): evita que "Invalid Date" pase las comparaciones de strings. */
const isValidDay = (value) => {
    if (value === null || value === undefined || value === '') return false;
    if (typeof value === 'string') {
        const day = value.slice(0, 10);
        return /^\d{4}-\d{2}-\d{2}$/.test(day) && toDay(day) === day;
    }
    return dayjs(value).isValid();
};

const average = (scores) => {
    if (scores.length === 0) return null;
    return round2(scores.reduce((sum, score) => sum + score, 0) / scores.length);
};

function validateQuestion(question) {
    if (!question || !question.statement || !String(question.statement).trim()) {
        return 'Cada pregunta debe tener un enunciado';
    }
    if (!QUESTION_TYPES.includes(question.type)) {
        return 'El tipo de pregunta no es válido';
    }

    if (OPTION_TYPES.includes(question.type)) {
        const options = question.options;
        if (!Array.isArray(options) || options.length < MIN_OPTIONS || options.length > MAX_OPTIONS) {
            return `Cada pregunta de selección debe tener entre ${MIN_OPTIONS} y ${MAX_OPTIONS} opciones`;
        }
        if (options.some((option) => !option?.text || !String(option.text).trim())) {
            return 'Cada opción debe tener texto';
        }
        if (options.some((option) => !isNumeric(option.score))) {
            return 'Cada opción debe tener un puntaje numérico';
        }
        if (options.some((option) => Math.abs(Number(option.score)) > MAX_SCORE)) {
            return `El puntaje de cada opción debe estar entre -${MAX_SCORE} y ${MAX_SCORE}`;
        }
    }

    if (question.type === 'scale') {
        const { scaleMin, scaleMax } = question;
        if (!isNumeric(scaleMin) || !isNumeric(scaleMax)) {
            return 'La escala debe tener un mínimo y un máximo';
        }
        const min = Number(scaleMin);
        const max = Number(scaleMax);
        if (!Number.isInteger(min) || !Number.isInteger(max) || min < 0 || min >= max || max > SCALE_LIMIT) {
            return `La escala debe cumplir 0 <= mínimo < máximo <= ${SCALE_LIMIT}`;
        }
    }

    return null;
}

function validateSurveyForPublish({ startsAt, endsAt, positionIds, questions }) {
    if (!startsAt || !endsAt) {
        return 'La encuesta debe tener fecha de inicio y de fin';
    }
    if (!isValidDay(startsAt) || !isValidDay(endsAt)) {
        return 'Fecha inválida';
    }
    if (toDay(startsAt) > toDay(endsAt)) {
        return 'La fecha de inicio no puede ser posterior a la fecha de fin';
    }
    if (!Array.isArray(positionIds) || positionIds.length === 0) {
        return 'La encuesta debe estar dirigida al menos a un cargo';
    }
    if (!Array.isArray(questions) || questions.length === 0) {
        return 'La encuesta debe tener al menos una pregunta';
    }
    for (const question of questions) {
        const error = validateQuestion(question);
        if (error) return error;
    }
    return null;
}

/**
 * Estado derivado. Las fechas son inclusivas y se comparan como strings
 * YYYY-MM-DD para evitar desfases por la hora del día.
 */
function resolveSurveyStatus({ active, startsAt, endsAt }, today = dayjs()) {
    if (!active || !startsAt || !endsAt) return 'draft';
    const now = toDay(today);
    if (now < toDay(startsAt)) return 'scheduled';
    if (now > toDay(endsAt)) return 'closed';
    return 'open';
}

/**
 * Valida y normaliza UNA respuesta. El score siempre sale de la pregunta
 * (opción de BD o valor de escala), nunca de lo que envíe el cliente.
 * No verifica obligatoriedad: eso lo hace el servicio de envío.
 */
function scoreAnswer(question, answer) {
    const { type } = question;

    if (OPTION_TYPES.includes(type)) {
        const option = (question.options ?? []).find(
            (candidate) => answer?.optionId != null && String(candidate.id) === String(answer.optionId),
        );
        if (!option) {
            throw new AppError('La opción seleccionada no es válida para la pregunta', 400);
        }
        return { optionId: option.id, score: Number(option.score), text: null };
    }

    if (type === 'scale') {
        const value = answer?.value;
        const min = Number(question.scaleMin);
        const max = Number(question.scaleMax);
        if (!isNumeric(value) || !Number.isInteger(Number(value)) || Number(value) < min || Number(value) > max) {
            throw new AppError(`El valor debe ser un número entero entre ${min} y ${max}`, 400);
        }
        return { optionId: null, score: Number(value), text: null };
    }

    if (TEXT_TYPES.includes(type)) {
        const raw = answer?.text;
        if (raw != null && typeof raw !== 'string') {
            throw new AppError('El texto de la respuesta no es válido', 400);
        }
        const text = raw ? raw.trim() : '';
        return { optionId: null, score: null, text: text || null };
    }

    throw new AppError('El tipo de pregunta no es válido', 400);
}

function computeResults({ questions, departaments, responses, participationCounts, assignedPending }) {
    const participation = departaments.map(({ id, name }) => {
        const responded = participationCounts?.get(id) ?? 0;
        return {
            departamentId: id,
            name,
            responded,
            assigned: responded + (assignedPending?.get(id) ?? 0),
        };
    });

    const resultQuestions = questions.map((question) => {
        const entries = [];
        for (const response of responses) {
            for (const answer of response.answers) {
                if (String(answer.questionId) === String(question.id)) {
                    entries.push({ departamentId: response.departamentId, answer });
                }
            }
        }

        const scoredEntries = entries
            .filter(({ answer }) => answer.score != null)
            .map(({ departamentId, answer }) => ({ departamentId, score: Number(answer.score) }));

        const byDepartament = {};
        for (const { id } of departaments) {
            byDepartament[id] = average(
                scoredEntries.filter((entry) => entry.departamentId === id).map((entry) => entry.score),
            );
        }

        const result = {
            questionId: question.id,
            statement: question.statement,
            type: question.type,
            category: question.category ?? null,
            overall: average(scoredEntries.map((entry) => entry.score)),
            byDepartament,
        };

        if (OPTION_TYPES.includes(question.type)) {
            result.distribution = (question.options ?? []).map((option) => ({
                optionId: option.id,
                text: option.text,
                count: entries.filter(({ answer }) => String(answer.optionId) === String(option.id)).length,
            }));
        }

        if (TEXT_TYPES.includes(question.type)) {
            result.comments = entries
                .filter(({ answer }) => answer.text && String(answer.text).trim())
                .map(({ departamentId, answer }) => ({ departamentId, text: String(answer.text).trim() }));
        }

        return result;
    });

    return { participation, questions: resultQuestions };
}

// Grupos con menos respuestas que esto no muestran promedios (protege el anonimato).
const MIN_GROUP_RESPONSES = 3;
const UNCLASSIFIED = 'none';

// Puntaje de una respuesta llevado a la escala 1-5 del reporte (escala 1-5 queda igual).
// Escala: usa su rango; opciones: el menor y mayor puntaje de sus opciones.
function normalizeScore(question, score) {
    if (score == null) return null;
    let min;
    let max;
    if (question.type === 'scale') {
        min = Number(question.scaleMin);
        max = Number(question.scaleMax);
    } else {
        const scores = (question.options ?? []).map((option) => Number(option.score));
        min = Math.min(...scores);
        max = Math.max(...scores);
    }
    if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return null;
    return 1 + ((Number(score) - min) / (max - min)) * 4;
}

const bucket = (value) => Math.min(5, Math.max(1, Math.round(value)));
const distOf = (values) => values.reduce((dist, value) => { dist[bucket(value) - 1] += 1; return dist; }, [0, 0, 0, 0, 0]);

/**
 * Reporte de resultados. `members` son los invitados (quienes ya participaron y los
 * pendientes) y `responses` las respuestas anónimas; ambos traen sus atributos de puesto.
 * Cada dimensión define `keysOf(entry)` -> ids de grupo (varios si el colaborador tiene
 * varias empresas) y sus `groups`. Lo que no cae en ningún grupo va a "Sin clasificar".
 * Los grupos con menos de MIN_GROUP_RESPONSES respuestas salen enmascarados (promedios null).
 */
function computeReport({ questions, dimensions, members, responses }) {
    const rows = responses.map((response) => ({
        ...response,
        scored: questions.flatMap((question) => response.answers
            .filter((answer) => String(answer.questionId) === String(question.id))
            .map((answer) => ({ question, value: normalizeScore(question, answer.score) }))
            .filter(({ value }) => value != null)),
    }));

    const pool = (entries) => entries.flatMap(({ scored }) => scored);
    const questionValues = (entries, question) => pool(entries)
        .filter((item) => String(item.question.id) === String(question.id)).map(({ value }) => value);

    const allValues = pool(rows).map(({ value }) => value);
    const overallMasked = rows.length < MIN_GROUP_RESPONSES;
    const overall = {
        invited: members.length,
        responded: members.filter((member) => member.responded).length,
        responses: rows.length,
        masked: overallMasked,
        average: overallMasked ? null : average(allValues),
        dist: overallMasked ? [0, 0, 0, 0, 0] : distOf(allValues),
    };

    const questionRows = questions.map((question) => {
        const values = overallMasked ? [] : questionValues(rows, question);
        return {
            questionId: question.id,
            average: average(values),
            count: values.length,
            dist: distOf(values),
        };
    });

    const categoryNames = [...new Set(questions.map((question) => question.category).filter(Boolean))];
    const categories = categoryNames.map((name) => {
        const inCategory = questions.filter((question) => question.category === name);
        const values = overallMasked ? [] : pool(rows)
            .filter((item) => item.question.category === name).map(({ value }) => value);
        return { name, questions: inCategory.length, average: average(values) };
    }).sort((a, b) => (b.average ?? 0) - (a.average ?? 0));

    const result = {};
    for (const { key, groups, keysOf } of dimensions) {
        const known = new Set(groups.map(({ id }) => id));
        const groupIdsOf = (entry) => {
            const ids = (keysOf(entry) ?? []).filter((id) => known.has(id));
            return ids.length ? ids : [UNCLASSIFIED];
        };
        const memberIn = (id) => members.filter((member) => groupIdsOf(member).includes(id));
        const rowsIn = (id) => rows.filter((row) => groupIdsOf(row).includes(id));

        const all = [...groups];
        if (members.some((m) => groupIdsOf(m)[0] === UNCLASSIFIED) || rows.some((r) => groupIdsOf(r)[0] === UNCLASSIFIED)) {
            all.push({ id: UNCLASSIFIED, name: 'Sin clasificar' });
        }

        const groupRows = all.map(({ id, name }) => {
            const inGroup = rowsIn(id);
            const invited = memberIn(id);
            const masked = inGroup.length < MIN_GROUP_RESPONSES;
            return {
                id,
                name,
                invited: invited.length,
                responded: invited.filter((member) => member.responded).length,
                responses: inGroup.length,
                masked,
                average: masked ? null : average(pool(inGroup).map(({ value }) => value)),
            };
        }).sort((a, b) => (b.average ?? -1) - (a.average ?? -1) || a.name.localeCompare(b.name));

        const byQuestion = {};
        for (const question of questions) {
            byQuestion[question.id] = {};
            for (const { id, masked } of groupRows) {
                byQuestion[question.id][id] = masked ? null : average(questionValues(rowsIn(id), question));
            }
        }
        result[key] = { groups: groupRows, byQuestion };
    }

    return { overall, questions: questionRows, categories, dimensions: result };
}

module.exports = {
    QUESTION_TYPES,
    OPTION_TYPES,
    SCORED_TYPES,
    MIN_OPTIONS,
    MAX_OPTIONS,
    validateSurveyForPublish,
    validateQuestion,
    resolveSurveyStatus,
    scoreAnswer,
    computeResults,
    computeReport,
    MIN_GROUP_RESPONSES,
    UNCLASSIFIED,
    isValidDay,
};
