# Dashboard de Desempeño — Incremento Personas/Preguntas (Backend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring `GET /reports/desempeno/personas` and `GET /reports/desempeno/preguntas` (already merged in PR #17 with the old contract) up to the pbix-grounded contract in the spec: add the `area` filter to `/personas` plus the `kpisByYear`/`kpis` (with `calificacionMax`/`calificacionMin`)/`avgByYate`/`monthlyCalificacion`/`monthlyCompliance`/`monthlyCalificacionByYate` fields it's missing, and add `year` (on `porMes` rows) plus `porFuncionMes` to `/preguntas`.

**Architecture:** Both endpoints already share `desempenoDashboard.services.js`'s helpers (`loadEvaluations`, `matchesYate`, `scoreValue`, `complianceValue`, `monthlySeriesByYear`, `buildCargoMap`, `groupRowsBy`) — this increment reuses them exactly as `getOverview`/`getYates` already do, plus adds one new lookup (`buildAreaMap`, mirroring `buildCargoMap` but resolving `Staff.staff_departament.name` instead of `Staff.staff_position.name`) to back the new `area` filter. No new tables; everything stays computed at request time.

**Tech Stack:** Node.js, Express 4, Sequelize (MySQL), Jest + Supertest (domain tests boot the real app via `tests/helpers/testApp.js`).

**Spec:** `docs/superpowers/specs/2026-08-31-surveys-desempeno-dashboard-design.md` (§3.3, §3.4, §8)

## Global Constraints

- **No dynamic object keys anywhere in a response.** Time series stay `{ categories: string[], series: [{ name: string, data: (number|null)[] }] }`. Tabular breakdowns stay arrays of `{ etiqueta, valor }` or equivalent explicit-key objects.
- All computed averages/scores are `number | null` (`null` = no data, never `0`). All percentages are `0-100` integers.
- **`area` filter convention (spec §8, open question resolved here):** the Excel's "Área" column has no direct model field. This repo already has a `Departaments`/`staff_departament` association on `Staff` (used nowhere yet for filtering) that is structurally identical to the `Positions`/`staff_position` association `funcion` already filters on. `area` filters by `Staff.staff_departament.name`, resolved the same way `funcion` resolves `Staff.staff_position.name` — via first/last name extracted from the evaluado's free-text name (`extractNombres`/`extractApellido`, `src/utils/reportFormatting.js`).
- **`kpis.calificacionMax`/`calificacionMin` (spec §8):** max/min of the per-evaluation `calificacion` (`evaluationScore(row)`) among the rows matching the current filter — not a per-person or per-year aggregate, and not unfiltered.
- **`porFuncionMes` groups by the evaluado's función (cargo)**, resolved via the same `buildCargoMap` `/personas` already uses — rows whose evaluado has no resolvable cargo are dropped from this breakdown (same drop-null-key behavior `groupRowsBy` already has everywhere else in this file).
- Follow existing patterns exactly: controllers use `try { ... } catch (error) { next(error); }`; `@openapi` JSDoc blocks stay in sync with query params on every route in `reports.routes.js`; domain tests boot the real app via `tests/helpers/testApp.js`, fixture dates via `tests/helpers/dateFixtures.js`'s `setUpdatedAt(tableName, id, isoDateTime)` (always `T12:00:00`, never a bare date — see the original plan `2026-08-31-surveys-desempeno-dashboard-backend.md` for why).
- **`Yacht`/company/staff fixture names must not contain all-caps acronyms.** `capitalizeYachtName` (`src/utils/reportFormatting.js`) lowercases everything but the first letter of each word (Roman numerals excepted), so a fixture yacht named `"... KPI ..."` comes back as `"... Kpi ..."` from `getYates`/`getPersonas` and breaks exact-string assertions. Use plain Title Case words in test fixture names (e.g. `"Personas Kpi Yacht"`, not `"Personas KPI Yacht"`).

---

## File Structure

| File | Responsibility |
|---|---|
| `src/services/catalogs/staff.services.js` | Modified: add `Staffervice.getDepartmentsByFullNames(namePairs)`, mirroring the existing `getPositionsByFullNames` (lines 67-90) but resolving `staff_departament.name`. |
| `src/services/reports/desempenoDashboard.services.js` | Modified: add `buildAreaMap(rows)` helper; rewrite `getPersonas` to add the `area` filter and the new response fields; rewrite `getPreguntas` to add `year` on `porMes` and the new `porFuncionMes` field. |
| `src/controllers/reports/desempenoDashboard.controller.js` | Modified: `getDesempenoPersonas` reads and forwards `area`. |
| `src/routes/reports/reports.routes.js` | Modified: `/desempeno/personas`'s `@openapi` block documents the new `area` query param. |
| `tests/domain/reports/desempeno/desempenoDashboard.personas.test.js` | Modified: add tests for the `area` filter and for `kpisByYear`/`kpis.calificacionMax`/`calificacionMin`/`avgByYate`/`monthlyCalificacionByYate`. |
| `tests/domain/reports/desempeno/desempenoDashboard.preguntas.test.js` | Modified: add a test for `year` on `porMes` rows and for `porFuncionMes`. |
| `tests/domain/reports/desempeno/desempenoDashboard.routes.test.js` | Modified: extend the personas/preguntas shape assertions to cover the new top-level fields. |

---

### Task 1: `Staffervice.getDepartmentsByFullNames` + `buildAreaMap`

**Files:**
- Modify: `src/services/catalogs/staff.services.js:90` (insert after `getPositionsByFullNames`, before `getStaffCompanies`)
- Modify: `src/services/reports/desempenoDashboard.services.js:81-101` (insert `buildAreaMap` after `buildCargoMap`)

**Interfaces:**
- Consumes: `Staff` model (`departamentId` FK, `staff_departament` association — already registered, used by `getAll`/`getStaffById`), `Departaments` model (already imported in `staff.services.js` line 4 as `Departaments`), `Op` (already imported).
- Produces: `Staffervice.getDepartmentsByFullNames(namePairs: Array<{firstName, lastName}>)` → `Promise<Map<string, string|null>>` keyed by `"${firstName} ${lastName}"` — same shape as `getPositionsByFullNames`. `buildAreaMap(rows)` → `Promise<Map<string, string|null>>` keyed by the evaluado's full name — same shape as `buildCargoMap`, consumed by Task 2's `getPersonas`.

No dedicated unit test for either — both are thin, structurally identical to the already-untested `getPositionsByFullNames`/`buildCargoMap`, and are exercised end-to-end by Task 2's `area` filter domain test.

- [ ] **Step 1: Add `getDepartmentsByFullNames` to `staff.services.js`**

Insert immediately after the closing `}` of `getPositionsByFullNames` (currently `src/services/catalogs/staff.services.js:90`):

```js
    static async getDepartmentsByFullNames(namePairs) {
        try {
            if (!namePairs || namePairs.length === 0) return new Map();

            const staff = await Staff.findAll({
                where: {
                    active: true,
                    [Op.or]: namePairs.map(({ firstName, lastName }) => ({ firstName, lastName })),
                },
                attributes: ['id', 'firstName', 'lastName'],
                include: [{
                    model: Departaments,
                    as: 'staff_departament',
                    attributes: ['id', 'name'],
                }],
            });

            return new Map(
                staff.map(s => [`${s.firstName} ${s.lastName}`, s.staff_departament?.name || null])
            );
        } catch (error) {
            throw error;
        }
    }
```

- [ ] **Step 2: Add `buildAreaMap` to `desempenoDashboard.services.js`**

Insert immediately after the closing `}` of `buildCargoMap` (currently `src/services/reports/desempenoDashboard.services.js:101`), before `async function getOverview`:

```js
async function buildAreaMap(rows) {
    const uniqueEvaluados = [...new Set(rows.map((r) => r.evaluated).filter(Boolean))];
    const namePairs = uniqueEvaluados
        .map((evaluado) => ({
            fullName: evaluado,
            firstName: extractNombres(evaluado),
            lastName: extractApellido(evaluado),
        }))
        .filter(({ firstName, lastName }) => firstName && lastName);

    const areaByFullName = await Staffervice.getDepartmentsByFullNames(
        namePairs.map(({ firstName, lastName }) => ({ firstName, lastName }))
    );

    return new Map(
        namePairs.map(({ fullName, firstName, lastName }) => [
            fullName,
            areaByFullName.get(`${firstName} ${lastName}`) || null,
        ])
    );
}
```

- [ ] **Step 3: Verify the app still builds**

Run: `node -e "require('./src/services/reports/desempenoDashboard.services.js')"`
Expected: no output, exit code 0.

- [ ] **Step 4: Commit**

```bash
git add src/services/catalogs/staff.services.js src/services/reports/desempenoDashboard.services.js
git commit -m "feat: add area (departamento) lookup for the desempeno dashboard"
```

---

### Task 2: `getPersonas` — `area` filter + `kpisByYear`/`kpis`/`avgByYate`/monthly series

**Files:**
- Modify: `src/services/reports/desempenoDashboard.services.js:179-239` (replace the whole `getPersonas` function)
- Test: `tests/domain/reports/desempeno/desempenoDashboard.personas.test.js`

**Interfaces:**
- Consumes (from Task 1 and the existing file): `loadEvaluations`, `buildCargoMap`, `buildAreaMap`, `matchesYate`, `evaluationDate`, `evaluationScore`, `yateName`, `MESES`, `scoreValue`, `complianceValue`, `compliancePercent`, `quarterOf`, `monthlySeriesByYear`, `round2`, `groupRowsBy`.
- Produces: `getPersonas({ yate, evaluado, funcion, area, anio } = {})` → `Promise<{ kpisByYear: Array<{year, calificacion, compliancePercent, completadas, caducadas}>, kpis: {calificacion, calificacionMax, calificacionMin, compliancePercent, completadas, caducadas}, avgByYate: Array<{yate, calificacion}>, monthlyCalificacion: {categories, series}, monthlyCompliance: {categories, series}, monthlyCalificacionByYate: Array<{yate, categories, series}>, months: Array<{month, monthIndex}>, porEvaluado: Array<{evaluado, porMes, total}>, porEvaluadorMensual: Array<{evaluador, porMes, total}>, porEvaluadorTrimestre: Array<{evaluador, porTrimestre, total}>, comentarios: Array<{evaluado, evaluador, texto}> }>`. `porEvaluado`/`porEvaluadorMensual`/`porEvaluadorTrimestre`/`comentarios`/`months` keep their exact prior shape (unchanged fields per spec §3.3).

- [ ] **Step 1: Write the failing tests**

Replace the `const { getPersonas } = require(...)` import line and add two new `it` blocks inside the existing `describe('desempenoDashboard.services getPersonas', ...)` block in `tests/domain/reports/desempeno/desempenoDashboard.personas.test.js` — first widen the imports at the top of the file:

```js
const { bootTestApp, shutdownTestApp } = require('../../../helpers/testApp');
const { createCompanyWithYacht, createDepartment, createPosition } = require('../../../helpers/staffFixtures');
const { setUpdatedAt } = require('../../../helpers/dateFixtures');
const Form = require('../../../../src/models/operations/surveys/form.models');
const FormQuestion = require('../../../../src/models/operations/surveys/formQuestion.models');
const FormRespond = require('../../../../src/models/operations/surveys/formRespond.models');
const FormAnswers = require('../../../../src/models/operations/surveys/formAnswers.models');
const Staff = require('../../../../src/models/catalogs/staff.models');
const { getPersonas } = require('../../../../src/services/reports/desempenoDashboard.services');
```

Then add these two `it` blocks right after the existing one (before the closing `});` of the `describe`):

```js
    it('returns kpisByYear, kpis with max/min, and per-yate breakdowns scoped to the current filter', async () => {
        const caseSuffix = `${Date.now()}`;
        const yachtName = `Personas Kpi Yacht ${caseSuffix}`;
        const { company } = await createCompanyWithYacht(`Personas Kpi Co ${caseSuffix}`, yachtName);
        const form = await Form.create({ name: `Form Personas Kpi ${caseSuffix}`, positions: [] });
        const question = await FormQuestion.create({ formId: form.id, title: 'Pregunta 1', type: 'scale' });

        const high = await FormRespond.create({
            companyId: company.id, formId: form.id, state: 'Completada',
            evaluator: `Evaluador Kpi ${caseSuffix}`, evaluated: `Evaluado Kpi Alto ${caseSuffix}`,
            expirationDate: new Date('2025-08-01'),
        });
        await setUpdatedAt('form_responds', high.id, '2025-08-05T12:00:00');
        await FormAnswers.create({ respuestaId: high.id, questionId: question.id, answer: '5' });

        const low = await FormRespond.create({
            companyId: company.id, formId: form.id, state: 'Completada',
            evaluator: `Evaluador Kpi ${caseSuffix}`, evaluated: `Evaluado Kpi Bajo ${caseSuffix}`,
            expirationDate: new Date('2025-08-01'),
        });
        await setUpdatedAt('form_responds', low.id, '2025-08-10T12:00:00');
        await FormAnswers.create({ respuestaId: low.id, questionId: question.id, answer: '2' });

        const result = await getPersonas({ yate: yachtName, anio: 2025 });
        const year2025 = result.kpisByYear.find((k) => k.year === 2025);

        expect(year2025.calificacion).toBe(3.5);
        expect(result.kpis.calificacionMax).toBe(5);
        expect(result.kpis.calificacionMin).toBe(2);
        expect(result.avgByYate.find((y) => y.yate === yachtName).calificacion).toBe(3.5);
        expect(result.monthlyCalificacionByYate.find((y) => y.yate === yachtName)).toBeDefined();
    });

    it('filters by area (departamento) resolved from the evaluado staff record', async () => {
        const caseSuffix = `${Date.now()}`;
        const { company } = await createCompanyWithYacht(`Personas Area Co ${caseSuffix}`);
        const department = await createDepartment(`Cubierta ${caseSuffix}`);
        const position = await createPosition(`Marinero ${caseSuffix}`);
        const firstName = `AreaFN${caseSuffix}`;
        const lastName = 'Perez Lopez';
        await Staff.create({
            firstName,
            lastName,
            email: `area-test-${caseSuffix}@example.com`,
            cellPhone: '0966666666',
            password: 'Sup3rSecret!',
            departamentId: department.id,
            positionId: position.id,
            contractType: 'Fijo',
            active: true,
        });
        const evaluatedFullName = `${firstName} ${lastName}`;

        const form = await Form.create({ name: `Form Personas Area ${caseSuffix}`, positions: [] });
        const question = await FormQuestion.create({ formId: form.id, title: 'Pregunta 1', type: 'scale' });
        const respond = await FormRespond.create({
            companyId: company.id, formId: form.id, state: 'Completada',
            evaluator: `Evaluador Area ${caseSuffix}`, evaluated: evaluatedFullName,
            expirationDate: new Date('2025-07-01'),
        });
        await setUpdatedAt('form_responds', respond.id, '2025-07-05T12:00:00');
        await FormAnswers.create({ respuestaId: respond.id, questionId: question.id, answer: '5' });

        const matched = await getPersonas({ area: department.name, anio: 2025 });
        const unmatched = await getPersonas({ area: 'Area Que No Existe', anio: 2025 });

        expect(matched.porEvaluado.some((p) => p.evaluado === evaluatedFullName)).toBe(true);
        expect(unmatched.porEvaluado.some((p) => p.evaluado === evaluatedFullName)).toBe(false);
    });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest tests/domain/reports/desempeno/desempenoDashboard.personas.test.js`
Expected: FAIL — `result.kpisByYear` / `result.kpis.calificacionMax` / `result.avgByYate` are `undefined`, and the `area` filter is silently ignored (both `matched`/`unmatched` contain the row).

- [ ] **Step 3: Replace `getPersonas`**

Replace the whole current function (`src/services/reports/desempenoDashboard.services.js:179-239`, from `async function getPersonas({ yate, evaluado, funcion, anio } = {}) {` through its closing `}`):

```js
async function getPersonas({ yate, evaluado, funcion, area, anio } = {}) {
    const allRows = await loadEvaluations();
    const cargoMap = funcion ? await buildCargoMap(allRows) : new Map();
    const areaMap = area ? await buildAreaMap(allRows) : new Map();

    const rows = allRows.filter((row) => {
        if (!matchesYate(row, yate)) return false;
        if (evaluado && row.evaluated?.trim().toLowerCase() !== evaluado.trim().toLowerCase()) return false;
        if (funcion && (cargoMap.get(row.evaluated) || '').toLowerCase() !== funcion.trim().toLowerCase()) return false;
        if (area && (areaMap.get(row.evaluated) || '').toLowerCase() !== area.trim().toLowerCase()) return false;
        if (anio && evaluationDate(row).getFullYear() !== Number(anio)) return false;
        return true;
    });

    const years = [...new Set(rows.map((row) => evaluationDate(row).getFullYear()))].sort((a, b) => a - b);
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

    const completadas = rows.filter((row) => row.state === 'Completada').length;
    const caducadas = rows.filter((row) => row.state === 'Caducada').length;
    const scoresPerRow = rows.map(evaluationScore).filter((s) => s !== null);

    const yateGroups = new Map();
    rows.forEach((row) => {
        const rowYate = yateName(row);
        if (!rowYate) return;
        if (!yateGroups.has(rowYate)) yateGroups.set(rowYate, []);
        yateGroups.get(rowYate).push(row);
    });
    const avgByYate = [...yateGroups.entries()]
        .map(([rowYate, yateRows]) => ({ yate: rowYate, calificacion: scoreValue(yateRows) }))
        .sort((a, b) => a.yate.localeCompare(b.yate));
    const monthlyCalificacionByYate = [...yateGroups.entries()]
        .map(([rowYate, yateRows]) => ({
            yate: rowYate,
            ...monthlySeriesByYear(yateRows, scoreValue),
        }))
        .sort((a, b) => a.yate.localeCompare(b.yate));

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

    return {
        kpisByYear,
        kpis: {
            calificacion: scoreValue(rows),
            calificacionMax: scoresPerRow.length ? round2(Math.max(...scoresPerRow)) : null,
            calificacionMin: scoresPerRow.length ? round2(Math.min(...scoresPerRow)) : null,
            compliancePercent: compliancePercent(completadas, caducadas),
            completadas,
            caducadas,
        },
        avgByYate,
        monthlyCalificacion: monthlySeriesByYear(rows, scoreValue),
        monthlyCompliance: monthlySeriesByYear(rows, complianceValue),
        monthlyCalificacionByYate,
        months,
        porEvaluado,
        porEvaluadorMensual,
        porEvaluadorTrimestre,
        comentarios,
    };
}
```

`module.exports` already includes `getPersonas` by reference — no change needed there.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest tests/domain/reports/desempeno/desempenoDashboard.personas.test.js`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/services/reports/desempenoDashboard.services.js tests/domain/reports/desempeno/desempenoDashboard.personas.test.js
git commit -m "feat: add area filter and kpis/avgByYate breakdowns to desempeno personas"
```

---

### Task 3: `getPreguntas` — `year` on `porMes` + `porFuncionMes`

**Files:**
- Modify: `src/services/reports/desempenoDashboard.services.js:251-300` (replace the whole `getPreguntas` function)
- Test: `tests/domain/reports/desempeno/desempenoDashboard.preguntas.test.js`

**Interfaces:**
- Consumes: `loadEvaluations`, `buildCargoMap`, `evaluationDate`, `MESES`, `scoreValue`, `groupRowsBy`, `scoreForCompetencia` (already defined just above `getPreguntas`, unchanged).
- Produces: `getPreguntas({ evaluado, funcion, anio } = {})` → `Promise<{ competencias: string[], porMes: Array<{year, month, monthIndex, valores}>, porFuncionMes: Array<{funcion, porMes: Array<{year, month, monthIndex, valores}>}>, porEvaluador: Array<{evaluador, valores, calificacion}> }>`. `competencias` and `porEvaluador` keep their exact prior shape.
- **Behavior change:** `cargoMap` is now always built (previously only when `funcion` was passed), because `porFuncionMes` needs every row's cargo regardless of whether `funcion` is used as a filter.

- [ ] **Step 1: Write the failing test**

Widen the imports at the top of `tests/domain/reports/desempeno/desempenoDashboard.preguntas.test.js`:

```js
const { bootTestApp, shutdownTestApp } = require('../../../helpers/testApp');
const { createCompanyWithYacht, createDepartment, createPosition } = require('../../../helpers/staffFixtures');
const { setUpdatedAt } = require('../../../helpers/dateFixtures');
const Form = require('../../../../src/models/operations/surveys/form.models');
const FormQuestion = require('../../../../src/models/operations/surveys/formQuestion.models');
const FormRespond = require('../../../../src/models/operations/surveys/formRespond.models');
const FormAnswers = require('../../../../src/models/operations/surveys/formAnswers.models');
const Staff = require('../../../../src/models/catalogs/staff.models');
const { getPreguntas } = require('../../../../src/services/reports/desempenoDashboard.services');
```

Add this `it` block right after the existing one (before the closing `});` of the `describe`):

```js
    it('includes year on porMes rows and breaks calificación down by función×mes via porFuncionMes', async () => {
        const caseSuffix = `${Date.now()}`;
        const { company } = await createCompanyWithYacht(`Preguntas FuncionMes Co ${caseSuffix}`);
        const department = await createDepartment(`Cubierta ${caseSuffix}`);
        const position = await createPosition(`Capitan ${caseSuffix}`);
        const firstName = `PFM${caseSuffix}`;
        const lastName = 'Rios Vera';
        await Staff.create({
            firstName,
            lastName,
            email: `pfm-test-${caseSuffix}@example.com`,
            cellPhone: '0966666666',
            password: 'Sup3rSecret!',
            departamentId: department.id,
            positionId: position.id,
            contractType: 'Fijo',
            active: true,
        });
        const evaluatedFullName = `${firstName} ${lastName}`;

        const form = await Form.create({ name: `Form Preguntas FuncionMes ${caseSuffix}`, positions: [] });
        const question = await FormQuestion.create({ formId: form.id, title: 'Liderazgo', type: 'scale' });
        const respond = await FormRespond.create({
            companyId: company.id, formId: form.id, state: 'Completada',
            evaluator: `Evaluador FuncionMes ${caseSuffix}`, evaluated: evaluatedFullName,
            expirationDate: new Date('2025-09-01'),
        });
        await setUpdatedAt('form_responds', respond.id, '2025-09-10T12:00:00');
        await FormAnswers.create({ respuestaId: respond.id, questionId: question.id, answer: '4' });

        const result = await getPreguntas({ anio: 2025 });

        const septiembreRow = result.porMes.find((m) => m.year === 2025 && m.monthIndex === 9);
        expect(septiembreRow).toBeDefined();

        const funcionRow = result.porFuncionMes.find((f) => f.funcion === position.name);
        expect(funcionRow).toBeDefined();
        const funcionSeptiembre = funcionRow.porMes.find((m) => m.year === 2025 && m.monthIndex === 9);
        expect(funcionSeptiembre.valores.find((v) => v.etiqueta === 'Liderazgo').valor).toBe(4);
    });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/domain/reports/desempeno/desempenoDashboard.preguntas.test.js`
Expected: FAIL — `m.year` is `undefined` on existing `porMes` rows and `result.porFuncionMes` is `undefined`.

- [ ] **Step 3: Replace `getPreguntas`**

Replace the whole current function (`src/services/reports/desempenoDashboard.services.js:251-300`, from `async function getPreguntas({ evaluado, funcion, anio } = {}) {` through its closing `}`):

```js
function porMesFor(rows, competencias) {
    const yearMonthKeys = [...new Set(rows.map((row) => {
        const date = evaluationDate(row);
        return `${date.getFullYear()}-${date.getMonth()}`;
    }))]
        .map((key) => {
            const [year, monthIndex] = key.split('-').map(Number);
            return { year, monthIndex };
        })
        .sort((a, b) => (a.year - b.year) || (a.monthIndex - b.monthIndex));

    return yearMonthKeys.map(({ year, monthIndex }) => {
        const monthRows = rows.filter((row) => {
            const date = evaluationDate(row);
            return date.getFullYear() === year && date.getMonth() === monthIndex;
        });
        return {
            year,
            month: MESES[monthIndex],
            monthIndex: monthIndex + 1,
            valores: competencias.map((competencia) => ({
                etiqueta: competencia,
                valor: scoreForCompetencia(monthRows, competencia),
            })),
        };
    });
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

    const porMes = porMesFor(rows, competencias);

    const porFuncionMes = [...groupRowsBy(rows, (row) => cargoMap.get(row.evaluated) || null).entries()]
        .map(([funcionName, funcionRows]) => ({
            funcion: funcionName,
            porMes: porMesFor(funcionRows, competencias),
        }))
        .sort((a, b) => a.funcion.localeCompare(b.funcion));

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

    return { competencias, porMes, porFuncionMes, porEvaluador };
}
```

`porMesFor` is module-internal (defined above `getPreguntas`, not exported) — it replaces the inline `monthIndexesPresent`/`porMes` computation the old function had, and is reused for the top-level `porMes` and for each entry of `porFuncionMes`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/domain/reports/desempeno/desempenoDashboard.preguntas.test.js`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/services/reports/desempenoDashboard.services.js tests/domain/reports/desempeno/desempenoDashboard.preguntas.test.js
git commit -m "feat: add year and porFuncionMes to desempeno preguntas"
```

---

### Task 4: Controller, routes, and route-level shape tests

**Files:**
- Modify: `src/controllers/reports/desempenoDashboard.controller.js:29-42` (the `getDesempenoPersonas` handler)
- Modify: `src/routes/reports/reports.routes.js:251-283` (the `/desempeno/personas` `@openapi` block)
- Modify: `tests/domain/reports/desempeno/desempenoDashboard.routes.test.js`

**Interfaces:**
- Consumes: `getPersonas` (Task 2), `getPreguntas` (Task 3) — both already imported in the controller, no import changes needed.

- [ ] **Step 1: Write the failing route-test assertions**

In `tests/domain/reports/desempeno/desempenoDashboard.routes.test.js`, replace the two `it` blocks for personas and preguntas:

```js
    it('returns the personas shape, including the new yearly/per-yate breakdowns', async () => {
        const response = await withAuth(request(app).get('/api/reports/desempeno/personas'), adminToken);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('porEvaluado');
        expect(response.body).toHaveProperty('comentarios');
        expect(response.body).toHaveProperty('kpisByYear');
        expect(response.body).toHaveProperty('kpis');
        expect(response.body).toHaveProperty('avgByYate');
        expect(response.body).toHaveProperty('monthlyCalificacionByYate');
    });

    it('returns the preguntas shape, including porFuncionMes', async () => {
        const response = await withAuth(request(app).get('/api/reports/desempeno/preguntas'), adminToken);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('competencias');
        expect(response.body).toHaveProperty('porMes');
        expect(response.body).toHaveProperty('porFuncionMes');
    });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/domain/reports/desempeno/desempenoDashboard.routes.test.js`
Expected: FAIL — `response.body.kpisByYear`/`avgByYate`/`porFuncionMes` are `undefined` (controller doesn't forward `area` yet either, but that alone doesn't fail this shape assertion — Task 2/3's service change already makes these fields exist; this step should actually PASS already once Task 2/3 land. Run it anyway to confirm before touching the controller/routes.)

- [ ] **Step 3: Add `area` to the controller**

In `src/controllers/reports/desempenoDashboard.controller.js`, replace the `getDesempenoPersonas` handler:

```js
const getDesempenoPersonas = async (req, res, next) => {
    try {
        const { yate, evaluado, funcion, area, anio } = req.query;
        const personas = await getPersonas({
            yate: asString(yate),
            evaluado: asString(evaluado),
            funcion: asString(funcion),
            area: asString(area),
            anio: asString(anio),
        });
        res.status(200).json(personas);
    } catch (error) {
        next(error);
    }
};
```

- [ ] **Step 4: Document the `area` query param**

In `src/routes/reports/reports.routes.js`, inside the `/desempeno/personas` `@openapi` block, add the `area` parameter right after `funcion` (between the existing `funcion` and `anio` parameter entries):

```js
 *       - in: query
 *         name: area
 *         schema:
 *           type: string
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx jest tests/domain/reports/desempeno/desempenoDashboard.routes.test.js`
Expected: PASS (6 tests)

Run: `npx jest tests/domain/reports/desempeno`
Expected: PASS (all 5 files)

- [ ] **Step 6: Commit**

```bash
git add src/controllers/reports/desempenoDashboard.controller.js src/routes/reports/reports.routes.js tests/domain/reports/desempeno/desempenoDashboard.routes.test.js
git commit -m "feat: wire area filter and document it on the desempeno personas route"
```

---

## Self-Review Notes

- **Spec coverage:** §3.3 `area` query param → Task 2 Step 3 + Task 4 Step 3-4. §3.3 `kpisByYear`/`kpis` (incl. `calificacionMax`/`calificacionMin`)/`avgByYate`/`monthlyCalificacion`/`monthlyCompliance`/`monthlyCalificacionByYate` → Task 2 Step 3. §3.3 unchanged fields (`months`, `porEvaluado`, `porEvaluadorMensual`, `porEvaluadorTrimestre`, `comentarios`) → preserved verbatim in Task 2 Step 3's rewrite. §3.4 `year` on `porMes` → Task 3 Step 3 (`porMesFor`). §3.4 `porFuncionMes` → Task 3 Step 3. §8 `area` convention (Departaments, not a new column) → Task 1 + Global Constraints. §8 `calificacionMax`/`calificacionMin` definition → Global Constraints + Task 2 Step 3 (`scoresPerRow`, per-evaluation not per-person).
- **Placeholder scan:** no TBD/TODO; every step has runnable commands or complete code.
- **Type consistency:** `getPersonas`'s new signature `{ yate, evaluado, funcion, area, anio }` matches the controller's Task 4 Step 3 destructure exactly. `buildAreaMap`/`getDepartmentsByFullNames` (Task 1) match their call sites in Task 2 Step 3 exactly (`area ? await buildAreaMap(allRows) : new Map()`). `porMesFor(rows, competencias)` (Task 3) is defined once and reused for both the top-level `porMes` and each `porFuncionMes` entry, never redefined. `groupRowsBy` (already exported from the file, used unchanged) is reused by name in Task 3 exactly as it already is in `getPersonas`/`getPreguntas`'s `porEvaluador`.
- **Route/controller consistency:** the `area` param documented in Task 4 Step 4 matches the `req.query.area` read in Task 4 Step 3 and the `area` field `getPersonas` (Task 2) accepts.
- **Test-fixture consistency:** every new domain test follows the established pattern (`bootTestApp`/`shutdownTestApp`, `setUpdatedAt` with a noon timestamp, a `caseSuffix` from `Date.now()` to avoid cross-test collisions) and avoids all-caps acronyms in yacht/company names per the Global Constraints note on `capitalizeYachtName`.
