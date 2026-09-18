-- Migración: agrega el tipo de evaluación (Desempeño / Liderazgo /
-- Administrativa / Operativa) a los formularios, usado por el badge de
-- color en la pantalla de Formularios de evaluación (identidad visual).
--
-- No destructiva: columna NULLABLE en tabla existente, sin backfill. Los
-- formularios creados antes de esta migración quedan con `type` en NULL
-- hasta que se editen y guarden; mientras tanto el frontend deriva la
-- etiqueta/color a partir de `isAdministrative` (ver `formType.js`,
-- `getFormTypeLabel`). `isAdministrative` se sigue escribiendo en paralelo
-- a `type` al guardar (Administrativa/Operativa -> true, Desempeño/
-- Liderazgo -> false) porque el filtro `tipoEvaluacion` del módulo de
-- Desempeño (`CapitanesPage`, `getPersonas`) todavía lo usa.

ALTER TABLE forms ADD COLUMN type VARCHAR(20) NULL;
