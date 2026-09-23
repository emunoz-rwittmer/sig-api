-- Migración: preguntas aleatorias por intento en Inducciones.
-- Ver docs/superpowers/specs/2026-09-23-rrhh-inductions-design.md
--
-- No destructiva: columnas NULLABLE / con default sobre tablas existentes
-- del dominio de inducciones. Correrla junto con o después de
-- 2026-09-23-rrhh-inductions-migration.sql, antes del arranque del API
-- que sirve el código que las usa.

ALTER TABLE inductions
    ADD COLUMN questions_to_show SMALLINT UNSIGNED NULL AFTER max_attempts;

ALTER TABLE induction_progress
    ADD COLUMN selected_question_ids JSON NULL AFTER extra_attempts,
    ADD COLUMN selected_for_attempt INT NOT NULL DEFAULT 0 AFTER selected_question_ids;
