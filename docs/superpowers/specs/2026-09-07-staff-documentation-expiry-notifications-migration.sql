-- Migración: notificaciones de caducidad de documentos de staff.
-- Agrega el seguimiento de qué umbral de aviso (30 días, 7 días, vencido)
-- ya se notificó para cada `staff_documentation`, y así el cron job no
-- reenvía el mismo aviso todos los días.
--
-- NO se ejecuta automáticamente durante la implementación del código —
-- el usuario decide cuándo correrlo contra el ambiente correspondiente
-- (los tests usan `db.sync({ force: true })` sobre `rwinternaldb_test`,
-- que ya crea estas columnas a partir del modelo Sequelize).

ALTER TABLE staff_documentation
    ADD COLUMN notified_stage VARCHAR(20) NULL,
    ADD COLUMN notified_at DATETIME NULL;
