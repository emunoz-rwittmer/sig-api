-- Migración: agrega el campo de tipo de mantenimiento (preventivo/correctivo)
-- usado por el nuevo endpoint GET /maintenance/alerts y por el checklist de
-- reglas del modal "Registrar mantenimiento" en el frontend.
--
-- No destructiva: agrega una columna NULLABLE a una tabla existente, sin
-- tocar datos ni el resto del esquema (que ya tiene periodicity_value,
-- periodicity_unit, etc. de la migración anterior). El backend infiere el
-- valor cuando el cliente no lo envía explícitamente, así que registros
-- existentes (con la columna en NULL) siguen funcionando sin backfill.

ALTER TABLE maintenance_records ADD COLUMN maintenance_type VARCHAR(255) NULL;
