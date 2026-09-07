-- Migración: reconstrucción del dominio de mantenimiento desde cero.
-- Ver docs/superpowers/specs/2026-09-07-maintenance-historial-design.md
--
-- ADVERTENCIA: este script borra las tablas viejas del dominio de
-- mantenimiento SIN migrar sus datos (decisión explícita: se parte en
-- limpio). NO se ejecuta automáticamente durante la implementación del
-- código — el usuario decide cuándo correrlo contra producción.

-- 1) DROP de las tablas viejas (nombres reales en BD, ya pluralizados
--    por Sequelize)
DROP TABLE IF EXISTS maintenance_materials;
DROP TABLE IF EXISTS maintenances;
DROP TABLE IF EXISTS maintenancerules_parts;
DROP TABLE IF EXISTS maintenance_rules;
DROP TABLE IF EXISTS yacht_parts;

-- 2) CREATE de las tablas nuevas

CREATE TABLE yacht_equipments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    yacht_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    marca VARCHAR(255) NULL,
    modelo VARCHAR(255) NULL,
    numero_serie VARCHAR(255) NULL,
    potencia VARCHAR(255) NULL,
    rpm VARCHAR(255) NULL,
    active TINYINT(1) DEFAULT 1,
    createdAt DATETIME NOT NULL,
    updatedAt DATETIME NOT NULL,
    CONSTRAINT fk_yacht_equipments_yacht FOREIGN KEY (yacht_id) REFERENCES yachts(id)
);

CREATE TABLE maintenance_rules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    periodicity_value FLOAT NULL,
    periodicity_unit VARCHAR(255) NULL,
    instructions TEXT NULL,
    active TINYINT(1) DEFAULT 1,
    createdAt DATETIME NOT NULL,
    updatedAt DATETIME NOT NULL
);

CREATE TABLE maintenance_rule_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    equipment_id INT NOT NULL,
    rule_id INT NOT NULL,
    active TINYINT(1) DEFAULT 1,
    createdAt DATETIME NOT NULL,
    updatedAt DATETIME NOT NULL,
    UNIQUE KEY uq_equipment_rule (equipment_id, rule_id),
    CONSTRAINT fk_mra_equipment FOREIGN KEY (equipment_id) REFERENCES yacht_equipments(id),
    CONSTRAINT fk_mra_rule FOREIGN KEY (rule_id) REFERENCES maintenance_rules(id)
);

CREATE TABLE maintenance_rule_materials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rule_id INT NOT NULL,
    product_id INT NOT NULL,
    recommended_quantity INT NOT NULL,
    createdAt DATETIME NOT NULL,
    updatedAt DATETIME NOT NULL,
    CONSTRAINT fk_mrm_rule FOREIGN KEY (rule_id) REFERENCES maintenance_rules(id),
    CONSTRAINT fk_mrm_product FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE maintenance_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    equipment_id INT NOT NULL,
    yacht_id INT NOT NULL,
    rule_id INT NULL,
    responsable VARCHAR(255) NOT NULL,
    work_performed TEXT NOT NULL,
    performed_at DATETIME NOT NULL,
    hours_reading FLOAT NULL,
    observation TEXT NULL,
    approved_by VARCHAR(255) NULL,
    approved_at DATETIME NULL,
    createdAt DATETIME NOT NULL,
    updatedAt DATETIME NOT NULL,
    CONSTRAINT fk_mr_equipment FOREIGN KEY (equipment_id) REFERENCES yacht_equipments(id),
    CONSTRAINT fk_mr_yacht FOREIGN KEY (yacht_id) REFERENCES yachts(id),
    CONSTRAINT fk_mr_rule FOREIGN KEY (rule_id) REFERENCES maintenance_rules(id)
);

CREATE TABLE maintenance_record_materials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    record_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    createdAt DATETIME NOT NULL,
    updatedAt DATETIME NOT NULL,
    CONSTRAINT fk_mrecm_record FOREIGN KEY (record_id) REFERENCES maintenance_records(id),
    CONSTRAINT fk_mrecm_product FOREIGN KEY (product_id) REFERENCES products(id)
);
