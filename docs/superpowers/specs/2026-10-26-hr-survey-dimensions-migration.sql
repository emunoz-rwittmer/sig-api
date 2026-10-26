-- Migración: resultados de encuestas RRHH por cargo y por tipo de personal.
-- Cada participación/respuesta guarda el cargo y el tipo (administrativo/operativo)
-- que tenía el colaborador al responder. Las filas existentes quedan en NULL y se
-- reportan como "Sin clasificar" (no se reconstruyen: vincularía persona y respuesta).
--
-- Requiere antes 2026-10-26-staff-type-migration.sql (staffs.staff_type).
-- NO se ejecuta automáticamente (`db.sync` está con alter:false).

ALTER TABLE hr_survey_participations
    ADD COLUMN position_id INT NULL,
    ADD COLUMN staff_type VARCHAR(20) NULL;

ALTER TABLE hr_survey_responses
    ADD COLUMN position_id INT NULL,
    ADD COLUMN staff_type VARCHAR(20) NULL;
