const XLSX = require('xlsx');

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 6;
const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

const HEADERS = ['Pregunta', ...OPTION_LETTERS.map((letter) => `Opción ${letter}`), 'Respuesta correcta'];

const EXAMPLE_ROWS = [
    ['¿Cuál es el número de emergencia a bordo?', '911', '112', 'Canal 16 VHF', '', '', '', 'C'],
    ['¿Qué se debe usar al abandonar el barco?', 'Chaleco salvavidas', 'Casco', '', '', '', '', 'A'],
];

const INSTRUCTIONS = [
    ['Instrucciones'],
    ['1. Escribe una pregunta por fila en la hoja "Preguntas", desde la fila 2.'],
    [`2. Cada pregunta necesita entre ${MIN_OPTIONS} y ${MAX_OPTIONS} opciones (columnas Opción A a Opción F). Deja vacías las que no uses.`],
    ['3. En "Respuesta correcta" escribe la letra de la opción correcta (A, B, C, D, E o F).'],
    ['4. Puedes borrar las filas de ejemplo. Las filas vacías se ignoran.'],
];

const cellText = (value) => String(value ?? '').trim();

/** Libro de Excel de ejemplo (hoja de preguntas + instrucciones) que RRHH descarga y llena. */
function buildQuestionsTemplate() {
    const workbook = XLSX.utils.book_new();

    const questionsSheet = XLSX.utils.aoa_to_sheet([HEADERS, ...EXAMPLE_ROWS]);
    questionsSheet['!cols'] = [{ wch: 50 }, ...OPTION_LETTERS.map(() => ({ wch: 24 })), { wch: 20 }];
    XLSX.utils.book_append_sheet(workbook, questionsSheet, 'Preguntas');

    const instructionsSheet = XLSX.utils.aoa_to_sheet(INSTRUCTIONS);
    instructionsSheet['!cols'] = [{ wch: 110 }];
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instrucciones');

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * Convierte las filas de la matriz (array de arrays, fila 0 = encabezados)
 * al formato de preguntas de la API. Las filas con problemas no se
 * descartan en silencio: se reportan con su número de fila de Excel.
 */
function parseQuestionRows(rows) {
    const questions = [];
    const errors = [];

    (rows ?? []).slice(1).forEach((row, index) => {
        const rowNumber = index + 2;
        const cells = (row ?? []).map(cellText);
        if (cells.every((cell) => !cell)) return;

        const statement = cells[0];
        const optionCells = OPTION_LETTERS.map((letter, optionIndex) => ({ letter, text: cells[optionIndex + 1] ?? '' }))
            .filter((option) => option.text);
        const answer = cellText(cells[OPTION_LETTERS.length + 1]).toUpperCase();

        if (!statement) {
            errors.push({ row: rowNumber, message: 'Falta el texto de la pregunta' });
            return;
        }
        if (optionCells.length < MIN_OPTIONS) {
            errors.push({ row: rowNumber, message: `Necesita al menos ${MIN_OPTIONS} opciones` });
            return;
        }
        if (!OPTION_LETTERS.includes(answer)) {
            errors.push({ row: rowNumber, message: 'La respuesta correcta debe ser una letra de A a F' });
            return;
        }
        if (!optionCells.some((option) => option.letter === answer)) {
            errors.push({ row: rowNumber, message: `La opción ${answer} marcada como correcta está vacía` });
            return;
        }

        questions.push({
            statement,
            options: optionCells.map((option) => ({ text: option.text, isCorrect: option.letter === answer })),
        });
    });

    return { questions, errors };
}

function parseQuestionsWorkbook(buffer) {
    let workbook;
    try {
        workbook = XLSX.read(buffer, { type: 'buffer' });
    } catch {
        return null;
    }
    const sheet = workbook.Sheets.Preguntas ?? workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) return null;
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    // XLSX.read acepta casi cualquier archivo (lo trata como texto): solo se
    // reconoce como matriz si la primera columna trae el encabezado esperado.
    if (cellText(rows[0]?.[0]).toLowerCase() !== HEADERS[0].toLowerCase()) return null;
    return parseQuestionRows(rows);
}

module.exports = { buildQuestionsTemplate, parseQuestionRows, parseQuestionsWorkbook, HEADERS };
