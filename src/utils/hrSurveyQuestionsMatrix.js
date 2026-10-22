const XLSX = require('xlsx');
const { OPTION_TYPES, MIN_OPTIONS, MAX_OPTIONS, validateQuestion } = require('./hrSurveyScoring');

const DEFAULT_SCALE_MIN = 1;
const DEFAULT_SCALE_MAX = 5;
const FIRST_OPTION_COLUMN = 5;

const OPTION_NUMBERS = Array.from({ length: MAX_OPTIONS }, (_, index) => index + 1);

const HEADERS = [
    'Pregunta', 'Tipo', 'Requerida', 'Escala mín', 'Escala máx',
    ...OPTION_NUMBERS.flatMap((number) => [`Opción ${number}`, `Puntaje ${number}`]),
];

// Valor de "Tipo" en Excel (sin distinguir mayúsculas ni acentos) -> tipo de la API.
const TYPE_LABELS = [
    ['Opción múltiple', 'opcion multiple'],
    ['Lista', 'lista'],
    ['Escala', 'scale'],
    ['Texto corto', 'texto'],
    ['Texto largo', 'texto largo'],
];

const normalize = (value) => String(value ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

const TYPE_BY_LABEL = new Map(TYPE_LABELS.map(([label, type]) => [normalize(label), type]));

const padRow = (cells) => [...cells, ...Array(HEADERS.length - cells.length).fill('')];

const EXAMPLE_ROWS = [
    ['¿Cómo calificas el ambiente de trabajo?', 'Opción múltiple', 'Sí', '', '', 'Excelente', 5, 'Bueno', 4, 'Regular', 3, 'Malo', 1],
    ['¿En qué área necesitas más apoyo?', 'Lista', 'No', '', '', 'Capacitación', 3, 'Herramientas', 2, 'Comunicación', 1],
    ['¿Qué tan satisfecho estás con tu jefe directo?', 'Escala', 'Sí', 1, 5],
    ['¿Qué es lo que más valoras de la empresa?', 'Texto corto', 'No'],
    ['¿Qué mejorarías en tu día a día? Cuéntanos con detalle.', 'Texto largo', 'No'],
].map(padRow);

const INSTRUCTIONS = [
    ['Instrucciones'],
    ['1. Escribe una pregunta por fila en la hoja "Preguntas", desde la fila 2. Las filas vacías se ignoran.'],
    ['2. Pregunta: el enunciado que verá el colaborador.'],
    [`3. Tipo: ${TYPE_LABELS.map(([label]) => label).join(', ')}.`],
    ['4. Requerida: "Sí" o "No". Si la dejas vacía se toma como "No".'],
    [`5. Opción múltiple y Lista: entre ${MIN_OPTIONS} y ${MAX_OPTIONS} opciones (Opción 1 a Opción ${MAX_OPTIONS}), cada una con su Puntaje numérico. El colaborador elige una sola.`],
    [`6. Escala: indica Escala mín y Escala máx (0 <= mín < máx <= 10). Si las dejas vacías se usa ${DEFAULT_SCALE_MIN} a ${DEFAULT_SCALE_MAX}.`],
    ['7. Texto corto y Texto largo no usan opciones ni escala; esas columnas se ignoran.'],
    ['8. Puedes borrar las filas de ejemplo.'],
];

const cellText = (value) => String(value ?? '').trim();

/** Libro de Excel de ejemplo (hoja de preguntas + instrucciones) que RRHH descarga y llena. */
function buildQuestionsTemplate() {
    const workbook = XLSX.utils.book_new();

    const questionsSheet = XLSX.utils.aoa_to_sheet([HEADERS, ...EXAMPLE_ROWS]);
    questionsSheet['!cols'] = HEADERS.map((_, index) => ({ wch: index === 0 ? 50 : index < FIRST_OPTION_COLUMN ? 16 : 18 }));
    XLSX.utils.book_append_sheet(workbook, questionsSheet, 'Preguntas');

    const instructionsSheet = XLSX.utils.aoa_to_sheet(INSTRUCTIONS);
    instructionsSheet['!cols'] = [{ wch: 110 }];
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instrucciones');

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

// Devuelve { question } o { error } para una fila no vacía.
function parseRow(cells) {
    const type = TYPE_BY_LABEL.get(normalize(cells[1]));
    if (!type) return { error: 'El tipo de pregunta no es válido' };

    const requiredText = normalize(cells[2]);
    if (requiredText && !['si', 'no'].includes(requiredText)) {
        return { error: 'Requerida debe ser "Sí" o "No"' };
    }

    const question = { statement: cells[0], type, required: requiredText === 'si' };

    if (type === 'scale') {
        question.scaleMin = cells[3] ? Number(cells[3]) : DEFAULT_SCALE_MIN;
        question.scaleMax = cells[4] ? Number(cells[4]) : DEFAULT_SCALE_MAX;
    }

    if (OPTION_TYPES.includes(type)) {
        question.options = [];
        for (let index = 0; index < OPTION_NUMBERS.length; index += 1) {
            const text = cells[FIRST_OPTION_COLUMN + index * 2] ?? '';
            const scoreText = cells[FIRST_OPTION_COLUMN + index * 2 + 1] ?? '';
            if (!text && !scoreText) continue;
            if (!text) return { error: `El puntaje ${index + 1} no tiene opción` };
            const score = Number(scoreText);
            if (!scoreText || !Number.isFinite(score)) {
                return { error: `La opción ${index + 1} necesita un puntaje numérico` };
            }
            question.options.push({ text, score });
        }
    }

    const error = validateQuestion(question);
    return error ? { error } : { question };
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

        const { question, error } = parseRow(cells);
        if (error) errors.push({ row: rowNumber, message: error });
        else questions.push(question);
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
    // reconoce como matriz si los encabezados coinciden con los esperados.
    const header = rows[0] ?? [];
    if (!HEADERS.every((title, index) => normalize(header[index]) === normalize(title))) return null;
    return parseQuestionRows(rows);
}

module.exports = { buildQuestionsTemplate, parseQuestionRows, parseQuestionsWorkbook, HEADERS };
