-- Migración: motivo y nota en transacciones, para las salidas y los ajustes de stock.
--
-- No destructiva: dos columnas NULLABLE en una tabla existente.
-- Ejecutar antes de desplegar el backend: `db.sync({ alter: false })` no crea
-- columnas en tablas que ya existen.

ALTER TABLE transactions
  ADD COLUMN reason VARCHAR(60) NULL,
  ADD COLUMN note VARCHAR(255) NULL;
