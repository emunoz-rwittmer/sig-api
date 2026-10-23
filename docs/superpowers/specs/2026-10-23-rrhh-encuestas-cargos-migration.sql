-- Migración: Encuestas RRHH pasan de asignarse por departamento a asignarse por cargo.
--
-- NO se ejecuta automáticamente. Correrla en cada ambiente que ya tenga la
-- tabla hr_survey_departaments, ANTES de desplegar la API nueva (o justo
-- después: `db.sync({ alter: false })` crea hr_survey_positions vacía al
-- arrancar, y el CREATE de abajo es IF NOT EXISTS).
--
-- Qué hace:
--   1. Crea hr_survey_positions.
--   2. Cada encuesta queda asignada a todos los cargos de los departamentos
--      que tenía asignados (mismo alcance que antes).
--   3. Elimina hr_survey_departaments.
--
-- No toca hr_survey_participations ni hr_survey_responses: siguen guardando el
-- departamento de quien respondió, porque los resultados se tabulan por departamento.

START TRANSACTION;

CREATE TABLE IF NOT EXISTS hr_survey_positions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    survey_id INT NOT NULL,
    position_id INT NOT NULL,
    createdAt DATETIME NOT NULL,
    updatedAt DATETIME NOT NULL,
    UNIQUE KEY uq_hr_survey_position (survey_id, position_id),
    CONSTRAINT fk_hr_survey_positions_survey FOREIGN KEY (survey_id) REFERENCES hr_surveys(id) ON DELETE CASCADE,
    CONSTRAINT fk_hr_survey_positions_position FOREIGN KEY (position_id) REFERENCES positions(id)
);

INSERT IGNORE INTO hr_survey_positions (survey_id, position_id, createdAt, updatedAt)
SELECT d.survey_id, p.id, NOW(), NOW()
FROM hr_survey_departaments d
JOIN positions p ON p.departament_id = d.departament_id;

COMMIT;

-- Revisar antes de borrar: encuestas que quedaron sin cargos (departamentos sin cargos).
SELECT s.id, s.name
FROM hr_surveys s
WHERE EXISTS (SELECT 1 FROM hr_survey_departaments d WHERE d.survey_id = s.id)
  AND NOT EXISTS (SELECT 1 FROM hr_survey_positions sp WHERE sp.survey_id = s.id);

-- DDL (MySQL hace commit implícito): correr cuando la consulta anterior esté revisada.
DROP TABLE IF EXISTS hr_survey_departaments;
