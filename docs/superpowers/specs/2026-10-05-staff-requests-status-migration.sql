-- Migración: estado de las solicitudes personales (Portal Colaborador).
--
-- EJECUTAR ANTES de desplegar el API: `db.sync({ alter: false })` no agrega
-- columnas a tablas existentes, y el modelo ahora lee status/responded_at;
-- sin este script las consultas a request_staffs fallan con "Unknown column".

ALTER TABLE request_staffs
    ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'revision',
    ADD COLUMN responded_at DATETIME NULL;

-- Las solicitudes anteriores se generaban y enviaban sin revisión formal:
-- se marcan como aprobadas para no mostrarlas todas "En revisión".
-- Ajustar este UPDATE si Talento Humano prefiere otro criterio.
UPDATE request_staffs SET status = 'aprobada' WHERE status = 'revision';
