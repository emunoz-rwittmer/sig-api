-- Migración: línea base por asignación regla-equipo (último servicio conocido
-- antes de llevar el equipo en el sistema). No destructiva: dos columnas NULLABLE.
--
-- La tabla nueva `equipment_hour_readings` (lecturas de horómetro) NO necesita
-- SQL manual: la crea `db.sync()` al arrancar la API.

ALTER TABLE maintenance_rule_assignments
    ADD COLUMN baseline_date DATETIME NULL,
    ADD COLUMN baseline_hours FLOAT NULL;
