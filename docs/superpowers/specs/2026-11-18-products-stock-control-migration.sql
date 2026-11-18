-- Migración: productos sin control de stock y productos fusionados.
--
-- No destructiva: dos columnas en una tabla existente; todos los productos
-- quedan con control de stock (1) y sin fusión (NULL), igual que hoy.
-- Ejecutar antes de desplegar el backend: `db.sync({ alter: false })` no crea
-- columnas en tablas que ya existen.

ALTER TABLE products
  ADD COLUMN controls_stock TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN merged_into_id INT NULL;
