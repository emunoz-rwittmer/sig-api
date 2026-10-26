-- Migración: reportería de resultados de encuestas RRHH (empresa, yate y categorías).
-- Cada participación/respuesta guarda las empresas del colaborador al responder
-- (company_ids, JSON con ids; el yate se deduce de la empresa). Las filas existentes
-- quedan en NULL y se reportan como "Sin clasificar".
-- Las preguntas ganan una categoría opcional para agrupar el promedio por tema.
--
-- Requiere antes 2026-10-26-hr-survey-dimensions-migration.sql.
-- NO se ejecuta automáticamente (`db.sync` está con alter:false).

ALTER TABLE hr_survey_participations ADD COLUMN company_ids JSON NULL;
ALTER TABLE hr_survey_responses ADD COLUMN company_ids JSON NULL;
ALTER TABLE hr_survey_questions ADD COLUMN category VARCHAR(80) NULL AFTER scale_max;
