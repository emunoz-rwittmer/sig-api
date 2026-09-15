-- Migración: agrega la clasificación de tipo de documento (Curso OMI /
-- Habilitante / Salud / Personal) usada por la vista de catálogo
-- expandible de la pantalla de Documentación (identidad visual nueva).
--
-- No destructiva: columna NULLABLE en tabla existente, sin backfill (los
-- tipos de documento ya creados quedan con `type` en NULL hasta que se
-- editen y se les asigne una categoría).

ALTER TABLE documentation ADD COLUMN type VARCHAR(20) NULL;
