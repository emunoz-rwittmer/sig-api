# Diseño — Rediseño del dashboard de Indicadores

## Contexto

Máxima fidelidad al mockup de Claude Design "Rediseño profesional y
moderno" (`Gestion de Personal.dc.html`, estados `indMain`/`indMetricas`/
`indProcesos`). El dominio de datos (`Process`/`Indicator`/`Formula`/
`Tabulation`) ya existía y se preserva casi intacto — el cálculo real de
`percent` sigue evaluando `Indicator.formulaId` vía `mathjs`, sin cambios.
Ver `2026-09-23-indicators-redesign-migration.sql` para el DDL completo.

## Qué cambia

- `indicators.subprocess` (nullable) — sub-agrupación libre dentro del
  proceso, solo metadata de UI.
- `indicators.num_label` / `indicators.den_label` (nullable) — etiquetas
  del numerador/denominador para el gráfico y la tabla de la pantalla de
  métricas. No participan en el cálculo; antes el front intentaba
  derivarlas parseando con regex el texto libre de `indicators.formula`.
- `tabulations.period_month` / `tabulations.period_year` (nullable) —
  periodo que mide el dato, independiente de `createdAt` (cuándo se
  registró). Filas históricas quedan en `NULL`; el gráfico mensual
  simplemente las omite hasta que se vuelvan a cargar con periodo.
- `GET /indicators/all` (nuevo) — todos los indicadores de todos los
  procesos en una sola llamada, con `Process`/`Departaments`/`Formula`/
  `Tabulation` incluidos. El dashboard filtra y agrupa **client-side**
  (proceso, tipo, búsqueda, "solo bajo meta"), mismo patrón que
  `regulations`/`inductions` — antes traía los indicadores de un proceso
  a la vez.
- `indicators.controller.js` y `proces.controller.js` retrofiteados al
  contrato `AppError`/`next(error)` (antes `res.status(400/500).json(error.message)`
  sin `AppError`); se limpiaron los `try/catch` redundantes en ambos
  `.services.js` (`no-useless-catch`).

## Fuera de alcance

- No se tocó el catálogo `Formula` ni la evaluación `mathjs` — sigue
  siendo la fuente de verdad de `percent`.
- El gráfico secundario "Volumen atendido" (barras duales numerador/
  denominador) del mockup no se implementó en el front — deuda visual
  reconocida, documentada en el README de `interno-react`.
- `Impact`/`Levels`/`Probability`/`Strategy` (matriz de riesgos) son un
  dominio aparte, no tocado.
