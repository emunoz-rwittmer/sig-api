-- Migración: "Infórmate" del Portal Colaborador — registro de contenido revisado.
--
-- NO se ejecuta automáticamente: el usuario decide cuándo correrla contra
-- cada ambiente. `db.sync({ alter: false })` crea la tabla si falta al
-- arrancar el API; este script deja el naming/tipos exactos documentados.

CREATE TABLE IF NOT EXISTS staff_trading_views (
    id INT AUTO_INCREMENT PRIMARY KEY,
    staff_id INT NOT NULL,
    trading_id INT NOT NULL,
    viewed_at DATETIME NOT NULL,
    createdAt DATETIME NOT NULL,
    updatedAt DATETIME NOT NULL,
    UNIQUE KEY uq_staff_trading_view (staff_id, trading_id),
    CONSTRAINT fk_staff_trading_views_staff FOREIGN KEY (staff_id) REFERENCES staffs(id) ON DELETE CASCADE,
    CONSTRAINT fk_staff_trading_views_trading FOREIGN KEY (trading_id) REFERENCES tradings(id) ON DELETE CASCADE
);
