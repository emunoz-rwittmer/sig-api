-- Migración: agrega categoría y cargo al banco de preguntas (`questions`),
-- y el vínculo pregunta-de-formulario -> pregunta-del-banco (`form_questions.question_id`)
-- necesario para poder filtrar puntuaciones por categoría de pregunta en
-- los reportes de evaluaciones. Identidad visual nueva, máxima fidelidad
-- al mockup de Claude Design para la pantalla de Gestión de preguntas.
--
-- No destructiva: 4 columnas NULLABLE en tablas existentes, sin backfill
-- de `category`/`position_id` (las preguntas ya creadas quedan sin
-- categoría/cargo hasta que se editen desde el banco). `question_id` sí
-- tiene un backfill programático aparte —
-- ver src/scripts/backfillFormQuestionLink.js — porque requiere hacer
-- match de texto (`form_questions.title` contra `questions.name`), no es
-- un valor fijo que se pueda poner con SQL plano.

ALTER TABLE questions ADD COLUMN category VARCHAR(60) NULL;
ALTER TABLE questions ADD COLUMN position_id INT NULL;
ALTER TABLE form_questions ADD COLUMN question_id INT NULL;
