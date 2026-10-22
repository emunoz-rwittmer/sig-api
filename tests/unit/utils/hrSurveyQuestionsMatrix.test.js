const XLSX = require('xlsx');
const { buildQuestionsTemplate, parseQuestionRows, parseQuestionsWorkbook, HEADERS } = require('../../../src/utils/hrSurveyQuestionsMatrix');

const row = (cells) => [...cells, ...Array(HEADERS.length - cells.length).fill('')];

describe('hrSurveyQuestionsMatrix', () => {
    it('has the expected headers', () => {
        expect(HEADERS).toHaveLength(25);
        expect(HEADERS.slice(0, 7)).toEqual(['Pregunta', 'Tipo', 'Requerida', 'Escala mín', 'Escala máx', 'Opción 1', 'Puntaje 1']);
        expect(HEADERS.slice(-2)).toEqual(['Opción 10', 'Puntaje 10']);
    });

    it('template parses back to one example per type', () => {
        const result = parseQuestionsWorkbook(buildQuestionsTemplate());

        expect(result.errors).toEqual([]);
        expect(result.questions.map((q) => q.type)).toEqual(['opcion multiple', 'lista', 'scale', 'texto', 'texto largo']);
        expect(result.questions[0].options[0]).toEqual({ text: 'Excelente', score: 5 });
        expect(result.questions[0].required).toBe(true);
        expect(result.questions[2]).toMatchObject({ scaleMin: 1, scaleMax: 5 });
        expect(result.questions[3].options).toBeUndefined();
    });

    it('template includes an Instrucciones sheet', () => {
        const workbook = XLSX.read(buildQuestionsTemplate(), { type: 'buffer' });
        expect(workbook.SheetNames).toEqual(['Preguntas', 'Instrucciones']);
    });

    it('reports unknown type on that row', () => {
        const { questions, errors } = parseQuestionRows([HEADERS, row(['¿X?', 'Rara', 'No'])]);
        expect(questions).toEqual([]);
        expect(errors).toEqual([{ row: 2, message: expect.stringContaining('tipo') }]);
    });

    it('reports an option with text but no score', () => {
        const { errors } = parseQuestionRows([HEADERS, row(['¿X?', 'Lista', 'No', '', '', 'A', 1, 'B', ''])]);
        expect(errors).toHaveLength(1);
        expect(errors[0].row).toBe(2);
    });

    it('reports non-numeric score and delegates option count to validateQuestion', () => {
        const { errors } = parseQuestionRows([
            HEADERS,
            row(['¿X?', 'Lista', 'No', '', '', 'A', 1, 'B', 'abc']),
            row(['¿Y?', 'Lista', 'No', '', '', 'A', 1]),
        ]);
        expect(errors.map((e) => e.row)).toEqual([2, 3]);
        expect(errors[1].message).toMatch(/entre 2 y 10/);
    });

    it('defaults scale to 1-5 and validates bounds', () => {
        const { questions, errors } = parseQuestionRows([
            HEADERS,
            row(['¿Escala?', 'Escala', 'Sí']),
            row(['¿Mala?', 'Escala', 'No', 5, 3]),
        ]);
        expect(questions).toEqual([{ statement: '¿Escala?', type: 'scale', required: true, scaleMin: 1, scaleMax: 5 }]);
        expect(errors.map((e) => e.row)).toEqual([3]);
    });

    it('parses Requerida case-insensitively and rejects other values', () => {
        const { questions, errors } = parseQuestionRows([
            HEADERS,
            row(['A', 'texto corto', 'si']),
            row(['B', 'TEXTO LARGO', 'NO']),
            row(['C', 'Texto corto', '']),
            row(['D', 'Texto corto', 'quizás']),
        ]);
        expect(questions.map((q) => q.required)).toEqual([true, false, false]);
        expect(errors.map((e) => e.row)).toEqual([5]);
    });

    it('ignores option cells for non-option types and blank rows', () => {
        const { questions, errors } = parseQuestionRows([
            HEADERS,
            row([]),
            row(['¿Libre?', 'Texto corto', 'No', 2, 4, 'x', 'y']),
        ]);
        expect(errors).toEqual([]);
        expect(questions).toEqual([{ statement: '¿Libre?', type: 'texto', required: false }]);
    });

    it('returns null for non-Excel buffers or different headers', () => {
        expect(parseQuestionsWorkbook(Buffer.from('no es excel'))).toBeNull();
        const sheet = XLSX.utils.aoa_to_sheet([['Pregunta', 'Otra'], ['x', 'y']]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, sheet, 'Preguntas');
        expect(parseQuestionsWorkbook(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }))).toBeNull();
    });
});
