-- Migración: recepción libre de registros en GPS, novedades y vínculo con el pedido.
--
-- No destructiva: columnas NULLABLE en una tabla existente. Los registros
-- anteriores quedan con NULL y siguen funcionando sin backfill.
-- Ejecutar antes de desplegar el backend: `db.sync({ alter: false })` no crea
-- columnas en tablas que ya existen.

ALTER TABLE registers
  ADD COLUMN order_id INT NULL,
  ADD COLUMN received_by INT NULL,
  ADD COLUMN received_at DATETIME NULL,
  ADD COLUMN novelty_status VARCHAR(20) NULL, -- pendiente | resuelta
  ADD COLUMN resolved_by INT NULL,
  ADD COLUMN resolved_at DATETIME NULL;

ALTER TABLE registers ADD INDEX idx_registers_order (order_id);
