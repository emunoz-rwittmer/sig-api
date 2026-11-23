-- Migración: anulación de registros, quién ejecutó el trabajo (proveedor y
-- costo) y equipos críticos con su sistema. No destructiva: columnas NULLABLE,
-- salvo `critical`, que arranca en 0 (ningún equipo marcado como crítico).

ALTER TABLE maintenance_records
    ADD COLUMN performed_by_type VARCHAR(255) NULL,
    ADD COLUMN provider VARCHAR(255) NULL,
    ADD COLUMN cost DECIMAL(12, 2) NULL,
    ADD COLUMN voided_at DATETIME NULL,
    ADD COLUMN void_reason TEXT NULL,
    ADD COLUMN voided_by VARCHAR(255) NULL,
    ADD COLUMN voided_by_id INT NULL,
    ADD COLUMN voided_by_kind VARCHAR(255) NULL;

ALTER TABLE yacht_equipments
    ADD COLUMN category VARCHAR(255) NULL,
    ADD COLUMN critical TINYINT(1) NOT NULL DEFAULT 0;
