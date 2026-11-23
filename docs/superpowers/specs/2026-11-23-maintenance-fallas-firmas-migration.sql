-- Migración: firmas con usuario real en el historial de mantenimiento.
-- No destructiva: columnas NULLABLE; los registros anteriores quedan sin
-- autor (y por eso cualquiera puede aprobarlos).
--
-- La tabla nueva `maintenance_faults` (fallas reportadas) NO necesita SQL
-- manual: la crea `db.sync()` al arrancar la API.

ALTER TABLE maintenance_records
    ADD COLUMN created_by VARCHAR(255) NULL,
    ADD COLUMN created_by_id INT NULL,
    ADD COLUMN created_by_kind VARCHAR(255) NULL,
    ADD COLUMN approved_by_id INT NULL,
    ADD COLUMN approved_by_kind VARCHAR(255) NULL;
