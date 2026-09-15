-- Migración: agrega campos de identidad visual/organigrama usados por las
-- pantallas de Áreas y Cargos reskineadas en interno-react (código,
-- descripción y responsable de un área; área y nivel jerárquico de un
-- cargo).
--
-- No destructiva: columnas NULLABLE en tablas existentes, sin backfill.
-- `responsible_staff_id` y `departament_id` son FKs opcionales
-- (ON DELETE SET NULL) — no bloquean borrar un colaborador o un área
-- existente. La tabla de staff se llama `staff` (singular), no `staffs`.

ALTER TABLE departaments ADD COLUMN code VARCHAR(50) NULL;
ALTER TABLE departaments ADD COLUMN description TEXT NULL;
ALTER TABLE departaments ADD COLUMN responsible_staff_id INT NULL;
ALTER TABLE departaments ADD CONSTRAINT fk_departaments_responsible_staff
    FOREIGN KEY (responsible_staff_id) REFERENCES staff(id) ON DELETE SET NULL;

ALTER TABLE positions ADD COLUMN departament_id INT NULL;
ALTER TABLE positions ADD CONSTRAINT fk_positions_departament
    FOREIGN KEY (departament_id) REFERENCES departaments(id) ON DELETE SET NULL;
ALTER TABLE positions ADD COLUMN level VARCHAR(20) NULL;
