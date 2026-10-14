const { buildQuestionsTemplate, parseQuestionRows, parseQuestionsWorkbook, HEADERS } = require('../../../src/utils/inductionQuestionsMatrix');

describe('inductionQuestionsMatrix', () => {
    describe('parseQuestionRows', () => {
        it('maps each row to a question with exactly one correct option', () => {
            const { questions, errors } = parseQuestionRows([
                HEADERS,
                ['¿Color?', 'Rojo', 'Azul', '', '', '', '', 'b'],
            ]);

            expect(errors).toEqual([]);
            expect(questions).toEqual([{
                statement: '¿Color?',
                options: [{ text: 'Rojo', isCorrect: false }, { text: 'Azul', isCorrect: true }],
            }]);
        });

        it('skips blank rows and reports invalid rows with their Excel row number', () => {
            const { questions, errors } = parseQuestionRows([
                HEADERS,
                ['', '', '', '', '', '', '', ''],
                ['Sin opciones', 'Única', '', '', '', '', '', 'A'],
                ['', 'A1', 'A2', '', '', '', '', 'A'],
                ['Letra inválida', 'Uno', 'Dos', '', '', '', '', 'Z'],
                ['Opción vacía', 'Uno', 'Dos', '', '', '', '', 'D'],
                ['Válida', 'Uno', 'Dos', 'Tres', '', '', '', 'C'],
            ]);

            expect(questions.map((question) => question.statement)).toEqual(['Válida']);
            expect(errors.map((error) => error.row)).toEqual([3, 4, 5, 6]);
        });

        it('keeps the letter of each option even when earlier columns are empty', () => {
            const { questions } = parseQuestionRows([HEADERS, ['P', '', 'Dos', 'Tres', '', '', '', 'C']]);
            expect(questions[0].options).toEqual([{ text: 'Dos', isCorrect: false }, { text: 'Tres', isCorrect: true }]);
        });
    });

    describe('template round trip', () => {
        it('parses the downloadable template example rows without errors', () => {
            const { questions, errors } = parseQuestionsWorkbook(buildQuestionsTemplate());
            expect(errors).toEqual([]);
            expect(questions.length).toBe(2);
        });

        it('returns null for a buffer that is not a spreadsheet', () => {
            expect(parseQuestionsWorkbook(Buffer.from([0x00, 0x01, 0x02]))).toBeNull();
        });
    });
});
