-- Migración: reinicio de horómetro (equipo con horómetro cambiado o puesto en cero).
-- No destructiva: dos columnas NULLABLE. Una lectura con reset_reason es un reinicio:
-- `reading` es lo que marca el horómetro nuevo y `previous_reading` lo último del viejo.

ALTER TABLE equipment_hour_readings
    ADD COLUMN reset_reason TEXT NULL,
    ADD COLUMN previous_reading FLOAT NULL;
