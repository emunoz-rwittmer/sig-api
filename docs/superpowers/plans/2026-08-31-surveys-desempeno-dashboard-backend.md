# Dashboard de Desempeño de Tripulación (Backend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the 4 `interno-api` aggregation endpoints (`/reports/desempeno/{overview,yates,personas,preguntas}`) that back the in-house crew performance dashboard, and remove the now-unused Power BI integration from this repo.

**Architecture:** A single `desempenoDashboard.services.js` computes all aggregates (calificación, compliance %, monthly/yearly/quarterly grouping, per-competencia breakdown) on top of the existing `EvaluationService.getEvaluationsByCompany` query and `asignarPuntaje` scorer — no new tables, everything computed at request time, same pattern the (now removed) `powerbiDataset.services.js` used. A thin controller exposes 4 handlers; routes reuse the existing `authJwt.hasAnyRole` middleware. A final task deletes every Power BI-specific file, route, env var, and swagger scheme.

**Tech Stack:** Node.js, Express 4, Sequelize (MySQL), Jest + Supertest (domain tests boot the real app via `tests/helpers/testApp.js`).

**Spec:** `docs/superpowers/specs/2026-08-31-surveys-desempeno-dashboard-design.md`

## Global Constraints

- Mount: `/api/reports/desempeno/*`. Auth: `authJwt.verifyToken` + `authJwt.hasAnyRole(DESEMPENO_DASHBOARD_ROLES)` where `DESEMPENO_DASHBOARD_ROLES = ['admin', 'psicologos', 'gerencia_gps', 'gerencia_uio']` (same roles the Power BI embed route used).
- **No dynamic object keys anywhere in a response** (no `{"2024": 4.37}`). Time series use `{ categories: string[], series: [{ name: string, data: (number|null)[] }] }` (maps 1:1 to `ReactApexChart` series). Tabular breakdowns use arrays of `{ etiqueta, valor }` pairs, never dynamic columns.
- All computed averages/scores are `number | null` (`null` = no data — never `0` as a stand-in). All percentages are `0-100` integers, never `0-1` or strings.
- **Calificación** = average of `asignarPuntaje(answer)` results that are `typeof === 'number'` (this naturally excludes free-text answers like Pregunta 10 — no hardcoded question count).
- **Compliance %** = `round(Completadas / (Completadas + Caducadas) * 100)`, `null` when both counts are 0. Verified against the source Excel: 753/(753+148)=84%, 1981/(1981+331)=86%, 1025/(1025+104)=91%.
- **Competencias** (question labels) come from the real `FormQuestion.title`, never hardcoded — a title counts as a competencia if at least one answer for it parses to a number.
- Follow existing patterns exactly: `AppError` (`src/errors/AppError.js`) is not needed here (no error branches — these endpoints only read and aggregate, they don't reject on missing config like the Power BI ones did); controllers use the `try { ... } catch (error) { next(error); }` shape seen in `src/controllers/reports/powerbi.controller.js`; `@openapi` JSDoc blocks on every route in `reports.routes.js`; Jest + Supertest domain tests booting the real app via `tests/helpers/testApp.js` and `tests/helpers/staffFixtures.js` (see `tests/domain/reports/reports.test.js` for the established shape).
- Sequelize timestamps: to fixture a `FormRespond` into a specific month/year for aggregation tests, create it normally then `await respond.update({ updatedAt: new Date('YYYY-MM-DD') }, { silent: true })` — `silent: true` stops Sequelize from re-stamping `updatedAt` to "now" on the update itself.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/services/reports/desempenoDashboard.services.js` | All aggregation logic + 4 exported functions: `getOverview(yateFilter)`, `getYates(yateFilter)`, `getPersonas(filters)`, `getPreguntas(filters)`. |
| `src/controllers/reports/desempenoDashboard.controller.js` | 4 thin Express handlers, one per endpoint. |
| `src/routes/reports/reports.routes.js` | Modified: remove the 2 Power BI routes/requires, add the 4 desempeño routes + their `@openapi` blocks. |
| `src/config/swagger.js` | Modified: remove the `powerbiApiKey` security scheme. |
| `.env.example` | Modified: remove the 5 `POWERBI_*` lines. |
| Deleted | `src/services/reports/powerbiAuth.services.js`, `powerbiEmbed.services.js`, `powerbiDataset.services.js`, `src/config/powerbi.config.js`, `src/controllers/reports/powerbi.controller.js`, `src/middlewares/apiKey.middleware.js`, and their tests (listed in Task 7). |

---

### Task 1: `desempenoDashboard.services.js` — shared helpers + `getOverview`

**Files:**
- Create: `src/services/reports/desempenoDashboard.services.js`
- Test: `tests/domain/reports/desempeno/desempenoDashboard.overview.test.js`

**Interfaces:**
- Consumes: `EvaluationService.getEvaluationsByCompany` (`src/services/operations/surveys/evaluations.services.js:97`, called as `getEvaluationsByCompany(undefined, undefined, undefined)` to fetch all rows); `SurveyScoring.asignarPuntaje` (`src/utils/surveyScoring.js`); `capitalizeYachtName` (`src/utils/reportFormatting.js`).
- Produces (this task): shared helpers `MESES`, `round2`, `average`, `evaluationDate(row)`, `evaluationScore(row)`, `yateName(row)`, `matchesYate(row, yateFilter)`, `compliancePercent(completadas, caducadas)`, `quarterOf(date)`, `scoreValue(rows)`, `complianceValue(rows)`, `monthlySeriesByYear(rows, computeMonthValue)`, `loadEvaluations()` — all reused by Tasks 2-4, none exported (module-internal). Exported: `getOverview(yateFilter)` → `Promise<{ years: number[], kpisByYear: Array<{year, calificacion, compliancePercent, completadas, caducadas}>, monthlyCalificacion: {categories, series}, monthlyCompliance: {categories, series} }>`.

- [ ] **Step 1: Write the failing test**

```js
// tests/domain/reports/desempeno/desempenoDashboard.overview.test.js
const { bootTestApp, shutdownTestApp } = require('../../../helpers/testApp');
const { createCompanyWithYacht } = require('../../../helpers/staffFixtures');
const Form = require('../../../../src/models/operations/surveys/form.models');
const FormQuestion = require('../../../../src/models/operations/surveys/formQuestion.models');
const FormRespond = require('../../../../src/models/operations/surveys/formRespond.models');
const FormAnswers = require('../../../../src/models/operations/surveys/formAnswers.models');
const { getOverview } = require('../../../../src/services/reports/desempenoDashboard.services');

beforeAll(async () => {
    await bootTestApp();
}, 60000);

afterAll(async () => {
    await shutdownTestApp();
});

describe('desempenoDashboard.services getOverview', () => {
    it('computes compliance % and average calificación per year from real evaluation rows', async () => {
        const { company } = await createCompanyWithYacht('Overview Test Co', 'Overview Yacht');
        const form = await Form.create({ name: 'Form Overview', positions: [] });
        const question = await FormQuestion.create({ formId: form.id, title: 'Pregunta 1', type: 'scale' });

        const completada = await FormRespond.create({
            companyId: company.id,
            formId: form.id,
            state: 'Completada',
            evaluator: 'Eval Overview',
            evaluated: 'Evaluado Overview',
            expirationDate: new Date('2025-01-15'),
        });
        await completada.update({ updatedAt: new Date('2025-01-10') }, { silent: true });
        await FormAnswers.create({ respuestaId: completada.id, questionId: question.id, answer: '5' });

        const caducada = await FormRespond.create({
            companyId: company.id,
            formId: form.id,
            state: 'Caducada',
            evaluator: 'Eval Overview',
            evaluated: 'Evaluado Overview 2',
            expirationDate: new Date('2025-01-20'),
        });
        await caducada.update({ updatedAt: new Date('2025-01-12') }, { silent: true });

        const result = await getOverview();
        const year2025 = result.kpisByYear.find((k) => k.year === 2025);

        expect(year2025).toBeDefined();
        expect(year2025.completadas).toBeGreaterThanOrEqual(1);
        expect(year2025.caducadas).toBeGreaterThanOrEqual(1);
        expect(year2025.compliancePercent).toBe(Math.round((year2025.completadas / (year2025.completadas + year2025.caducadas)) * 100));

        const series2025 = result.monthlyCalificacion.series.find((s) => s.name === '2025');
        expect(series2025).toBeDefined();
        expect(series2025.data[0]).not.toBeNull(); // enero, 1-indexed monthIndex -> array index 0
    });

    it('filters by yate when provided', async () => {
        const { company } = await createCompanyWithYacht('Overview Filter Co', 'Filtered Yacht Overview');
        const form = await Form.create({ name: 'Form Overview Filter', positions: [] });
        const respond = await FormRespond.create({
            companyId: company.id,
            formId: form.id,
            state: 'Completada',
            evaluator: 'Eval Filter',
            evaluated: 'Evaluado Filter',
            expirationDate: new Date('2025-03-01'),
        });
        await respond.update({ updatedAt: new Date('2025-03-01') }, { silent: true });

        const matched = await getOverview('Filtered Yacht Overview');
        const unmatched = await getOverview('Yacht That Does Not Exist');

        expect(matched.years).toContain(2025);
        expect(unmatched.years).not.toContain(2025);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/domain/reports/desempeno/desempenoDashboard.overview.test.js`
Expected: FAIL — `src/services/reports/desempenoDashboard.services.js` does not exist.

- [ ] **Step 3: Write the implementation**

```js
// src/services/reports/desempenoDashboard.services.js
const EvaluationService = require('../operations/surveys/evaluations.services');
const Staffervice = require('../catalogs/staff.services');
const SurveyScoring = require('../../utils/surveyScoring');
const { extractApellido, extractNombres, capitalizeYachtName } = require('../../utils/reportFormatting');

const MESES = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function round2(value) {
    return (value === null || value === undefined) ? null : Math.round(value * 100) / 100;
}

function average(numbers) {
    if (!numbers.length) return null;
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
}

function evaluationDate(row) {
    return row.updatedAt ? new Date(row.updatedAt) : new Date(row.createdAt);
}

function evaluationScore(row) {
    const numeric = (row.respuestas || [])
        .map((r) => SurveyScoring.asignarPuntaje(r.answer))
        .filter((v) => typeof v === 'number');
    return average(numeric);
}

function yateName(row) {
    return capitalizeYachtName(row.empresa?.yacht?.name) || null;
}

function matchesYate(row, yateFilter) {
    if (!yateFilter) return true;
    const rowYate = yateName(row);
    return !!rowYate && rowYate.toLowerCase() === capitalizeYachtName(yateFilter).toLowerCase();
}

function compliancePercent(completadas, caducadas) {
    const total = completadas + caducadas;
    return total === 0 ? null : Math.round((completadas / total) * 100);
}

function quarterOf(date) {
    return `Q${Math.floor(date.getMonth() / 3) + 1}`;
}

function scoreValue(rows) {
    return round2(average(rows.map(evaluationScore).filter((s) => s !== null)));
}

function complianceValue(rows) {
    const completadas = rows.filter((row) => row.state === 'Completada').length;
    const caducadas = rows.filter((row) => row.state === 'Caducada').length;
    return compliancePercent(completadas, caducadas);
}

function monthlySeriesByYear(rows, computeMonthValue) {
    const years = [...new Set(rows.map((row) => evaluationDate(row).getFullYear()))].sort();
    return {
        categories: MESES,
        series: years.map((year) => ({
            name: String(year),
            data: MESES.map((_, monthIndex) => {
                const monthRows = rows.filter((row) => {
                    const date = evaluationDate(row);
                    return date.getFullYear() === year && date.getMonth() === monthIndex;
                });
                return computeMonthValue(monthRows);
            }),
        })),
    };
}

async function loadEvaluations() {
    return EvaluationService.getEvaluationsByCompany(undefined, undefined, undefined);
}

async function buildCargoMap(rows) {
    const uniqueEvaluados = [...new Set(rows.map((r) => r.evaluated).filter(Boolean))];
    const namePairs = uniqueEvaluados
        .map((evaluado) => ({
            fullName: evaluado,
            firstName: extractNombres(evaluado),
            lastName: extractApellido(evaluado),
        }))
        .filter(({ firstName, lastName }) => firstName && lastName);

    const cargoByFullName = await Staffervice.getPositionsByFullNames(
        namePairs.map(({ firstName, lastName }) => ({ firstName, lastName }))
    );

    return new Map(
        namePairs.map(({ fullName, firstName, lastName }) => [
            fullName,
            cargoByFullName.get(`${firstName} ${lastName}`) || null,
        ])
    );
}

async function getOverview(yateFilter) {
    const rows = (await loadEvaluations()).filter((row) => matchesYate(row, yateFilter));
    const years = [...new Set(rows.map((row) => evaluationDate(row).getFullYear()))].sort();

    const kpisByYear = years.map((year) => {
        const yearRows = rows.filter((row) => evaluationDate(row).getFullYear() === year);
        const completadas = yearRows.filter((row) => row.state === 'Completada').length;
        const caducadas = yearRows.filter((row) => row.state === 'Caducada').length;
        return {
            year,
            calificacion: scoreValue(yearRows),
            compliancePercent: compliancePercent(completadas, caducadas),
            completadas,
            caducadas,
        };
    });

    return {
        years,
        kpisByYear,
        monthlyCalificacion: monthlySeriesByYear(rows, scoreValue),
        monthlyCompliance: monthlySeriesByYear(rows, complianceValue),
    };
}

module.exports = {
    MESES,
    round2,
    average,
    evaluationDate,
    evaluationScore,
    yateName,
    matchesYate,
    compliancePercent,
    quarterOf,
    scoreValue,
    complianceValue,
    monthlySeriesByYear,
    loadEvaluations,
    buildCargoMap,
    getOverview,
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/domain/reports/desempeno/desempenoDashboard.overview.test.js`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/services/reports/desempenoDashboard.services.js tests/domain/reports/desempeno/desempenoDashboard.overview.test.js
git commit -m "feat: add desempeno dashboard overview aggregation"
```

---

### Task 2: `getYates`

**Files:**
- Modify: `src/services/reports/desempenoDashboard.services.js`
- Test: `tests/domain/reports/desempeno/desempenoDashboard.yates.test.js`

**Interfaces:**
- Consumes: `loadEvaluations`, `yateName`, `matchesYate`, `scoreValue`, `compliancePercent`, `monthlySeriesByYear` from Task 1 (same file, module-internal — no import needed, just call directly).
- Produces: `getYates(yateFilter)` → `Promise<{ avgByYate: Array<{yate, calificacion}>, kpis: {completadas, caducadas, calificacion, compliancePercent}, monthlyCalificacion: {categories, series}, monthlyCompliance: {categories, series}, monthlyCalificacionByYate: Array<{yate, categories, series}> }>`. Add to the `module.exports` object.

- [ ] **Step 1: Write the failing test**

```js
// tests/domain/reports/desempeno/desempenoDashboard.yates.test.js
const { bootTestApp, shutdownTestApp } = require('../../../helpers/testApp');
const { createCompanyWithYacht } = require('../../../helpers/staffFixtures');
const Form = require('../../../../src/models/operations/surveys/form.models');
const FormQuestion = require('../../../../src/models/operations/surveys/formQuestion.models');
const FormRespond = require('../../../../src/models/operations/surveys/formRespond.models');
const FormAnswers = require('../../../../src/models/operations/surveys/formAnswers.models');
const { getYates } = require('../../../../src/services/reports/desempenoDashboard.services');

beforeAll(async () => {
    await bootTestApp();
}, 60000);

afterAll(async () => {
    await shutdownTestApp();
});

describe('desempenoDashboard.services getYates', () => {
    it('returns per-yate averages and filters the scoped kpis by yate', async () => {
        const { company: companyA } = await createCompanyWithYacht('Yates Co A', 'Yacht Alpha');
        const { company: companyB } = await createCompanyWithYacht('Yates Co B', 'Yacht Beta');
        const form = await Form.create({ name: 'Form Yates', positions: [] });
        const question = await FormQuestion.create({ formId: form.id, title: 'Pregunta 1', type: 'scale' });

        const respondA = await FormRespond.create({
            companyId: companyA.id, formId: form.id, state: 'Completada',
            evaluator: 'Eval A', evaluated: 'Evaluado A', expirationDate: new Date('2025-05-01'),
        });
        await respondA.update({ updatedAt: new Date('2025-05-01') }, { silent: true });
        await FormAnswers.create({ respuestaId: respondA.id, questionId: question.id, answer: '5' });

        const respondB = await FormRespond.create({
            companyId: companyB.id, formId: form.id, state: 'Completada',
            evaluator: 'Eval B', evaluated: 'Evaluado B', expirationDate: new Date('2025-05-01'),
        });
        await respondB.update({ updatedAt: new Date('2025-05-01') }, { silent: true });
        await FormAnswers.create({ respuestaId: respondB.id, questionId: question.id, answer: '3' });

        const result = await getYates('Yacht Alpha');

        const alphaAvg = result.avgByYate.find((y) => y.yate === 'Yacht Alpha');
        const betaAvg = result.avgByYate.find((y) => y.yate === 'Yacht Beta');
        expect(alphaAvg.calificacion).toBe(5);
        expect(betaAvg.calificacion).toBe(3);
        expect(result.kpis.calificacion).toBe(5); // scoped to Yacht Alpha only
        expect(result.kpis.completadas).toBe(1);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/domain/reports/desempeno/desempenoDashboard.yates.test.js`
Expected: FAIL — `getYates` is not exported.

- [ ] **Step 3: Write the implementation**

Add to `src/services/reports/desempenoDashboard.services.js`, before `module.exports`:

```js
async function getYates(yateFilter) {
    const allRows = await loadEvaluations();

    const yateGroups = new Map();
    allRows.forEach((row) => {
        const yate = yateName(row);
        if (!yate) return;
        if (!yateGroups.has(yate)) yateGroups.set(yate, []);
        yateGroups.get(yate).push(row);
    });

    const avgByYate = [...yateGroups.entries()]
        .map(([yate, yateRows]) => ({ yate, calificacion: scoreValue(yateRows) }))
        .sort((a, b) => a.yate.localeCompare(b.yate));

    const scoped = allRows.filter((row) => matchesYate(row, yateFilter));
    const completadas = scoped.filter((row) => row.state === 'Completada').length;
    const caducadas = scoped.filter((row) => row.state === 'Caducada').length;

    const monthlyCalificacionByYate = [...yateGroups.entries()]
        .map(([yate, yateRows]) => ({
            yate,
            ...monthlySeriesByYear(yateRows, scoreValue),
        }))
        .sort((a, b) => a.yate.localeCompare(b.yate));

    return {
        avgByYate,
        kpis: {
            completadas,
            caducadas,
            calificacion: scoreValue(scoped),
            compliancePercent: compliancePercent(completadas, caducadas),
        },
        monthlyCalificacion: monthlySeriesByYear(scoped, scoreValue),
        monthlyCompliance: monthlySeriesByYear(scoped, complianceValue),
        monthlyCalificacionByYate,
    };
}
```

Update `module.exports` to include `getYates`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/domain/reports/desempeno/desempenoDashboard.yates.test.js`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add src/services/reports/desempenoDashboard.services.js tests/domain/reports/desempeno/desempenoDashboard.yates.test.js
git commit -m "feat: add desempeno dashboard per-yate aggregation"
```

---

### Task 3: `getPersonas`

**Files:**
- Modify: `src/services/reports/desempenoDashboard.services.js`
- Test: `tests/domain/reports/desempeno/desempenoDashboard.personas.test.js`

**Interfaces:**
- Consumes: `loadEvaluations`, `buildCargoMap`, `matchesYate`, `evaluationDate`, `MESES`, `scoreValue`, `complianceValue`, `quarterOf` from Task 1.
- Produces: `getPersonas({ yate, evaluado, funcion, anio } = {})` → `Promise<{ months: Array<{month, monthIndex}>, porEvaluado: Array<{evaluado, porMes: Array<{month, monthIndex, valor}>, total}>, porEvaluadorMensual: Array<{evaluador, porMes: Array<{month, monthIndex, valor}>, total}>, porEvaluadorTrimestre: Array<{evaluador, porTrimestre: Array<{trimestre, valor}>, total}>, comentarios: Array<{evaluado, evaluador, texto}> }>`.

- [ ] **Step 1: Write the failing test**

```js
// tests/domain/reports/desempeno/desempenoDashboard.personas.test.js
const { bootTestApp, shutdownTestApp } = require('../../../helpers/testApp');
const { createCompanyWithYacht } = require('../../../helpers/staffFixtures');
const Form = require('../../../../src/models/operations/surveys/form.models');
const FormQuestion = require('../../../../src/models/operations/surveys/formQuestion.models');
const FormRespond = require('../../../../src/models/operations/surveys/formRespond.models');
const FormAnswers = require('../../../../src/models/operations/surveys/formAnswers.models');
const { getPersonas } = require('../../../../src/services/reports/desempenoDashboard.services');

beforeAll(async () => {
    await bootTestApp();
}, 60000);

afterAll(async () => {
    await shutdownTestApp();
});

describe('desempenoDashboard.services getPersonas', () => {
    it('groups calificación by evaluado/mes, compliance by evaluador/mes, and collects free-text comments', async () => {
        const caseSuffix = `${Date.now()}`;
        const { company } = await createCompanyWithYacht(`Personas Co ${caseSuffix}`);
        const form = await Form.create({ name: `Form Personas ${caseSuffix}`, positions: [] });
        const scaleQuestion = await FormQuestion.create({ formId: form.id, title: 'Pregunta 1', type: 'scale' });
        const commentQuestion = await FormQuestion.create({ formId: form.id, title: 'Pregunta 10', type: 'text' });

        const respond = await FormRespond.create({
            companyId: company.id, formId: form.id, state: 'Completada',
            evaluator: `Evaluador Personas ${caseSuffix}`, evaluated: `Evaluado Personas ${caseSuffix}`,
            expirationDate: new Date('2025-06-01'),
        });
        await respond.update({ updatedAt: new Date('2025-06-15') }, { silent: true });
        await FormAnswers.create({ respuestaId: respond.id, questionId: scaleQuestion.id, answer: '4' });
        await FormAnswers.create({ respuestaId: respond.id, questionId: commentQuestion.id, answer: 'Buen desempeño este mes.' });

        const caducada = await FormRespond.create({
            companyId: company.id, formId: form.id, state: 'Caducada',
            evaluator: `Evaluador Personas ${caseSuffix}`, evaluated: `Evaluado Personas 2 ${caseSuffix}`,
            expirationDate: new Date('2025-06-01'),
        });
        await caducada.update({ updatedAt: new Date('2025-06-20') }, { silent: true });

        const result = await getPersonas({ anio: 2025 });

        const evaluadoRow = result.porEvaluado.find((r) => r.evaluado === `Evaluado Personas ${caseSuffix}`);
        expect(evaluadoRow.total).toBe(4);
        expect(evaluadoRow.porMes.find((m) => m.monthIndex === 6).valor).toBe(4);

        const evaluadorRow = result.porEvaluadorMensual.find((r) => r.evaluador === `Evaluador Personas ${caseSuffix}`);
        expect(evaluadorRow.total).toBe(50); // 1 completada + 1 caducada

        expect(result.comentarios).toContainEqual({
            evaluado: `Evaluado Personas ${caseSuffix}`,
            evaluador: `Evaluador Personas ${caseSuffix}`,
            texto: 'Buen desempeño este mes.',
        });
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/domain/reports/desempeno/desempenoDashboard.personas.test.js`
Expected: FAIL — `getPersonas` is not exported.

- [ ] **Step 3: Write the implementation**

Add to `src/services/reports/desempenoDashboard.services.js`, before `module.exports`:

```js
function groupRowsBy(rows, keyFn) {
    const groups = new Map();
    rows.forEach((row) => {
        const key = keyFn(row);
        if (!key) return;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(row);
    });
    return groups;
}

async function getPersonas({ yate, evaluado, funcion, anio } = {}) {
    const allRows = await loadEvaluations();
    const cargoMap = await buildCargoMap(allRows);

    const rows = allRows.filter((row) => {
        if (!matchesYate(row, yate)) return false;
        if (evaluado && row.evaluated?.trim().toLowerCase() !== evaluado.trim().toLowerCase()) return false;
        if (funcion && (cargoMap.get(row.evaluated) || '').toLowerCase() !== funcion.trim().toLowerCase()) return false;
        if (anio && evaluationDate(row).getFullYear() !== Number(anio)) return false;
        return true;
    });

    const monthIndexesPresent = [...new Set(rows.map((row) => evaluationDate(row).getMonth()))].sort((a, b) => a - b);
    const months = monthIndexesPresent.map((monthIndex) => ({ month: MESES[monthIndex], monthIndex: monthIndex + 1 }));

    const porEvaluado = [...groupRowsBy(rows, (row) => row.evaluated).entries()]
        .map(([evaluadoName, personRows]) => ({
            evaluado: evaluadoName,
            porMes: months.map(({ month, monthIndex }) => ({
                month,
                monthIndex,
                valor: scoreValue(personRows.filter((row) => evaluationDate(row).getMonth() === monthIndex - 1)),
            })),
            total: scoreValue(personRows),
        }))
        .sort((a, b) => a.evaluado.localeCompare(b.evaluado));

    const porEvaluadorMensual = [...groupRowsBy(rows, (row) => row.evaluator).entries()]
        .map(([evaluador, evaluatorRows]) => ({
            evaluador,
            porMes: months.map(({ month, monthIndex }) => ({
                month,
                monthIndex,
                valor: complianceValue(evaluatorRows.filter((row) => evaluationDate(row).getMonth() === monthIndex - 1)),
            })),
            total: complianceValue(evaluatorRows),
        }))
        .sort((a, b) => a.evaluador.localeCompare(b.evaluador));

    const porEvaluadorTrimestre = [...groupRowsBy(rows, (row) => row.evaluator).entries()]
        .map(([evaluador, evaluatorRows]) => {
            const trimestres = [...new Set(evaluatorRows.map((row) => quarterOf(evaluationDate(row))))].sort();
            return {
                evaluador,
                porTrimestre: trimestres.map((trimestre) => ({
                    trimestre,
                    valor: scoreValue(evaluatorRows.filter((row) => quarterOf(evaluationDate(row)) === trimestre)),
                })),
                total: scoreValue(evaluatorRows),
            };
        })
        .sort((a, b) => a.evaluador.localeCompare(b.evaluador));

    const comentarios = rows.flatMap((row) =>
        (row.respuestas || [])
            .filter((r) => r.answer && typeof SurveyScoring.asignarPuntaje(r.answer) !== 'number')
            .map((r) => ({ evaluado: row.evaluated, evaluador: row.evaluator, texto: r.answer }))
    );

    return { months, porEvaluado, porEvaluadorMensual, porEvaluadorTrimestre, comentarios };
}
```

Update `module.exports` to include `getPersonas`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/domain/reports/desempeno/desempenoDashboard.personas.test.js`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add src/services/reports/desempenoDashboard.services.js tests/domain/reports/desempeno/desempenoDashboard.personas.test.js
git commit -m "feat: add desempeno dashboard per-persona aggregation"
```

---

### Task 4: `getPreguntas`

**Files:**
- Modify: `src/services/reports/desempenoDashboard.services.js`
- Test: `tests/domain/reports/desempeno/desempenoDashboard.preguntas.test.js`

**Interfaces:**
- Consumes: `loadEvaluations`, `buildCargoMap`, `evaluationDate`, `MESES`, `scoreValue`, `average`, `round2` from Task 1; `groupRowsBy` from Task 3.
- Produces: `getPreguntas({ evaluado, funcion, anio } = {})` → `Promise<{ competencias: string[], porMes: Array<{month, monthIndex, valores: Array<{etiqueta, valor}>}>, porEvaluador: Array<{evaluador, valores: Array<{etiqueta, valor}>, calificacion}> }>`.

- [ ] **Step 1: Write the failing test**

```js
// tests/domain/reports/desempeno/desempenoDashboard.preguntas.test.js
const { bootTestApp, shutdownTestApp } = require('../../../helpers/testApp');
const { createCompanyWithYacht } = require('../../../helpers/staffFixtures');
const Form = require('../../../../src/models/operations/surveys/form.models');
const FormQuestion = require('../../../../src/models/operations/surveys/formQuestion.models');
const FormRespond = require('../../../../src/models/operations/surveys/formRespond.models');
const FormAnswers = require('../../../../src/models/operations/surveys/formAnswers.models');
const { getPreguntas } = require('../../../../src/services/reports/desempenoDashboard.services');

beforeAll(async () => {
    await bootTestApp();
}, 60000);

afterAll(async () => {
    await shutdownTestApp();
});

describe('desempenoDashboard.services getPreguntas', () => {
    it('breaks calificación down per competencia using the real FormQuestion titles, excluding free-text answers', async () => {
        const caseSuffix = `${Date.now()}`;
        const { company } = await createCompanyWithYacht(`Preguntas Co ${caseSuffix}`);
        const form = await Form.create({ name: `Form Preguntas ${caseSuffix}`, positions: [] });
        const competenciaQuestion = await FormQuestion.create({ formId: form.id, title: 'Comunicación Clara', type: 'scale' });
        const commentQuestion = await FormQuestion.create({ formId: form.id, title: 'Comentarios', type: 'text' });

        const respond = await FormRespond.create({
            companyId: company.id, formId: form.id, state: 'Completada',
            evaluator: `Evaluador Preguntas ${caseSuffix}`, evaluated: `Evaluado Preguntas ${caseSuffix}`,
            expirationDate: new Date('2025-04-01'),
        });
        await respond.update({ updatedAt: new Date('2025-04-05') }, { silent: true });
        await FormAnswers.create({ respuestaId: respond.id, questionId: competenciaQuestion.id, answer: '4' });
        await FormAnswers.create({ respuestaId: respond.id, questionId: commentQuestion.id, answer: 'Todo bien.' });

        const result = await getPreguntas({ anio: 2025 });

        expect(result.competencias).toContain('Comunicación Clara');
        expect(result.competencias).not.toContain('Comentarios');

        const abrilRow = result.porMes.find((m) => m.monthIndex === 4);
        const comunicacionValor = abrilRow.valores.find((v) => v.etiqueta === 'Comunicación Clara').valor;
        expect(comunicacionValor).toBe(4);

        const evaluadorRow = result.porEvaluador.find((r) => r.evaluador === `Evaluador Preguntas ${caseSuffix}`);
        expect(evaluadorRow.calificacion).toBe(4);
        expect(evaluadorRow.valores.find((v) => v.etiqueta === 'Comunicación Clara').valor).toBe(4);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/domain/reports/desempeno/desempenoDashboard.preguntas.test.js`
Expected: FAIL — `getPreguntas` is not exported.

- [ ] **Step 3: Write the implementation**

Add to `src/services/reports/desempenoDashboard.services.js`, before `module.exports`:

```js
function scoreForCompetencia(rows, competencia) {
    const numeric = rows.flatMap((row) =>
        (row.respuestas || [])
            .filter((r) => r.pregunta?.title === competencia)
            .map((r) => SurveyScoring.asignarPuntaje(r.answer))
            .filter((v) => typeof v === 'number')
    );
    return round2(average(numeric));
}

async function getPreguntas({ evaluado, funcion, anio } = {}) {
    const allRows = await loadEvaluations();
    const cargoMap = await buildCargoMap(allRows);

    const rows = allRows.filter((row) => {
        if (evaluado && row.evaluated?.trim().toLowerCase() !== evaluado.trim().toLowerCase()) return false;
        if (funcion && (cargoMap.get(row.evaluated) || '').toLowerCase() !== funcion.trim().toLowerCase()) return false;
        if (anio && evaluationDate(row).getFullYear() !== Number(anio)) return false;
        return true;
    });

    const competencias = [];
    const seen = new Set();
    rows.forEach((row) => {
        (row.respuestas || []).forEach((r) => {
            const title = r.pregunta?.title;
            if (!title || seen.has(title)) return;
            if (typeof SurveyScoring.asignarPuntaje(r.answer) === 'number') {
                seen.add(title);
                competencias.push(title);
            }
        });
    });

    const monthIndexesPresent = [...new Set(rows.map((row) => evaluationDate(row).getMonth()))].sort((a, b) => a - b);
    const porMes = monthIndexesPresent.map((monthIndex) => {
        const monthRows = rows.filter((row) => evaluationDate(row).getMonth() === monthIndex);
        return {
            month: MESES[monthIndex],
            monthIndex: monthIndex + 1,
            valores: competencias.map((competencia) => ({
                etiqueta: competencia,
                valor: scoreForCompetencia(monthRows, competencia),
            })),
        };
    });

    const porEvaluador = [...groupRowsBy(rows, (row) => row.evaluator).entries()]
        .map(([evaluador, evaluatorRows]) => ({
            evaluador,
            valores: competencias.map((competencia) => ({
                etiqueta: competencia,
                valor: scoreForCompetencia(evaluatorRows, competencia),
            })),
            calificacion: scoreValue(evaluatorRows),
        }))
        .sort((a, b) => a.evaluador.localeCompare(b.evaluador));

    return { competencias, porMes, porEvaluador };
}
```

Update `module.exports` to include `getPreguntas`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/domain/reports/desempeno/desempenoDashboard.preguntas.test.js`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add src/services/reports/desempenoDashboard.services.js tests/domain/reports/desempeno/desempenoDashboard.preguntas.test.js
git commit -m "feat: add desempeno dashboard per-competencia aggregation"
```

---

### Task 5: `desempenoDashboard.controller.js`

**Files:**
- Create: `src/controllers/reports/desempenoDashboard.controller.js`

**Interfaces:**
- Consumes: `getOverview`, `getYates`, `getPersonas`, `getPreguntas` from Task 1-4's `../../services/reports/desempenoDashboard.services`.
- Produces: `getDesempenoOverview(req, res, next)`, `getDesempenoYates(req, res, next)`, `getDesempenoPersonas(req, res, next)`, `getDesempenoPreguntas(req, res, next)` — Express handlers. Used by Task 6's route wiring.

No dedicated unit test — thin pass-through, covered end-to-end by Task 6's route tests (same precedent as `powerbi.controller.js`).

- [ ] **Step 1: Write the implementation**

```js
// src/controllers/reports/desempenoDashboard.controller.js
const {
    getOverview,
    getYates,
    getPersonas,
    getPreguntas,
} = require('../../services/reports/desempenoDashboard.services');

const getDesempenoOverview = async (req, res, next) => {
    try {
        const overview = await getOverview(req.query.yate);
        res.status(200).json(overview);
    } catch (error) {
        next(error);
    }
};

const getDesempenoYates = async (req, res, next) => {
    try {
        const yates = await getYates(req.query.yate);
        res.status(200).json(yates);
    } catch (error) {
        next(error);
    }
};

const getDesempenoPersonas = async (req, res, next) => {
    try {
        const { yate, evaluado, funcion, anio } = req.query;
        const personas = await getPersonas({ yate, evaluado, funcion, anio });
        res.status(200).json(personas);
    } catch (error) {
        next(error);
    }
};

const getDesempenoPreguntas = async (req, res, next) => {
    try {
        const { evaluado, funcion, anio } = req.query;
        const preguntas = await getPreguntas({ evaluado, funcion, anio });
        res.status(200).json(preguntas);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getDesempenoOverview,
    getDesempenoYates,
    getDesempenoPersonas,
    getDesempenoPreguntas,
};
```

- [ ] **Step 2: Verify the app still builds**

Run: `node -e "require('./src/controllers/reports/desempenoDashboard.controller.js')"`
Expected: no output, exit code 0.

- [ ] **Step 3: Commit**

```bash
git add src/controllers/reports/desempenoDashboard.controller.js
git commit -m "feat: add desempeno dashboard controller"
```

---

### Task 6: Route wiring — add desempeño routes, remove Power BI routes

**Files:**
- Modify: `src/routes/reports/reports.routes.js`
- Test: `tests/domain/reports/desempeno/desempenoDashboard.routes.test.js`

**Interfaces:**
- Consumes: `authJwt.verifyToken`, `authJwt.hasAnyRole` (unchanged, `src/middlewares/auth.middleware.js`); `getDesempenoOverview`, `getDesempenoYates`, `getDesempenoPersonas`, `getDesempenoPreguntas` from Task 5's controller.

- [ ] **Step 1: Write the failing tests**

```js
// tests/domain/reports/desempeno/desempenoDashboard.routes.test.js
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { bootTestApp, shutdownTestApp } = require('../../../helpers/testApp');
const { createAuthenticatedUser } = require('../../../helpers/auth');

let app;
let adminToken;

const withAuth = (httpRequest, token) => httpRequest.set('Authorization', `Bearer ${token}`);

beforeAll(async () => {
    app = await bootTestApp();
    adminToken = await createAuthenticatedUser(app);
}, 60000);

afterAll(async () => {
    await shutdownTestApp();
});

describe('GET /api/reports/desempeno/*', () => {
    it('returns 200 with the overview shape for an authenticated allowed-role user', async () => {
        const response = await withAuth(request(app).get('/api/reports/desempeno/overview'), adminToken);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('years');
        expect(response.body).toHaveProperty('kpisByYear');
        expect(response.body).toHaveProperty('monthlyCalificacion');
        expect(response.body).toHaveProperty('monthlyCompliance');
    });

    it('returns the yates shape', async () => {
        const response = await withAuth(request(app).get('/api/reports/desempeno/yates'), adminToken);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('avgByYate');
        expect(response.body).toHaveProperty('kpis');
    });

    it('returns the personas shape', async () => {
        const response = await withAuth(request(app).get('/api/reports/desempeno/personas'), adminToken);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('porEvaluado');
        expect(response.body).toHaveProperty('comentarios');
    });

    it('returns the preguntas shape', async () => {
        const response = await withAuth(request(app).get('/api/reports/desempeno/preguntas'), adminToken);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('competencias');
        expect(response.body).toHaveProperty('porMes');
    });

    it('returns 403 without a token', async () => {
        const response = await request(app).get('/api/reports/desempeno/overview');
        expect(response.status).toBe(403);
    });

    it('returns 403 for a role outside the allowed list', async () => {
        const restrictedToken = jwt.sign({ id: 999, rol: 'rrhh' }, process.env.JWT_SECRET, {
            expiresIn: '10h',
            algorithm: 'HS512',
        });

        const response = await withAuth(request(app).get('/api/reports/desempeno/overview'), restrictedToken);
        expect(response.status).toBe(403);
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest tests/domain/reports/desempeno/desempenoDashboard.routes.test.js`
Expected: FAIL — routes don't exist yet (404s where 200/403 expected).

- [ ] **Step 3: Rewrite the top of `reports.routes.js` and add the new routes**

Replace lines 1-8 of `src/routes/reports/reports.routes.js`:

```js
const { Router } = require('express');
const excelReports = require ('../../controllers/reports');
const desempenoDashboard = require('../../controllers/reports/desempenoDashboard.controller');
const authJwt = require('../../middlewares/auth.middleware');
const router = Router();

const DESEMPENO_DASHBOARD_ROLES = ['admin', 'psicologos', 'gerencia_gps', 'gerencia_uio'];
```

(This drops the `powerbiReports` and `verifyPowerBIDatasetKey` requires and renames `POWERBI_ALLOWED_ROLES` to `DESEMPENO_DASHBOARD_ROLES`.)

Replace the Power BI block (from `/**\n * @openapi\n * /reports/powerbi/{reportKey}/embed:` through `router.get('/evaluations/powerbi-dataset', verifyPowerBIDatasetKey, powerbiReports.getEvaluationsPowerBIDataset);`, i.e. everything between the `comentCards/generateReport` route and `module.exports = router;`) with:

```js
/**
 * @openapi
 * /reports/desempeno/overview:
 *   get:
 *     summary: KPIs y tendencias mensuales de desempeño de tripulación por año
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: yate
 *         schema:
 *           type: string
 *         description: Nombre del yate para filtrar (opcional, sin filtro = todos)
 *     responses:
 *       200:
 *         description: KPIs por año y series mensuales de calificación/compliance
 *       403:
 *         description: Token no proporcionado o rol no autorizado
 */
router.get('/desempeno/overview', authJwt.verifyToken, authJwt.hasAnyRole(DESEMPENO_DASHBOARD_ROLES), desempenoDashboard.getDesempenoOverview);

/**
 * @openapi
 * /reports/desempeno/yates:
 *   get:
 *     summary: Promedio de calificación por yate y detalle mensual de un yate
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: yate
 *         schema:
 *           type: string
 *         description: Nombre del yate para filtrar los KPIs (opcional)
 *     responses:
 *       200:
 *         description: Promedio por yate + KPIs y series mensuales
 *       403:
 *         description: Token no proporcionado o rol no autorizado
 */
router.get('/desempeno/yates', authJwt.verifyToken, authJwt.hasAnyRole(DESEMPENO_DASHBOARD_ROLES), desempenoDashboard.getDesempenoYates);

/**
 * @openapi
 * /reports/desempeno/personas:
 *   get:
 *     summary: Calificación por evaluado y compliance por evaluador, con comentarios de texto libre
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: yate
 *         schema:
 *           type: string
 *       - in: query
 *         name: evaluado
 *         schema:
 *           type: string
 *       - in: query
 *         name: funcion
 *         schema:
 *           type: string
 *       - in: query
 *         name: anio
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Tablas por evaluado/evaluador + comentarios
 *       403:
 *         description: Token no proporcionado o rol no autorizado
 */
router.get('/desempeno/personas', authJwt.verifyToken, authJwt.hasAnyRole(DESEMPENO_DASHBOARD_ROLES), desempenoDashboard.getDesempenoPersonas);

/**
 * @openapi
 * /reports/desempeno/preguntas:
 *   get:
 *     summary: Desglose de calificación por pregunta/competencia
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: evaluado
 *         schema:
 *           type: string
 *       - in: query
 *         name: funcion
 *         schema:
 *           type: string
 *       - in: query
 *         name: anio
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Competencias + desglose mensual y por evaluador
 *       403:
 *         description: Token no proporcionado o rol no autorizado
 */
router.get('/desempeno/preguntas', authJwt.verifyToken, authJwt.hasAnyRole(DESEMPENO_DASHBOARD_ROLES), desempenoDashboard.getDesempenoPreguntas);

module.exports = router;
```

- [ ] **Step 4: Run the new tests to verify they pass**

Run: `npx jest tests/domain/reports/desempeno/desempenoDashboard.routes.test.js`
Expected: PASS (6 tests)

- [ ] **Step 5: Run the full existing reports suite to confirm no regression**

Run: `npx jest tests/domain/reports/reports.test.js`
Expected: PASS, unchanged.

- [ ] **Step 6: Commit**

```bash
git add src/routes/reports/reports.routes.js tests/domain/reports/desempeno/desempenoDashboard.routes.test.js
git commit -m "feat: wire desempeno dashboard routes"
```

---

### Task 7: Remove Power BI code, config, and docs

**Files:**
- Delete: `src/services/reports/powerbiAuth.services.js`, `src/services/reports/powerbiEmbed.services.js`, `src/services/reports/powerbiDataset.services.js`, `src/config/powerbi.config.js`, `src/controllers/reports/powerbi.controller.js`, `src/middlewares/apiKey.middleware.js`
- Delete: `tests/unit/services/reports/powerbiAuth.services.test.js`, `tests/unit/services/reports/powerbiEmbed.services.test.js`, `tests/unit/config/powerbi.config.test.js`, `tests/unit/middlewares/apiKey.middleware.test.js`, `tests/domain/reports/powerbi.test.js`, `tests/domain/reports/powerbiDataset.services.test.js`
- Modify: `src/config/swagger.js`, `.env.example`

**Interfaces:** None — this task only removes code the previous tasks already made unreachable (Task 6 already dropped every `require` and route pointing at these files).

- [ ] **Step 1: Delete the Power BI backend files and their tests**

```bash
git rm src/services/reports/powerbiAuth.services.js src/services/reports/powerbiEmbed.services.js src/services/reports/powerbiDataset.services.js src/config/powerbi.config.js src/controllers/reports/powerbi.controller.js src/middlewares/apiKey.middleware.js
git rm tests/unit/services/reports/powerbiAuth.services.test.js tests/unit/services/reports/powerbiEmbed.services.test.js tests/unit/config/powerbi.config.test.js tests/unit/middlewares/apiKey.middleware.test.js tests/domain/reports/powerbi.test.js tests/domain/reports/powerbiDataset.services.test.js
```

- [ ] **Step 2: Remove the `powerbiApiKey` security scheme**

In `src/config/swagger.js`, remove the `powerbiApiKey` block from `securitySchemes`:

```js
components: {
    securitySchemes: {
        bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
        },
    },
},
```

- [ ] **Step 3: Remove the Power BI env vars from `.env.example`**

Delete these 8 lines from `.env.example` (the `# --- Power BI reporting ---` block, currently lines 36-49):

```
# --- Power BI reporting (embed + scheduled dataset refresh) ---
# Azure AD service principal with Power BI Service API permissions (Report.Read.All),
# admin-consented. See docs/superpowers/specs/2026-08-24-surveys-powerbi-reporting-design.md
# §6.3 in the interno-react repo for the manual Azure/Power BI setup steps.
POWERBI_TENANT_ID=
POWERBI_CLIENT_ID=
POWERBI_CLIENT_SECRET=
# JSON map of reportKey -> {workspaceId, reportId}. Add an entry here (no code change)
# to expose a new report through GET /reports/powerbi/:reportKey/embed.
# Example: {"desempeno":{"workspaceId":"<guid>","reportId":"<guid>"}}
POWERBI_REPORTS_MAP=
# Static key Power BI Service must send as the X-PowerBI-Key header when it calls
# GET /reports/evaluations/powerbi-dataset for its scheduled refresh.
POWERBI_DATASET_API_KEY=
```

- [ ] **Step 4: Run the full test suite**

Run: `npm test`
Expected: all suites pass, no references to the deleted files remain (a stray `require` of a deleted file fails loudly at suite collection time, not silently).

- [ ] **Step 5: Commit**

```bash
git add src/config/swagger.js .env.example
git commit -m "chore: remove Power BI integration in favor of the in-house desempeno dashboard"
```

---

## Self-Review Notes

- **Spec coverage:** §1 (métricas) → Task 1 (`scoreValue`, `compliancePercent`, verified formulas in tests). §2 (contrato sin claves dinámicas) → every task's response shape uses `categories/series` or `{etiqueta, valor}` arrays, no dynamic keys anywhere. §3.1-3.4 (4 endpoints) → Tasks 1-4 (services) + Task 6 (routes). §4 (componentes backend) → Tasks 1-6 match the file table exactly. §5 (frontend) → explicitly out of scope for this plan, documented in the spec only. §6 (limpieza Power BI) → Task 7 covers every file listed in the spec's backend cleanup list. §7 (testing) → every service task ships a domain test with real DB fixtures and formula assertions, not just shape assertions. §8 (preguntas abiertas) → `funcion` filter implemented against `Positions.name` via the same `cargoMap` pattern `powerbiDataset.services.js` used; `competencias` count is never assumed fixed, derived from real data per Task 4.
- **Placeholder scan:** no TBD/TODO; every step has runnable commands or complete code.
- **Type consistency:** `getOverview`/`getYates`/`getPersonas`/`getPreguntas` signatures (Tasks 1-4) match their call sites in Task 5's controller exactly (`req.query.yate` string, `{yate, evaluado, funcion, anio}` object). `monthlySeriesByYear`, `scoreValue`, `complianceValue`, `groupRowsBy` are defined once (Tasks 1 and 3) and reused by name in later tasks without redefinition. `module.exports` in Task 1 is extended (not replaced) in Tasks 2-4 — each task's Step 3 explicitly says "update `module.exports`" rather than repeating the whole object, avoiding an accidental overwrite of earlier exports.
- **Route/controller consistency:** the 4 route paths in Task 6 (`/desempeno/overview`, `/desempeno/yates`, `/desempeno/personas`, `/desempeno/preguntas`) match the 4 controller handler names in Task 5 (`getDesempenoOverview`, `getDesempenoYates`, `getDesempenoPersonas`, `getDesempenoPreguntas`) and the spec's §3 endpoint list one-to-one.
- **Cleanup ordering:** Task 6 removes every `require`/route referencing Power BI code before Task 7 deletes the files themselves, so the app never has a dangling `require` mid-plan (each task leaves `npm test` green).
