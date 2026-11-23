-- Migración: bodega de la que salieron los materiales de un mantenimiento al
-- aprobarlo (para devolverlos si se anula). No destructiva: columna NULLABLE.

ALTER TABLE maintenance_records
    ADD COLUMN stock_warehouse_id INT NULL;
