// Backfill de form_questions.question_id contra el banco de preguntas
// (questions), necesario para poder filtrar puntuaciones por categoria de
// pregunta en los reportes (ver docs/superpowers/specs/2026-09-18-questions-category-position-migration.sql).
// Solo llena question_id donde hoy esta en NULL — no toca filas ya vinculadas.
// El match es por texto (title == name, sin distinguir mayusculas/espacios),
// unico dato disponible hoy que conecta ambas tablas.
//
// Uso:
//   npm run backfill:question-links            (aplica los cambios)
//   npm run backfill:question-links -- --dry-run  (solo reporta, no escribe)

const db = require("../utils/database");
const initModels = require("../models/init.models");
initModels();

const Question = require("../models/operations/surveys/question.models");
const FormQuestion = require("../models/operations/surveys/formQuestion.models");

const normalize = (text) => String(text ?? "").trim().toLowerCase();

const run = async () => {
    await db.authenticate();

    const dryRun = process.argv.includes("--dry-run");

    const [questions, formQuestions] = await Promise.all([
        Question.findAll({ attributes: ["id", "name"], raw: true }),
        FormQuestion.findAll({ where: { questionId: null }, attributes: ["id", "title"], raw: true }),
    ]);

    const questionByName = new Map();
    for (const question of questions) {
        questionByName.set(normalize(question.name), question.id);
    }

    const matched = [];
    const unmatched = [];

    for (const formQuestion of formQuestions) {
        const questionId = questionByName.get(normalize(formQuestion.title));
        if (questionId) {
            matched.push({ formQuestionId: formQuestion.id, questionId, title: formQuestion.title });
        } else {
            unmatched.push(formQuestion.title);
        }
    }

    console.log("=== BACKFILL form_questions.question_id ===");
    console.log("form_questions sin vincular:", formQuestions.length);
    console.log("Con match en el banco:", matched.length);
    console.log("Sin match (quedan como estaban):", unmatched.length);
    if (unmatched.length) {
        console.log("Ejemplos sin match (hasta 10):", [...new Set(unmatched)].slice(0, 10));
    }

    if (dryRun) {
        console.log("\n--dry-run: no se escribio nada.");
        return;
    }

    for (const { formQuestionId, questionId } of matched) {
        await FormQuestion.update({ questionId }, { where: { id: formQuestionId } });
    }

    console.log(`\nListo: ${matched.length} form_questions actualizadas.`);
};

run()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Error en backfill:", error);
        process.exit(1);
    });
