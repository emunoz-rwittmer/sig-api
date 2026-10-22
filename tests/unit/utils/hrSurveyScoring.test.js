const {
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
} = require('../../../src/utils/hrSurveyScoring');

const opts = (n) => Array.from({ length: n }, (_, i) => ({ id: i + 1, text: `Op ${i + 1}`, score: i }));
const mcq = (extra = {}) => ({ id: 1, statement: 'P', type: 'opcion multiple', required: true, options: opts(3), ...extra });
const scale = (extra = {}) => ({ id: 2, statement: 'E', type: 'scale', required: true, scaleMin: 1, scaleMax: 5, ...extra });
const texto = (extra = {}) => ({ id: 3, statement: 'T', type: 'texto', required: false, ...extra });
const survey = (extra = {}) => ({
    startsAt: '2026-11-01',
    endsAt: '2026-11-30',
    departamentIds: [1],
    questions: [mcq()],
    ...extra,
});

describe('hrSurveyScoring', () => {
    it('expone las constantes', () => {
        expect(QUESTION_TYPES).toEqual(['opcion multiple', 'lista', 'scale', 'texto', 'texto largo']);
        expect(OPTION_TYPES).toEqual(['opcion multiple', 'lista']);
        expect(SCORED_TYPES).toEqual(['opcion multiple', 'lista', 'scale']);
        expect(MIN_OPTIONS).toBe(2);
        expect(MAX_OPTIONS).toBe(10);
    });

    describe('validateSurveyForPublish', () => {
        it('acepta una encuesta válida, incluido texto sin opciones', () => {
            expect(validateSurveyForPublish(survey())).toBeNull();
            expect(validateSurveyForPublish(survey({ questions: [texto()] }))).toBeNull();
        });
        it('rechaza 0 departamentos', () => {
            expect(validateSurveyForPublish(survey({ departamentIds: [] }))).toEqual(expect.any(String));
        });
        it('rechaza 0 preguntas', () => {
            expect(validateSurveyForPublish(survey({ questions: [] }))).toEqual(expect.any(String));
        });
        it('rechaza startsAt > endsAt', () => {
            expect(validateSurveyForPublish(survey({ startsAt: '2026-12-01' }))).toEqual(expect.any(String));
        });
        it('rechaza opción múltiple con 1 u 11 opciones', () => {
            expect(validateSurveyForPublish(survey({ questions: [mcq({ options: opts(1) })] }))).toEqual(expect.any(String));
            expect(validateSurveyForPublish(survey({ questions: [mcq({ options: opts(11) })] }))).toEqual(expect.any(String));
        });
        it('rechaza una opción sin score numérico', () => {
            const options = opts(3);
            options[1].score = null;
            expect(validateSurveyForPublish(survey({ questions: [mcq({ options })] }))).toEqual(expect.any(String));
        });
        it('rechaza escala con min >= max o max > 10', () => {
            expect(validateSurveyForPublish(survey({ questions: [scale({ scaleMin: 3, scaleMax: 3 })] }))).toEqual(expect.any(String));
            expect(validateSurveyForPublish(survey({ questions: [scale({ scaleMax: 11 })] }))).toEqual(expect.any(String));
        });
    });

    describe('validateQuestion', () => {
        it('acepta score como string decimal', () => {
            const options = opts(2).map((o) => ({ ...o, score: '3.50' }));
            expect(validateQuestion(mcq({ options }))).toBeNull();
        });
        it('rechaza tipo inválido y enunciado vacío', () => {
            expect(validateQuestion(mcq({ type: 'otro' }))).toEqual(expect.any(String));
            expect(validateQuestion(mcq({ statement: '  ' }))).toEqual(expect.any(String));
        });
    });

    describe('resolveSurveyStatus', () => {
        const base = { active: true, startsAt: '2026-11-01', endsAt: '2026-11-30' };
        it.each([
            ['2026-10-31', 'scheduled'],
            ['2026-11-01', 'open'],
            ['2026-11-30', 'open'],
            ['2026-12-01', 'closed'],
        ])('hoy %s -> %s', (today, expected) => {
            expect(resolveSurveyStatus(base, today)).toBe(expected);
        });
        it('inactiva siempre es draft', () => {
            expect(resolveSurveyStatus({ ...base, active: false }, '2026-11-15')).toBe('draft');
        });
    });

    describe('scoreAnswer', () => {
        const bad = expect.objectContaining({ statusCode: 400 });
        it('lanza si la opción es de otra pregunta', () => {
            expect(() => scoreAnswer(mcq(), { questionId: 1, optionId: 99 })).toThrow(bad);
        });
        it('lanza si falta la opción', () => {
            expect(() => scoreAnswer(mcq(), { questionId: 1 })).toThrow(bad);
        });
        it('lanza si la escala está fuera de rango o no es entera', () => {
            expect(() => scoreAnswer(scale(), { questionId: 2, value: 6 })).toThrow(bad);
            expect(() => scoreAnswer(scale(), { questionId: 2, value: 0 })).toThrow(bad);
            expect(() => scoreAnswer(scale(), { questionId: 2, value: 2.5 })).toThrow(bad);
        });
        it('acepta escala válida', () => {
            expect(scoreAnswer(scale(), { questionId: 2, value: 4 })).toEqual({ optionId: null, score: 4, text: null });
        });
        it('usa el score de la opción e ignora el del cliente', () => {
            const r = scoreAnswer(mcq(), { questionId: 1, optionId: 3, score: 100 });
            expect(r).toEqual({ optionId: 3, score: 2, text: null });
        });
        it('coerciona score string de la BD', () => {
            const q = mcq({ options: [{ id: 1, text: 'a', score: '4.50' }, { id: 2, text: 'b', score: '1.00' }] });
            expect(scoreAnswer(q, { questionId: 1, optionId: 1 }).score).toBe(4.5);
        });
        it('texto devuelve text y score null', () => {
            expect(scoreAnswer(texto(), { questionId: 3, text: ' hola ' })).toEqual({ optionId: null, score: null, text: 'hola' });
        });
    });

    describe('computeResults', () => {
        const questions = [mcq({ id: 1 }), texto({ id: 3 }), scale({ id: 2, required: false })];
        const departaments = [{ id: 1, name: 'D1' }, { id: 2, name: 'D2' }, { id: 3, name: 'D3' }];
        const ans = (questionId, optionId, score, text = null) => ({ questionId, optionId, score, text });
        const responses = [
            { departamentId: 1, answers: [ans(1, 3, 5), ans(3, null, null, 'bien')] },
            { departamentId: 1, answers: [ans(1, 2, 4), ans(3, null, null, '   ')] },
            { departamentId: 2, answers: [ans(1, 2, 2), ans(3, null, null, 'mal')] },
        ];
        const result = computeResults({
            questions,
            departaments,
            responses,
            participationCounts: new Map([[1, 2], [2, 1]]),
            assignedPending: new Map([[1, 3], [3, 4]]),
        });
        const q = (id) => result.questions.find((x) => x.questionId === id);

        it('promedia por departamento y global', () => {
            expect(q(1).byDepartament).toEqual({ 1: 4.5, 2: 2, 3: null });
            expect(q(1).overall).toBe(3.67);
        });
        it('pregunta sin respuestas da overall null', () => {
            expect(q(2).overall).toBeNull();
            expect(q(2).byDepartament).toEqual({ 1: null, 2: null, 3: null });
            expect(q(2).distribution).toBeUndefined();
            expect(q(2).comments).toBeUndefined();
        });
        it('distribución por opción', () => {
            expect(q(1).distribution).toEqual([
                { optionId: 1, text: 'Op 1', count: 0 },
                { optionId: 2, text: 'Op 2', count: 2 },
                { optionId: 3, text: 'Op 3', count: 1 },
            ]);
        });
        it('comentarios solo con departamentId, omitiendo vacíos', () => {
            expect(q(3).comments).toEqual([{ departamentId: 1, text: 'bien' }, { departamentId: 2, text: 'mal' }]);
            expect(q(3).overall).toBeNull();
            expect(q(3).distribution).toBeUndefined();
        });
        it('participación: asignados = respondieron + pendientes', () => {
            expect(result.participation).toEqual([
                { departamentId: 1, name: 'D1', responded: 2, assigned: 5 },
                { departamentId: 2, name: 'D2', responded: 1, assigned: 1 },
                { departamentId: 3, name: 'D3', responded: 0, assigned: 4 },
            ]);
        });
    });
});
