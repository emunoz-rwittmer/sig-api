const {
    validateQuestionSet,
    validateQuestionsToShow,
    gradeAttempt,
    isPassed,
    pickRandomQuestions,
    remainingAttempts,
    resolveStatus,
} = require('../../../src/utils/inductionScoring');

const buildQuestion = (id, options) => ({ id, statement: `Pregunta ${id}`, options });

describe('inductionScoring utils', () => {
    describe('validateQuestionSet', () => {
        it('rechaza un set sin preguntas', () => {
            expect(validateQuestionSet([])).toMatch(/al menos una pregunta/);
            expect(validateQuestionSet(null)).toMatch(/al menos una pregunta/);
        });

        it('rechaza una pregunta con menos de 2 opciones', () => {
            const questions = [{ statement: 'Q1', options: [{ text: 'A', isCorrect: true }] }];
            expect(validateQuestionSet(questions)).toMatch(/entre 2 y 6 opciones/);
        });

        it('rechaza una pregunta sin ninguna opción correcta', () => {
            const questions = [{ statement: 'Q1', options: [{ text: 'A', isCorrect: false }, { text: 'B', isCorrect: false }] }];
            expect(validateQuestionSet(questions)).toMatch(/exactamente una opción correcta/);
        });

        it('rechaza una pregunta con más de una opción correcta', () => {
            const questions = [{ statement: 'Q1', options: [{ text: 'A', isCorrect: true }, { text: 'B', isCorrect: true }] }];
            expect(validateQuestionSet(questions)).toMatch(/exactamente una opción correcta/);
        });

        it('acepta un set válido', () => {
            const questions = [{ statement: 'Q1', options: [{ text: 'A', isCorrect: true }, { text: 'B', isCorrect: false }] }];
            expect(validateQuestionSet(questions)).toBeNull();
        });
    });

    describe('validateQuestionsToShow', () => {
        it('acepta null (mostrar todas)', () => {
            expect(validateQuestionsToShow(null, 10)).toBeNull();
        });

        it('rechaza un valor no entero o menor a 1', () => {
            expect(validateQuestionsToShow(0, 10)).toMatch(/mayor a 0/);
            expect(validateQuestionsToShow(-1, 10)).toMatch(/mayor a 0/);
            expect(validateQuestionsToShow(1.5, 10)).toMatch(/mayor a 0/);
        });

        it('rechaza un valor mayor al total de preguntas', () => {
            expect(validateQuestionsToShow(11, 10)).toMatch(/no puede superar el total/);
        });

        it('acepta un valor entre 1 y el total', () => {
            expect(validateQuestionsToShow(5, 10)).toBeNull();
            expect(validateQuestionsToShow(10, 10)).toBeNull();
        });
    });

    describe('pickRandomQuestions', () => {
        const pool = [buildQuestion(1, []), buildQuestion(2, []), buildQuestion(3, []), buildQuestion(4, [])];

        it('devuelve exactamente `count` preguntas del banco, sin repetir', () => {
            const picked = pickRandomQuestions(pool, 2);
            expect(picked).toHaveLength(2);
            expect(new Set(picked.map((q) => q.id)).size).toBe(2);
            picked.forEach((question) => expect(pool).toContainEqual(question));
        });

        it('devuelve el banco completo (barajado) cuando count es nulo, 0 o excede el total', () => {
            expect(pickRandomQuestions(pool, null)).toHaveLength(pool.length);
            expect(pickRandomQuestions(pool, 0)).toHaveLength(pool.length);
            expect(pickRandomQuestions(pool, 99)).toHaveLength(pool.length);
        });

        it('no muta el arreglo original', () => {
            const original = [...pool];
            pickRandomQuestions(pool, 2);
            expect(pool).toEqual(original);
        });
    });

    describe('gradeAttempt', () => {
        it('califica correctamente respuestas mixtas', () => {
            const questions = [
                buildQuestion(1, [{ id: 10, isCorrect: true }, { id: 11, isCorrect: false }]),
                buildQuestion(2, [{ id: 20, isCorrect: false }, { id: 21, isCorrect: true }]),
            ];
            const answers = [{ questionId: 1, optionId: 10 }, { questionId: 2, optionId: 20 }];

            const result = gradeAttempt(questions, answers);
            expect(result.correctCount).toBe(1);
            expect(result.total).toBe(2);
            expect(result.score).toBe(50);
        });

        it('trata una pregunta sin respuesta como incorrecta', () => {
            const questions = [buildQuestion(1, [{ id: 10, isCorrect: true }, { id: 11, isCorrect: false }])];
            const result = gradeAttempt(questions, []);
            expect(result.correctCount).toBe(0);
            expect(result.score).toBe(0);
        });
    });

    describe('isPassed', () => {
        it('aprueba en el umbral exacto', () => {
            expect(isPassed(70, 70)).toBe(true);
        });

        it('reprueba por debajo del umbral', () => {
            expect(isPassed(69.99, 70)).toBe(false);
        });
    });

    describe('remainingAttempts', () => {
        it('descuenta los intentos usados', () => {
            expect(remainingAttempts({ maxAttempts: 3, extraAttempts: 0, usedAttempts: 1 })).toBe(2);
        });

        it('suma los intentos extra habilitados', () => {
            expect(remainingAttempts({ maxAttempts: 3, extraAttempts: 1, usedAttempts: 3 })).toBe(1);
        });

        it('nunca devuelve un número negativo', () => {
            expect(remainingAttempts({ maxAttempts: 3, extraAttempts: 0, usedAttempts: 10 })).toBe(0);
        });
    });

    describe('resolveStatus', () => {
        it('devuelve passed si la mejor nota superó el mínimo', () => {
            expect(resolveStatus({ materialViewedAt: new Date(), bestScore: 80, passingScore: 70, remaining: 0 })).toBe('passed');
        });

        it('devuelve failed sin intentos restantes y sin aprobar', () => {
            expect(resolveStatus({ materialViewedAt: new Date(), bestScore: 50, passingScore: 70, remaining: 0 })).toBe('failed');
        });

        it('devuelve in_progress si vio el material y le quedan intentos', () => {
            expect(resolveStatus({ materialViewedAt: new Date(), bestScore: null, passingScore: 70, remaining: 2 })).toBe('in_progress');
        });

        it('devuelve pending si no ha revisado el material', () => {
            expect(resolveStatus({ materialViewedAt: null, bestScore: null, passingScore: 70, remaining: 3 })).toBe('pending');
        });
    });
});
