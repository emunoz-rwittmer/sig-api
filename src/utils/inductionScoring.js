const MIN_OPTIONS = 2;
const MAX_OPTIONS = 6;

function validateQuestionSet(questions) {
    if (!Array.isArray(questions) || questions.length === 0) {
        return 'La inducción debe tener al menos una pregunta';
    }

    for (const question of questions) {
        const options = question?.options;
        if (!Array.isArray(options) || options.length < MIN_OPTIONS || options.length > MAX_OPTIONS) {
            return `Cada pregunta debe tener entre ${MIN_OPTIONS} y ${MAX_OPTIONS} opciones`;
        }
        if (!question.statement || !String(question.statement).trim()) {
            return 'Cada pregunta debe tener un enunciado';
        }
        const correctCount = options.filter((option) => option.isCorrect).length;
        if (correctCount !== 1) {
            return 'Cada pregunta debe tener exactamente una opción correcta';
        }
        if (options.some((option) => !option.text || !String(option.text).trim())) {
            return 'Cada opción debe tener texto';
        }
    }

    return null;
}

function validateQuestionsToShow(questionsToShow, totalQuestions) {
    if (questionsToShow == null) return null;
    if (!Number.isInteger(questionsToShow) || questionsToShow < 1) {
        return 'La cantidad de preguntas a mostrar debe ser un número entero mayor a 0';
    }
    if (questionsToShow > totalQuestions) {
        return 'La cantidad de preguntas a mostrar no puede superar el total de preguntas de la inducción';
    }
    return null;
}

function gradeAttempt(questions, answers) {
    const answerByQuestion = new Map(
        (answers ?? []).map((answer) => [answer.questionId, answer.optionId]),
    );

    let correctCount = 0;
    const detail = questions.map((question) => {
        const selectedOptionId = answerByQuestion.get(question.id) ?? null;
        const correctOption = question.options.find((option) => option.isCorrect);
        const isCorrect = selectedOptionId != null && correctOption?.id === selectedOptionId;
        if (isCorrect) correctCount += 1;
        return { questionId: question.id, selectedOptionId, isCorrect };
    });

    const total = questions.length;
    const score = total > 0 ? Math.round((correctCount / total) * 10000) / 100 : 0;

    return { correctCount, total, score, detail };
}

function isPassed(score, passingScore) {
    return score >= passingScore;
}

/**
 * Baraja (Fisher-Yates) y toma `count` preguntas del banco — usado para
 * armar el subconjunto que se muestra en un intento (anti-copia: cada
 * colaborador/intento recibe un sorteo distinto). `count` nulo, <= 0 o
 * mayor al total devuelve el banco completo, igual barajado.
 */
function pickRandomQuestions(questions, count) {
    const pool = [...questions];
    for (let i = pool.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    if (!count || count <= 0 || count >= pool.length) return pool;
    return pool.slice(0, count);
}

function remainingAttempts({ maxAttempts, extraAttempts = 0, usedAttempts = 0 }) {
    return Math.max(0, maxAttempts + extraAttempts - usedAttempts);
}

function resolveStatus({ materialViewedAt, bestScore, passingScore, remaining }) {
    if (bestScore != null && isPassed(bestScore, passingScore)) return 'passed';
    if (remaining <= 0) return 'failed';
    if (materialViewedAt) return 'in_progress';
    return 'pending';
}

module.exports = {
    validateQuestionSet,
    validateQuestionsToShow,
    gradeAttempt,
    isPassed,
    pickRandomQuestions,
    remainingAttempts,
    resolveStatus,
};
