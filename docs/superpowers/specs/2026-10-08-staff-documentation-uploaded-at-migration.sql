-- Migración: fecha y hora de subida del documento de staff.
-- `created_at` solo marca cuándo se creó el registro (vacío, status pending) y
-- `updated_at` cambia también con el cron de notificaciones, así que se guarda
-- aparte el momento real en que el colaborador sube el archivo.
--
-- NO se ejecuta automáticamente: correrlo contra el ambiente correspondiente.

ALTER TABLE staff_documentation
    ADD COLUMN uploaded_at DATETIME NULL AFTER expiry_date;

-- Relleno aproximado para archivos ya subidos (mejor dato disponible).
UPDATE staff_documentation
   SET uploaded_at = updated_at
 WHERE file IS NOT NULL
   AND uploaded_at IS NULL;
