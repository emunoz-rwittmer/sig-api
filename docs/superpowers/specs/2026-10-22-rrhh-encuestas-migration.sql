-- Migración: dominio RRHH "Encuestas" (tablas nuevas).
--
-- NO se ejecuta automáticamente: el usuario decide cuándo correrla contra
-- cada ambiente. `db.sync({ alter: false })` crearía las tablas ausentes al
-- arrancar; este script deja naming/tipos exactos para correrlo antes.
--
-- Anonimato: hr_survey_participations (quién) y hr_survey_responses (qué)
-- no comparten ninguna clave ni columna de fecha; los ids son UUID v4.

CREATE TABLE IF NOT EXISTS hr_surveys (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    starts_at DATE NULL,
    ends_at DATE NULL,
    active TINYINT(1) NOT NULL DEFAULT 0,
    createdAt DATETIME NOT NULL,
    updatedAt DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS hr_survey_departaments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    survey_id INT NOT NULL,
    departament_id INT NOT NULL,
    createdAt DATETIME NOT NULL,
    updatedAt DATETIME NOT NULL,
    UNIQUE KEY uq_hr_survey_departament (survey_id, departament_id),
    CONSTRAINT fk_hr_survey_departaments_survey FOREIGN KEY (survey_id) REFERENCES hr_surveys(id) ON DELETE CASCADE,
    CONSTRAINT fk_hr_survey_departaments_departament FOREIGN KEY (departament_id) REFERENCES departaments(id)
);

CREATE TABLE IF NOT EXISTS hr_survey_questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    survey_id INT NOT NULL,
    statement TEXT NOT NULL,
    type VARCHAR(30) NOT NULL,
    required TINYINT(1) NOT NULL DEFAULT 1,
    scale_min TINYINT UNSIGNED NULL,
    scale_max TINYINT UNSIGNED NULL,
    sort_order INT NOT NULL DEFAULT 0,
    createdAt DATETIME NOT NULL,
    updatedAt DATETIME NOT NULL,
    CONSTRAINT fk_hr_survey_questions_survey FOREIGN KEY (survey_id) REFERENCES hr_surveys(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS hr_survey_options (
    id INT AUTO_INCREMENT PRIMARY KEY,
    question_id INT NOT NULL,
    text VARCHAR(500) NOT NULL,
    score DECIMAL(6,2) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    createdAt DATETIME NOT NULL,
    updatedAt DATETIME NOT NULL,
    CONSTRAINT fk_hr_survey_options_question FOREIGN KEY (question_id) REFERENCES hr_survey_questions(id) ON DELETE CASCADE
);

-- Sin columnas de fecha (anonimato): evita correlacionar participación y respuesta por hora.
CREATE TABLE IF NOT EXISTS hr_survey_participations (
    id CHAR(36) NOT NULL PRIMARY KEY,
    survey_id INT NOT NULL,
    staff_id INT NOT NULL,
    departament_id INT NOT NULL,
    UNIQUE KEY uq_hr_survey_participation_staff (survey_id, staff_id),
    CONSTRAINT fk_hr_survey_participations_survey FOREIGN KEY (survey_id) REFERENCES hr_surveys(id) ON DELETE CASCADE,
    CONSTRAINT fk_hr_survey_participations_staff FOREIGN KEY (staff_id) REFERENCES staffs(id),
    CONSTRAINT fk_hr_survey_participations_departament FOREIGN KEY (departament_id) REFERENCES departaments(id)
);

-- Sin staff_id ni fechas.
CREATE TABLE IF NOT EXISTS hr_survey_responses (
    id CHAR(36) NOT NULL PRIMARY KEY,
    survey_id INT NOT NULL,
    departament_id INT NOT NULL,
    CONSTRAINT fk_hr_survey_responses_survey FOREIGN KEY (survey_id) REFERENCES hr_surveys(id) ON DELETE CASCADE,
    CONSTRAINT fk_hr_survey_responses_departament FOREIGN KEY (departament_id) REFERENCES departaments(id)
);

CREATE TABLE IF NOT EXISTS hr_survey_answers (
    id CHAR(36) NOT NULL PRIMARY KEY,
    response_id CHAR(36) NOT NULL,
    question_id INT NOT NULL,
    option_id INT NULL,
    score DECIMAL(6,2) NULL,
    text TEXT NULL,
    CONSTRAINT fk_hr_survey_answers_response FOREIGN KEY (response_id) REFERENCES hr_survey_responses(id) ON DELETE CASCADE,
    CONSTRAINT fk_hr_survey_answers_question FOREIGN KEY (question_id) REFERENCES hr_survey_questions(id) ON DELETE CASCADE,
    CONSTRAINT fk_hr_survey_answers_option FOREIGN KEY (option_id) REFERENCES hr_survey_options(id) ON DELETE SET NULL
);
