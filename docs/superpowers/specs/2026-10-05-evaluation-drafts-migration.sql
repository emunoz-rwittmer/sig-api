-- Migración: borrador y comentario en las evaluaciones del Portal Colaborador.
--
-- EJECUTAR ANTES de desplegar el API: `db.sync({ alter: false })` no agrega
-- columnas a tablas existentes y el modelo ahora lee draft/comment; sin este
-- script las consultas a form_responds fallan con "Unknown column".

ALTER TABLE form_responds
    ADD COLUMN draft JSON NULL,
    ADD COLUMN comment TEXT NULL;
