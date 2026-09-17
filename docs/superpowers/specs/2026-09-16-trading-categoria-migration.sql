-- Migración: agrega categoria (Cultura / Beneficios / Procesos / Seguridad /
-- Normativa) al material informativo de "Infórmate", requerida por los
-- chips de filtro y la tarjeta de esa pantalla (identidad visual nueva,
-- máxima fidelidad al mockup de Claude Design).
--
-- No destructiva: columna NULLABLE en tabla existente, sin backfill (el
-- material ya creado queda con `categoria` en NULL hasta que se edite y se
-- le asigne una categoría desde el formulario).

ALTER TABLE tradings ADD COLUMN categoria VARCHAR(20) NULL;
