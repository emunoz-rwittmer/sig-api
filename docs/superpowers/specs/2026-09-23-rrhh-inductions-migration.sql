-- Migración: dominio RRHH "Inducciones" (tablas nuevas).
-- Ver docs/superpowers/specs/2026-09-23-rrhh-inductions-design.md
--
-- NO se ejecuta automáticamente: el usuario decide cuándo correrla contra
-- cada ambiente. `db.sync({ alter: false })` no altera tablas existentes,
-- pero SÍ crea tablas nuevas ausentes al arrancar el API (CREATE TABLE IF
-- NOT EXISTS) — este script deja el naming/tipos exactos documentados y
-- listos para correr manualmente antes de ese primer arranque en cada
-- ambiente, evitando depender del auto-create implícito de Sequelize.

CREATE TABLE IF NOT EXISTS inductions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    passing_score TINYINT UNSIGNED NOT NULL DEFAULT 70,
    max_attempts TINYINT UNSIGNED NOT NULL DEFAULT 3,
    active TINYINT(1) NOT NULL DEFAULT 1,
    createdAt DATETIME NOT NULL,
    updatedAt DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS induction_companies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    induction_id INT NOT NULL,
    company_id INT NOT NULL,
    createdAt DATETIME NOT NULL,
    updatedAt DATETIME NOT NULL,
    UNIQUE KEY uq_induction_company (induction_id, company_id),
    CONSTRAINT fk_induction_companies_induction FOREIGN KEY (induction_id) REFERENCES inductions(id) ON DELETE CASCADE,
    CONSTRAINT fk_induction_companies_company FOREIGN KEY (company_id) REFERENCES companies(id)
);

CREATE TABLE IF NOT EXISTS induction_materials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    induction_id INT NOT NULL,
    kind VARCHAR(10) NOT NULL DEFAULT 'file',
    title VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    mime_type VARCHAR(120) NULL,
    sort_order INT NOT NULL DEFAULT 0,
    createdAt DATETIME NOT NULL,
    updatedAt DATETIME NOT NULL,
    CONSTRAINT fk_induction_materials_induction FOREIGN KEY (induction_id) REFERENCES inductions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS induction_questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    induction_id INT NOT NULL,
    statement TEXT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    createdAt DATETIME NOT NULL,
    updatedAt DATETIME NOT NULL,
    CONSTRAINT fk_induction_questions_induction FOREIGN KEY (induction_id) REFERENCES inductions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS induction_options (
    id INT AUTO_INCREMENT PRIMARY KEY,
    question_id INT NOT NULL,
    text VARCHAR(500) NOT NULL,
    is_correct TINYINT(1) NOT NULL DEFAULT 0,
    sort_order INT NOT NULL DEFAULT 0,
    createdAt DATETIME NOT NULL,
    updatedAt DATETIME NOT NULL,
    CONSTRAINT fk_induction_options_question FOREIGN KEY (question_id) REFERENCES induction_questions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS induction_progress (
    id INT AUTO_INCREMENT PRIMARY KEY,
    induction_id INT NOT NULL,
    staff_id INT NOT NULL,
    material_viewed_at DATETIME NULL,
    extra_attempts INT NOT NULL DEFAULT 0,
    createdAt DATETIME NOT NULL,
    updatedAt DATETIME NOT NULL,
    UNIQUE KEY uq_induction_progress_staff (induction_id, staff_id),
    CONSTRAINT fk_induction_progress_induction FOREIGN KEY (induction_id) REFERENCES inductions(id) ON DELETE CASCADE,
    CONSTRAINT fk_induction_progress_staff FOREIGN KEY (staff_id) REFERENCES staffs(id)
);

CREATE TABLE IF NOT EXISTS induction_attempts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    induction_id INT NOT NULL,
    staff_id INT NOT NULL,
    correct_count INT NOT NULL,
    total_questions INT NOT NULL,
    score DECIMAL(5,2) NOT NULL,
    passed TINYINT(1) NOT NULL DEFAULT 0,
    answers JSON NULL,
    createdAt DATETIME NOT NULL,
    updatedAt DATETIME NOT NULL,
    CONSTRAINT fk_induction_attempts_induction FOREIGN KEY (induction_id) REFERENCES inductions(id) ON DELETE CASCADE,
    CONSTRAINT fk_induction_attempts_staff FOREIGN KEY (staff_id) REFERENCES staffs(id)
);
