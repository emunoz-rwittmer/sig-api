-- Migración: el stock a bordo de un requerimiento puede quedar sin declarar.
--
-- No destructiva: solo permite NULL en una columna existente. Los requerimientos
-- anteriores conservan su valor (0 incluido). Desde ahora NULL = "no lo contó" y
-- un número = conteo real, que pasa a ser el stock de la bodega del yate.
-- Ejecutar antes de desplegar el backend.

ALTER TABLE request_items MODIFY stock INT NULL;
