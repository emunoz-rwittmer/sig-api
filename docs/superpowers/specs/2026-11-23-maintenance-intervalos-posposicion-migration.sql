-- Migración: doble intervalo en reglas, intervalo propio por equipo y
-- posposición de vencimientos. No destructiva: todas las columnas son NULLABLE
-- y, vacías, el cálculo de vencimientos queda igual que antes.

ALTER TABLE maintenance_rules
    ADD COLUMN secondary_value FLOAT NULL,
    ADD COLUMN secondary_unit VARCHAR(255) NULL;

ALTER TABLE maintenance_rule_assignments
    ADD COLUMN interval_override FLOAT NULL,
    ADD COLUMN postponed_until_date DATETIME NULL,
    ADD COLUMN postponed_until_hours FLOAT NULL,
    ADD COLUMN postpone_reason TEXT NULL,
    ADD COLUMN postponed_by VARCHAR(255) NULL,
    ADD COLUMN postponed_by_id INT NULL,
    ADD COLUMN postponed_by_kind VARCHAR(255) NULL,
    ADD COLUMN postponed_at DATETIME NULL,
    ADD COLUMN postponed_after_record_id INT NULL;
