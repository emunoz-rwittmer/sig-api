// Importa como preguntas nuevas del banco (questions) las filas de
// "Lista de preguntas y categorías actualizada.xlsx" (columnas Ítem/Categoría/Función)
// que todavía no existen (por texto exacto de Ítem == name) en el banco.
// No modifica ni borra preguntas existentes — solo agrega las que faltan,
// con su categoría textual EXACTA del Excel y, cuando "Función" matchea
// exacto con el catálogo de cargos, su positionId (si no matchea exacto,
// queda sin cargo asignado y se reporta para revisión manual).
//
// Uso:
//   npm run import:questions -- --file "C:\ruta\al\archivo.xlsx"            (solo reporta)
//   npm run import:questions -- --file "C:\ruta\al\archivo.xlsx" --apply     (aplica los cambios)
//
// Por defecto corre en modo reporte (no escribe nada) — hay que pasar --apply para escribir.

const XLSX = require("xlsx");

const db = require("../utils/database");
const initModels = require("../models/init.models");
initModels();

const Question = require("../models/operations/surveys/question.models");
const Position = require("../models/catalogs/positions.models");

const normalize = (text) => String(text ?? "").trim().toLowerCase().replace(/\s+/g, " ");

// "Función" del Excel -> nombre exacto en el catálogo de cargos, para los
// casos donde el texto no matchea literal (Tripulación no tiene cargo
// puntual y se deja sin asignar a propósito, aplica a todos los cargos).
const FUNCTION_TO_POSITION_NAME = {
    "Cabinero": "Camarero",
    "Ay. de cocina": "Ayudante de Cocina",
};

const getArgValue = (flag) => {
    const index = process.argv.indexOf(flag);
    return index !== -1 ? process.argv[index + 1] : undefined;
};

const readRowsFromExcel = (filePath) => {
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

    const headerRow = (rows[0] || []).map((cell) => String(cell ?? "").trim());
    const itemIndex = headerRow.indexOf("Ítem");
    const categoryIndex = headerRow.indexOf("Categoría");
    const funcionIndex = headerRow.indexOf("Función");
    if (itemIndex === -1 || categoryIndex === -1) {
        throw new Error(`No se encontraron las columnas "Ítem"/"Categoría" en la hoja. Headers: ${headerRow.join(", ")}`);
    }

    const parsed = [];
    for (const row of rows.slice(1)) {
        const name = String(row[itemIndex] ?? "").trim();
        const category = String(row[categoryIndex] ?? "").trim();
        const funcion = funcionIndex !== -1 ? String(row[funcionIndex] ?? "").trim() : "";
        if (!name) continue;
        parsed.push({ name, category, funcion });
    }
    return parsed;
};

const run = async () => {
    const filePath = getArgValue("--file");
    if (!filePath) {
        throw new Error('Falta --file "<ruta al xlsx>"');
    }
    const apply = process.argv.includes("--apply");

    const rows = readRowsFromExcel(filePath);

    await db.authenticate();
    const [existingQuestions, positions] = await Promise.all([
        Question.findAll({ attributes: ["name"], raw: true }),
        Position.findAll({ attributes: ["id", "name"], raw: true }),
    ]);

    const existingNames = new Set(existingQuestions.map((question) => normalize(question.name)));
    const positionIdByName = new Map(positions.map((position) => [normalize(position.name), position.id]));

    const toCreate = [];
    const skippedExisting = [];
    const unmappedFunctions = new Set();
    const duplicatesInFile = [];
    const seen = new Map();

    for (const { name, category, funcion } of rows) {
        const key = normalize(name);

        if (seen.has(key)) {
            duplicatesInFile.push({ name, funcion, keptFuncion: seen.get(key) });
            continue; // misma pregunta ya tomada con la función de su primera aparición
        }
        seen.set(key, funcion);

        if (existingNames.has(key)) {
            skippedExisting.push(name);
            continue;
        }

        const positionName = FUNCTION_TO_POSITION_NAME[funcion] || funcion;
        const positionId = positionName ? positionIdByName.get(normalize(positionName)) : undefined;
        if (funcion && !positionId) unmappedFunctions.add(funcion);

        toCreate.push({ name, category: category || null, positionId: positionId ?? null, funcion });
    }

    console.log("=== IMPORT preguntas nuevas desde Excel ===");
    console.log("Archivo:", filePath);
    console.log("Filas en el archivo:", rows.length);
    console.log("Ya existen en el banco por texto exacto (se omiten):", skippedExisting.length);
    console.log("Nuevas a crear:", toCreate.length);

    if (duplicatesInFile.length) {
        console.log("\nMismo texto repetido en el Excel con distinta Función (se crea una sola vez, con el cargo de su primera aparición):");
        duplicatesInFile.forEach(({ name, funcion, keptFuncion }) => {
            console.log(`  - "${name}": se queda con "${keptFuncion || "sin función"}", se ignora "${funcion || "sin función"}"`);
        });
    }

    if (unmappedFunctions.size) {
        console.log('\n"Función" sin match exacto en el catálogo de cargos (quedan sin cargo asignado):');
        console.log(" ", [...unmappedFunctions].join(", "));
    }

    if (toCreate.length) {
        console.log("\nPreguntas a crear (hasta 15):");
        toCreate.slice(0, 15).forEach(({ name, category, positionId, funcion }) => {
            console.log(`  - [${category || "sin categoría"}] (${funcion || "sin función"} -> positionId ${positionId ?? "null"}) "${name}"`);
        });
    }

    if (!apply) {
        console.log("\nModo reporte (sin --apply): no se escribió nada.");
        return;
    }

    for (const { name, category, positionId } of toCreate) {
        await Question.create({ name, category, positionId, active: true });
    }

    console.log(`\nListo: ${toCreate.length} preguntas creadas.`);
};

run()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Error en import:", error);
        process.exit(1);
    });
