-- Migración: rediseño del dashboard de Indicadores (máxima fidelidad al
-- mockup "Rediseño profesional y moderno" de Claude Design).
--
-- No destructiva: columnas NULLABLE sobre tablas existentes. No se toca
-- `formula_id`/`formula`/`goal`/`type_goal` (el cálculo de `percent` vía
-- mathjs no cambia); las columnas nuevas son metadata adicional para la
-- UI (subproceso, etiquetas del numerador/denominador, periodo medido).
-- Filas existentes quedan con estos campos en NULL — el front usa
-- "Numerador"/"Denominador" y "Sin proceso" como fallback, ver
-- indicators.utils.js.

ALTER TABLE indicators
    ADD COLUMN subprocess VARCHAR(255) NULL AFTER departament_id,
    ADD COLUMN num_label VARCHAR(255) NULL AFTER formula,
    ADD COLUMN den_label VARCHAR(255) NULL AFTER num_label;

ALTER TABLE tabulations
    ADD COLUMN period_month TINYINT UNSIGNED NULL AFTER indicator_id,
    ADD COLUMN period_year SMALLINT UNSIGNED NULL AFTER period_month;
