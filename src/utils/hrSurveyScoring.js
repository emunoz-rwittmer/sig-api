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

function validateSurveyForPublish({ startsAt, endsAt, departamentIds, questions }) {
    if (!startsAt || !endsAt) {
        return 'La encuesta debe tener fecha de inicio y de fin';
    }
    if (!isValidDay(startsAt) || !isValidDay(endsAt)) {
        return 'Fecha inválida';
    }
    if (toDay(startsAt) > toDay(endsAt)) {
        return 'La fecha de inicio no puede ser posterior a la fecha de fin';
    }
    if (!Array.isArray(departamentIds) || departamentIds.length === 0) {
        return 'La encuesta debe estar dirigida al menos a un departamento';
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
    isValidDay,
};
