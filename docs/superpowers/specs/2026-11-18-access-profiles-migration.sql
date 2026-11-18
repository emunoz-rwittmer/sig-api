-- Migración: perfiles de acceso (módulo Accesos).
--
-- No destructiva: una tabla nueva y una columna NULLABLE en users y staffs.
-- Sin perfil asignado (NULL) cada persona sigue rigiéndose por su rol, igual que hoy.
-- Ejecutar antes de desplegar el backend: `db.sync({ alter: false })` crea la tabla
-- nueva, pero no agrega columnas a tablas que ya existen.

CREATE TABLE IF NOT EXISTS access_profiles (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(80) NOT NULL,
  description VARCHAR(255) NULL,
  permissions JSON NOT NULL,
  warehouse_ids JSON NULL,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY access_profiles_name (name)
);

ALTER TABLE users ADD COLUMN access_profile_id INT NULL;
ALTER TABLE staffs ADD COLUMN access_profile_id INT NULL;
