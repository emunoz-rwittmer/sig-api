-- Migración: clasificación del personal en administrativo / operativo
-- (usada por la reportería de encuestas). Nullable: el personal existente
-- queda sin clasificar hasta que RRHH lo edite desde el formulario de staff.
--
-- NO se ejecuta automáticamente (`db.sync` está con alter:false): correrlo
-- contra el ambiente correspondiente.

ALTER TABLE staffs
    ADD COLUMN staff_type ENUM('administrativo', 'operativo') NULL AFTER contract_type;
