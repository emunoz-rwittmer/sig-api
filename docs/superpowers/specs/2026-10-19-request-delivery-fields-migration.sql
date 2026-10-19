-- Migración: agrega al requerimiento de yate los datos del nuevo formulario
-- (puerto de entrega, fecha requerida y nota para bodega).
--
-- No destructiva: tres columnas NULLABLE en una tabla existente. Los
-- requerimientos anteriores quedan con NULL y siguen funcionando sin backfill.
-- Ejecutar antes de desplegar el backend: `db.sync({ alter: false })` no crea
-- columnas en tablas que ya existen.

ALTER TABLE requests ADD COLUMN delivery_port VARCHAR(100) NULL;
ALTER TABLE requests ADD COLUMN required_date DATE NULL;
ALTER TABLE requests ADD COLUMN note TEXT NULL;

-- Índices para el listado filtrado por año y yate (GET /requests/search).
-- request_items.request_id ya tiene índice.
ALTER TABLE requests ADD INDEX idx_requests_warehouse_created (warehouse_id, createdAt);
ALTER TABLE requests ADD INDEX idx_requests_created (createdAt);
