-- Migración: agrega clase (categoría de embarcación, ej. "Yate de
-- expedición", "Catamarán") y matrícula (número de registro) al catálogo
-- de yates, requeridos por la tarjeta de la pantalla de Yates (identidad
-- visual nueva, máxima fidelidad al mockup de Claude Design).
--
-- No destructiva: columnas NULLABLE en tabla existente, sin backfill (los
-- 4 yates ya creados quedan con `clase`/`matricula` en NULL hasta que se
-- editen y se les asigne un valor desde el formulario).

ALTER TABLE yachts ADD COLUMN clase VARCHAR(60) NULL;
ALTER TABLE yachts ADD COLUMN matricula VARCHAR(60) NULL;
