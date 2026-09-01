# Dashboard de Desempeño de Tripulación (in-house) — Design

## Contexto y motivación

El reporte "Desempeño 2024-2026" de embarcaciones se armaba manualmente en un Excel (`reporte/Reporte General Desempeño Embarcaciones.xlsx`) consumido por un `.pbix` de Power BI. Ya existe en `interno-api` una integración parcial de Power BI (PR #19, merged) que expone un endpoint de embed y uno de dataset para refresco programado — pero requiere un Service Principal de Azure AD que aún no ha sido provisto por IT, y bloqueó el avance.

Decisión: en vez de esperar esas credenciales y depender de licencias/infraestructura de Power BI, el dashboard se dibuja in-house. El backend expone endpoints de agregación ya calculados (compliance, promedios, series mensuales) y el frontend (`interno-react`) los pinta con `react-apexcharts`, librería que **ya es dependencia** del proyecto y que ya tiene un patrón establecido en `src/components/dashboard/Charts/ChartOne.jsx` (áreas/líneas por año, selector de año con botones, Tailwind).

Este documento reemplaza la necesidad de completar `docs/superpowers/specs/2026-08-24-surveys-powerbi-reporting-design.md` (repo `interno-react`) y el plan `docs/superpowers/plans/2026-08-25-surveys-powerbi-reporting-backend.md` (este repo) para el dominio de evaluaciones de tripulación.

## Alcance de esta iteración

**Fuente de verdad, verificada directamente contra los archivos originales:**
- **Diseño visual** (qué gráficos/tablas mostrar, por qué página): `reporte/Reporte Desempeño.pbix` (10 páginas). Este spec traduce el diseño de esas páginas a los 4 endpoints — no se inventan vistas nuevas ni se asume el patrón genérico de `ChartOne.jsx` por defecto.
- **Data**: exclusivamente la hoja **"General Tripulación"** del Excel (`reporte/Reporte General Desempeño Embarcaciones.xlsx`), cuya tabla es `Report_General_Final` (columnas: Formulario, Evaluador, Evaluado, Función, Área, Yate, Año, Trimestre, Fecha Final, Estatus Evaluación, Pregunta 1-10, Puntuación, Estado...). Las demás hojas del libro (`Completo 2024`, `Comment_Cards`, `Comentarios_Agencias`, `REPORTE ANTIGUO - 2025`) NO alimentan ninguno de los 4 endpoints de este spec.

**Dentro de alcance — mapeo página pbix → vista/endpoint:**

| Página pbix | Vista/endpoint |
|---|---|
| Desempeño Barco - Año | `overview` (3.1) |
| Barco - Capitán | `personas` (3.3), filtrada por `funcion` |
| Liderazgo - Capitanes Ítems | `preguntas` (3.4) |
| Desempeño Individual - Año | `personas` (3.3) |
| Cumplimiento - Individual | `personas` (3.3) |
| Desempeño individual 360 | `personas` (3.3) |

(`yates`, 3.2, generaliza el patrón de la página "Desempeño Barco 2026" sin fijar el año — ver nota al final de 3.2.)

- Diseño completo (backend + frontend) documentado en este spec.
- **Implementación en esta sesión: solo el backend** (`interno-api`) — los 4 endpoints de agregación y la limpieza del código Power BI en este repo.
- El diseño de frontend (componentes, contrato de datos que consumen) queda documentado aquí para una sesión posterior en `interno-react`.

**Fuera de alcance (explícitamente, no ahora) — páginas del pbix que NO se replican:**
- **"Desempeño Barco 2026"**: es la misma información de `yates` (3.2) pero con el filtro de año fijado a 2026 en el mockup; `yates` ya la generaliza sin asumir "año actual" (ver nota en 3.2), así que no se construye como vista separada.
- **"Comment Cards 2026"** (hoja `Comment_Cards`): Comment Cards de pasajeros, dominio ya existe en `comentCard.*`, pero no se toca en este plan.
- **"Reclamo Agencias 2026"** (hoja `Comentarios_Agencias`): no hay módulo de "reclamos de agencia" identificado en el backend — requeriría su propio spec, y su data no vive en "General Tripulación".
- **"Bonos - Trimestre 2026"** (hoja `Completo 2024`, tabla `Report_Gen324`): datos de compensación (`Bono Puntuación`, `Monto`, `Observación`) cargados manualmente, no derivables de `FormRespond`/`FormAnswers` ni de "General Tripulación". Fuera de alcance por la misma razón que Reclamos de Agencias — requeriría su propio spec y su propia fuente de datos.
- Implementación del frontend (`interno-react`) — queda para otra sesión, usando el diseño de la sección 5 como contrato.

## 1. Métricas — definiciones verificadas contra el Excel fuente

- **Calificación** de una evaluación = promedio de `asignarPuntaje(respuesta)` (`src/utils/surveyScoring.js`) sobre las respuestas numéricas de Pregunta1–9. Pregunta10 es texto libre (comentario) y no entra al promedio.
- **Compliance %** = `Completadas / (Completadas + Caducadas)`, redondeado a entero. Verificado contra los 3 KPI del Excel:
  - 2024: 753 / (753+148) = 83.6% → 84%
  - 2025: 1981 / (1981+331) = 85.7% → 86%
  - 2026: 1025 / (1025+104) = 90.8% → 91%
- **Completadas / Caducadas** = conteo de `FormRespond` con `state = 'Completada'` / `state = 'Caducada'` respectivamente, dentro del rango filtrado.
- **Competencias por pregunta** (vista Preguntas: "Supervisión Cubierta", "Comunicación Clara", etc.): en vez de hardcodear estos 9 nombres, se usa el `title` real de cada `FormQuestion` del formulario correspondiente (orden 1–9). Si el formulario cambia sus títulos de pregunta, el dashboard se actualiza sin cambio de código.
- **Trimestre** = derivado de `updatedAt`/`createdAt` de la evaluación (Q1=ene-mar, Q2=abr-jun, Q3=jul-sep, Q4=oct-dic), igual convención que la columna "Trimestre" del pivot cache original.

## 2. Contrato de datos — convención general

Para evitar ambigüedad, **ningún endpoint usa claves dinámicas a nivel de objeto** (p.ej. no `{"2024": 4.37, "2025": 4.32}`). Todo desglose por año/mes/competencia es un arreglo de objetos con una clave explícita:

- Series de tiempo (para gráficas): `{ categories: string[], series: [{ name: string, data: number[] }] }` — mapea 1:1 al formato que espera `ReactApexChart`.
- Tablas (para vistas de persona/pregunta): arreglo de filas, cada fila con un arreglo `valores: [{ etiqueta: string, valor: number }]` en vez de columnas dinámicas.

Todos los `valor`/`calificacion` son `number | null` (null = sin datos, nunca 0 falso). Todos los porcentajes van en escala 0-100 (no 0-1, no string con "%").

## 3. Endpoints backend

Mount: `/api/reports/desempeno/*`. Auth: `authJwt.verifyToken` + `authJwt.hasAnyRole(DESEMPENO_DASHBOARD_ROLES)`, mismos roles que tenía el embed de Power BI: `['admin', 'psicologos', 'gerencia_gps', 'gerencia_uio']`.

### 3.1 `GET /reports/desempeno/overview`
Query: `yate?` (id o nombre del yate; sin filtro = todos).

```json
{
  "years": [2024, 2025, 2026],
  "kpisByYear": [
    { "year": 2024, "calificacion": 4.36, "compliancePercent": 84, "completadas": 753, "caducadas": 148 }
  ],
  "monthlyCalificacion": {
    "categories": ["enero", "febrero", "...", "diciembre"],
    "series": [{ "name": "2024", "data": [4.37, 4.40, null] }]
  },
  "monthlyCompliance": {
    "categories": ["enero", "...", "diciembre"],
    "series": [{ "name": "2024", "data": [0, 0, 100] }]
  }
}
```

### 3.2 `GET /reports/desempeno/yates`
Query: `yate?` (filtra `kpis`; `avgByYate` y `monthlyCalificacionByYate` siempre muestran los 4 yates).

`monthlyCalificacion`/`monthlyCompliance` usan el **mismo shape multi-año que `overview`** (una serie por año, no una sola línea) — el mockup de Power BI mostraba una sola línea porque tenía el filtro de año fijo en la última pantalla capturada (página "Desempeño Barco 2026" del pbix), pero el backend no asume "año actual"; el frontend decide qué año(s) graficar con la data completa. Por esto no se replica "Desempeño Barco 2026" como vista separada (ver sección "Alcance") — este endpoint ya la generaliza.

```json
{
  "avgByYate": [{ "yate": "Tip Top V", "calificacion": 4.7 }],
  "kpis": { "completadas": 1019, "caducadas": 98, "calificacion": 4.74, "compliancePercent": 91 },
  "monthlyCalificacion": { "categories": [...], "series": [{ "name": "2026", "data": [...] }] },
  "monthlyCompliance": { "categories": [...], "series": [{ "name": "2026", "data": [...] }] },
  "monthlyCalificacionByYate": [
    { "yate": "Koln", "categories": [...], "series": [{ "name": "2026", "data": [...] }] }
  ]
}
```

### 3.3 `GET /reports/desempeno/personas`
Query: `yate?`, `evaluado?`, `funcion?`, `area?`, `anio?`.

Este endpoint cubre 4 páginas del pbix ("Barco - Capitán", "Desempeño Individual - Año", "Cumplimiento - Individual", "Desempeño individual 360"), todas con los mismos filtros base (Evaluado/Función/Área/Yate/Año vía slicers) mirando el mismo universo de datos desde ángulos distintos — por eso comparten un solo endpoint en vez de cuatro. `funcion=Capitán` reproduce el filtro fijo de la página "Barco - Capitán".

`kpisByYear` y `kpis` reutilizan el shape de `overview`/`yates` (no se inventa un shape nuevo por vista): `kpisByYear` alimenta las cards por año de "Desempeño Individual - Año"; `kpis` (agregado sobre el filtro actual, sin desglose por año) alimenta las cards de "Barco - Capitán" y "Desempeño individual 360" — incluye `calificacionMax`/`calificacionMin`, que no existían en la versión anterior de este contrato. `avgByYate` y `monthlyCalificacionByYate` reusan el shape de `yates` (3.2) para la página "Barco - Capitán" (columnChart Puntuación×Yate, lineChart Calificación×Mes×Yate). `monthlyCalificacion`/`monthlyCompliance` reusan el shape multi-año de `overview` para los lineChart de "Desempeño Individual - Año" y "Cumplimiento - Individual".

```json
{
  "kpisByYear": [
    { "year": 2024, "calificacion": 4.36, "compliancePercent": 84, "completadas": 753, "caducadas": 148 }
  ],
  "kpis": { "calificacion": 4.74, "calificacionMax": 5.0, "calificacionMin": 2.8, "compliancePercent": 91, "completadas": 1019, "caducadas": 98 },
  "avgByYate": [{ "yate": "Tip Top V", "calificacion": 4.7 }],
  "monthlyCalificacion": { "categories": [...], "series": [{ "name": "2026", "data": [...] }] },
  "monthlyCompliance": { "categories": [...], "series": [{ "name": "2026", "data": [...] }] },
  "monthlyCalificacionByYate": [
    { "yate": "Koln", "categories": [...], "series": [{ "name": "2026", "data": [...] }] }
  ],
  "months": [{ "month": "enero", "monthIndex": 1 }],
  "porEvaluado": [
    { "evaluado": "Fabian Narvaez Benavidez", "porMes": [{ "month": "enero", "monthIndex": 1, "valor": 4.89 }], "total": 4.77 }
  ],
  "porEvaluadorMensual": [
    { "evaluador": "Allan Guillermo Palma Quiroz", "porMes": [{ "month": "enero", "monthIndex": 1, "valor": 100 }], "total": 75 }
  ],
  "porEvaluadorTrimestre": [
    { "evaluador": "Richard Alexander Mejia Chele", "porTrimestre": [{ "trimestre": "Q1", "valor": 3.53 }], "total": 3.53 }
  ],
  "comentarios": [
    { "evaluado": "...", "evaluador": "...", "texto": "El capitán le falta un curso de relación humana." }
  ]
}
```
`porEvaluadorMensual.valor` y `.total` son compliance % (0-100), no calificación. `porEvaluado`, `porEvaluadorMensual` y `porEvaluadorTrimestre` no cambian respecto a la versión anterior de este contrato — ya cubrían, respectivamente, los pivots por Evaluado×Mes de "Desempeño individual 360", por Evaluador×Mes de "Cumplimiento - Individual" y por Evaluador×Trimestre de "Desempeño individual 360".

### 3.4 `GET /reports/desempeno/preguntas`
Query: `evaluado?`, `funcion?`, `anio?`.

Cubre la página "Liderazgo - Capitanes Ítems" del pbix, que tiene dos pivots: uno por Evaluador (ya cubierto por `porEvaluador`, sin cambios) y uno por Función×Mes (`porFuncionMes`, nuevo — antes no estaba en el contrato). El pivot original agrupa filas por Año+Mes, no solo por Mes; para no mezclar años distintos bajo el mismo mes cuando `anio` no se filtra, `porMes` y `porFuncionMes.porMes` ahora incluyen `year` explícito en cada fila (antes `porMes` no lo tenía — era ambiguo con más de un año de data).

```json
{
  "competencias": ["Supervisión Cubierta", "Comunicación Clara"],
  "porMes": [
    { "year": 2026, "month": "enero", "monthIndex": 1, "valores": [{ "etiqueta": "Supervisión Cubierta", "valor": 4.70 }] }
  ],
  "porFuncionMes": [
    {
      "funcion": "Capitán",
      "porMes": [
        { "year": 2026, "month": "enero", "monthIndex": 1, "valores": [{ "etiqueta": "Supervisión Cubierta", "valor": 4.70 }] }
      ]
    }
  ],
  "porEvaluador": [
    { "evaluador": "Richard Alexander Mejia Chele", "valores": [{ "etiqueta": "Supervisión Cubierta", "valor": 3.44 }], "calificacion": 3.53 }
  ]
}
```

## 4. Componentes backend

| Archivo | Responsabilidad |
|---|---|
| `src/services/reports/desempenoDashboard.services.js` | Toda la lógica de agregación: compliance, promedios, agrupación por mes/año/yate/competencia. Reutiliza `EvaluationService.getEvaluationsByCompany`, `asignarPuntaje`, `Staffervice.getPositionsByFullNames`. Expone 4 funciones, una por vista: `getOverview(yate?)`, `getYates(yate?)`, `getPersonas(filters)`, `getPreguntas(filters)`. |
| `src/controllers/reports/desempenoDashboard.controller.js` | Handlers HTTP delgados, uno por endpoint, mismo patrón que `powerbi.controller.js` (try/catch → `next(error)`). |
| `src/routes/reports/reports.routes.js` | Modificado: se agregan las 4 rutas nuevas con `authJwt.verifyToken` + `authJwt.hasAnyRole(DESEMPENO_DASHBOARD_ROLES)` y sus bloques `@openapi`. |

Sin tabla ni endpoint nuevo en base de datos — todo se calcula al vuelo sobre `FormRespond`/`FormAnswers` igual que hoy.

## 5. Diseño de frontend (contrato para implementación futura en `interno-react`)

- 4 páginas bajo `src/containers/operations/surveys/reporting/desempeno/`: `OverviewPage.jsx`, `YatesPage.jsx`, `PersonasPage.jsx`, `PreguntasPage.jsx`, reemplazando la entrada de menú que hoy apunta a `EvaluationReportPowerBI.jsx`.
- Cada página trae su(s) `ChartX.jsx` con `react-apexcharts`, siguiendo la convención de `ChartOne.jsx`: `type: 'line'` para tendencias mensuales (una serie por año o por yate), `type: 'bar'` para el promedio por yate, tablas HTML con Tailwind para los pivots (Personas y Preguntas).
- **Corrección sobre la versión anterior de este spec**: `PersonasPage.jsx` no es solo tablas — el pbix ("Barco - Capitán", "Desempeño Individual - Año", "Cumplimiento - Individual") sí tiene KPI cards y los mismos `YateBarChart`/`MonthlyLineChart` que ya existen para `YatesPage.jsx`; se reutilizan ahí en vez de crear componentes nuevos. `PreguntasPage.jsx` sí se queda solo con tablas (`DynamicValueTable`), incluyendo una nueva para `porFuncionMes` — el pbix la muestra como pivot, no como chart.
- `DesempenoFilterBar.jsx` necesita un filtro `area` nuevo (slicer "Área" del pbix, presente en "Desempeño Individual - Año" y ausente hoy del componente).
- Mismos roles de acceso que tenía el menú de Power BI: `admin`, `psicologos`, `gerencia_gps`, `gerencia_uio`.
- Estado/fetch: un slice de Redux por vista (o un solo `desempenoDashboard.slice.js` con 4 thunks), reemplazando `powerbi.slice.js`.

## 6. Limpieza de código Power BI

Se elimina como parte del plan de implementación de este spec:

**Backend (`interno-api`):**
- `src/services/reports/powerbiAuth.services.js`, `powerbiEmbed.services.js`, `powerbiDataset.services.js`
- `src/config/powerbi.config.js`
- `src/controllers/reports/powerbi.controller.js`
- `src/middlewares/apiKey.middleware.js` (y su uso en `reports.routes.js`)
- Rutas `/reports/powerbi/:reportKey/embed` y `/reports/evaluations/powerbi-dataset` en `reports.routes.js`
- Todos los tests asociados (`tests/unit/services/reports/powerbiAuth.services.test.js`, `tests/unit/middlewares/apiKey.middleware.test.js`, `tests/unit/config/powerbi.config.test.js`, `tests/domain/reports/powerbi.test.js`)
- Variables `.env.example`: `POWERBI_TENANT_ID`, `POWERBI_CLIENT_ID`, `POWERBI_CLIENT_SECRET`, `POWERBI_REPORTS_MAP`, `POWERBI_DATASET_API_KEY`
- El swagger security scheme `powerbiApiKey` (registrado en la config de swagger)

**Frontend (`interno-react`, fuera de esta sesión pero documentado para la sesión que lo implemente):**
- `src/components/powerbi/PowerBIReportViewer.jsx` (+ test)
- `src/containers/operations/surveys/reporting/EvaluationReportPowerBI.jsx` (+ test)
- `src/store/slices/reports/powerbi.slice.js` (+ tests), `powerbi.utils.test.js`
- Dependencias `powerbi-client`, `powerbi-client-react` de `package.json`
- Entrada de ruta/menú que apunta a `EvaluationReportPowerBI`

## 7. Testing

Domain tests (Jest + Supertest, DB real vía `tests/helpers/testApp.js`), un archivo por vista bajo `tests/domain/reports/desempeno/`, mismo patrón que `tests/domain/reports/powerbiDataset.services.test.js`: fixtures que arman `FormRespond`/`FormAnswers` con estados y respuestas conocidas, y assertions sobre los agregados calculados (no solo sobre la forma de la respuesta) — en particular casos que verifiquen la fórmula de compliance y el promedio de calificación con datos donde el resultado esperado se pueda calcular a mano.

## 8. Preguntas abiertas / decisiones explícitas para no bloquear

- **Filtro `funcion`** en `/personas` y `/preguntas`: se asume que filtra por `Positions.name` (cargo) del evaluado, igual que la columna "Función" del Excel. Si en implementación se descubre que el Excel usa un concepto distinto de "función" al de `Positions`, se ajusta sin cambiar el contrato de query params.
- **Formularios sin 9 preguntas numéricas**: si un formulario tiene menos o más de 9 preguntas de escala, `preguntas.competencias` refleja las que existan realmente (no se asume un número fijo de 9).
- **Filtro `area`** (nuevo en `/personas`): se asume la misma convención que `funcion` — filtra por la columna `Área` de `Report_General_Final`. Si esa columna no tiene un origen claro en el modelo actual (`FormRespond`/`FormAnswers`/`Positions`/`Staff`), se ajusta el cálculo en implementación sin cambiar el contrato del query param.
- **`kpis.calificacionMax`/`calificacionMin`**: se asume que es el máximo/mínimo de `calificacion` entre las evaluaciones que matchean el filtro actual (no un máximo/mínimo histórico sin filtrar).
- Esta revisión (2026-08-31, segunda pasada) ajusta el contrato para reflejar el diseño real de `Reporte Desempeño.pbix` — la primera versión de este spec asumía visualmente el patrón de `ChartOne.jsx` en vez de partir del pbix, lo que dejó fuera `porFuncionMes`, `area`, `calificacionMax/Min` y los charts de `personas`. El backend ya implementado (PR #17) sigue el contrato viejo; falta un incremento para estos campos nuevos.
