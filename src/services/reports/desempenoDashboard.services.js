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
    const years = [...new Set(rows.map((row) => evaluationDate(row).getFullYear()))].sort((a, b) => a - b);
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

async function getOverview(yateFilter) {
    const rows = (await loadEvaluations()).filter((row) => matchesYate(row, yateFilter));
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

    const yateGroups = new Map();
    rows.forEach((row) => {
        const yate = yateName(row);
        if (!yate) return;
        if (!yateGroups.has(yate)) yateGroups.set(yate, []);
        yateGroups.get(yate).push(row);
    });
    const avgByYate = [...yateGroups.entries()]
        .map(([yate, yateRows]) => {
            const yateCompletadas = yateRows.filter((row) => row.state === 'Completada').length;
            const yateCaducadas = yateRows.filter((row) => row.state === 'Caducada').length;
            return {
                yate,
                calificacion: scoreValue(yateRows),
                compliancePercent: compliancePercent(yateCompletadas, yateCaducadas),
                completadas: yateCompletadas,
                caducadas: yateCaducadas,
            };
        })
        .sort((a, b) => a.yate.localeCompare(b.yate));

    const rowsByDateDesc = [...rows].sort((a, b) => evaluationDate(b) - evaluationDate(a));
    const recentEvaluations = rowsByDateDesc.slice(0, 8).map((row) => ({
        evaluado: row.evaluated,
        evaluador: row.evaluator,
        yate: yateName(row),
        fecha: evaluationDate(row),
        estado: row.state,
        calificacion: round2(evaluationScore(row)),
    }));

    const evaluadoGroups = new Map();
    rows.forEach((row) => {
        if (!row.evaluated) return;
        if (!evaluadoGroups.has(row.evaluated)) evaluadoGroups.set(row.evaluated, []);
        evaluadoGroups.get(row.evaluated).push(row);
    });
    const topEvaluados = [...evaluadoGroups.entries()]
        .map(([evaluado, personRows]) => {
            const mostRecent = [...personRows].sort((a, b) => evaluationDate(b) - evaluationDate(a))[0];
            return {
                evaluado,
                yate: yateName(mostRecent),
                calificacion: scoreValue(personRows),
                evaluaciones: personRows.length,
            };
        })
        .filter((entry) => entry.calificacion !== null)
        .sort((a, b) => b.calificacion - a.calificacion)
        .slice(0, 5);

    return {
        years,
        kpisByYear,
        avgByYate,
        recentEvaluations,
        topEvaluados,
        monthlyCalificacion: monthlySeriesByYear(rows, scoreValue),
        monthlyCompliance: monthlySeriesByYear(rows, complianceValue),
    };
}

async function getYates(yateFilter, anioFilter) {
    const allRows = await loadEvaluations();
    const years = [...new Set(allRows.map((row) => evaluationDate(row).getFullYear()))].sort((a, b) => a - b);

    const yateFilteredRows = allRows.filter((row) => matchesYate(row, yateFilter));
    const kpisByYear = years.map((year) => {
        const yearRows = yateFilteredRows.filter((row) => evaluationDate(row).getFullYear() === year);
        const yearCompletadas = yearRows.filter((row) => row.state === 'Completada').length;
        const yearCaducadas = yearRows.filter((row) => row.state === 'Caducada').length;
        return {
            year,
            calificacion: scoreValue(yearRows),
            compliancePercent: compliancePercent(yearCompletadas, yearCaducadas),
            completadas: yearCompletadas,
            caducadas: yearCaducadas,
        };
    });

    // Comparativas de flota (avgByYate, radar, monthlyCalificacionByYate) se acotan solo por año,
    // nunca por yate — siguen mostrando las 4 embarcaciones aunque haya una seleccionada.
    const yearRows = anioFilter ? allRows.filter((row) => evaluationDate(row).getFullYear() === Number(anioFilter)) : allRows;

    const yateGroups = new Map();
    yearRows.forEach((row) => {
        const yate = yateName(row);
        if (!yate) return;
        if (!yateGroups.has(yate)) yateGroups.set(yate, []);
        yateGroups.get(yate).push(row);
    });

    const avgByYate = [...yateGroups.entries()]
        .map(([yate, yateRows]) => {
            const yateCompletadas = yateRows.filter((row) => row.state === 'Completada').length;
            const yateCaducadas = yateRows.filter((row) => row.state === 'Caducada').length;
            return {
                yate,
                calificacion: scoreValue(yateRows),
                compliancePercent: compliancePercent(yateCompletadas, yateCaducadas),
                completadas: yateCompletadas,
                caducadas: yateCaducadas,
            };
        })
        .sort((a, b) => a.yate.localeCompare(b.yate));

    const competenciaCounts = new Map();
    yearRows.forEach((row) => {
        (row.respuestas || []).forEach((r) => {
            const title = r.pregunta?.title;
            if (!title || typeof SurveyScoring.asignarPuntaje(r.answer) !== 'number') return;
            competenciaCounts.set(title, (competenciaCounts.get(title) || 0) + 1);
        });
    });
    const radarCompetencias = [...competenciaCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([title]) => title);

    const radarByYate = [...yateGroups.entries()]
        .map(([yate, yateRows]) => ({
            yate,
            valores: radarCompetencias.map((competencia) => scoreForCompetencia(yateRows, competencia)),
        }))
        .sort((a, b) => a.yate.localeCompare(b.yate));

    const monthlyCalificacionByYate = [...yateGroups.entries()]
        .map(([yate, yateRows]) => ({
            yate,
            ...monthlySeriesByYear(yateRows, scoreValue),
        }))
        .sort((a, b) => a.yate.localeCompare(b.yate));

    // Igual que arriba pero con el filtro de yate aplicado — kpis y series mensuales sí
    // quedan acotados a "ese barco y ese año" cuando ambos filtros están presentes.
    const scoped = yearRows.filter((row) => matchesYate(row, yateFilter));
    const completadas = scoped.filter((row) => row.state === 'Completada').length;
    const caducadas = scoped.filter((row) => row.state === 'Caducada').length;

    return {
        years,
        kpisByYear,
        avgByYate,
        radar: { competencias: radarCompetencias, series: radarByYate },
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

async function getPersonas({ yate, evaluado, funcion, area, anio, tipoEvaluacion } = {}) {
    const allRows = await loadEvaluations();
    const cargoMap = funcion ? await buildCargoMap(allRows) : new Map();
    const areaMap = area ? await buildAreaMap(allRows) : new Map();
    // tipoEvaluacion: 'liderazgo' -> formulario.isAdministrative === false, 'administrativa' -> === true.
    const wantsAdministrative = tipoEvaluacion === 'administrativa' ? true : tipoEvaluacion === 'liderazgo' ? false : null;

    // "Quién" (yate/función/área/tipo de evaluación) sin año ni evaluado — de
    // aquí sale kpisByYear (tendencia por año de ese conjunto, sin importar
    // qué año esté filtrado).
    const baseRows = allRows.filter((row) => {
        if (!matchesYate(row, yate)) return false;
        if (funcion && (cargoMap.get(row.evaluated) || '').toLowerCase() !== funcion.trim().toLowerCase()) return false;
        if (area && (areaMap.get(row.evaluated) || '').toLowerCase() !== area.trim().toLowerCase()) return false;
        if (wantsAdministrative !== null && row.formulario?.isAdministrative !== wantsAdministrative) return false;
        return true;
    });

    const years = [...new Set(baseRows.map((row) => evaluationDate(row).getFullYear()))].sort((a, b) => a - b);
    const kpisByYear = years.map((year) => {
        const yearRows = baseRows.filter((row) => evaluationDate(row).getFullYear() === year);
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

    // Acotado por año (si se filtra) pero nunca por evaluado — ranking/comparativas
    // (porEvaluado, avgByYate, monthlyCalificacionByYate) siguen mostrando a todos
    // los evaluados/yates de ese año aunque haya uno seleccionado.
    const yearRows = anio ? baseRows.filter((row) => evaluationDate(row).getFullYear() === Number(anio)) : baseRows;

    const yateGroups = new Map();
    yearRows.forEach((row) => {
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

    const monthIndexesPresent = [...new Set(yearRows.map((row) => evaluationDate(row).getMonth()))].sort((a, b) => a - b);
    const months = monthIndexesPresent.map((monthIndex) => ({ month: MESES[monthIndex], monthIndex: monthIndex + 1 }));

    const porEvaluado = [...groupRowsBy(yearRows, (row) => row.evaluated).entries()]
        .map(([evaluadoName, personRows]) => {
            const personCompletadas = personRows.filter((row) => row.state === 'Completada').length;
            const personCaducadas = personRows.filter((row) => row.state === 'Caducada').length;
            return {
                evaluado: evaluadoName,
                porMes: months.map(({ month, monthIndex }) => ({
                    month,
                    monthIndex,
                    valor: scoreValue(personRows.filter((row) => evaluationDate(row).getMonth() === monthIndex - 1)),
                })),
                total: scoreValue(personRows),
                compliancePercent: compliancePercent(personCompletadas, personCaducadas),
                completadas: personCompletadas,
                caducadas: personCaducadas,
            };
        })
        .sort((a, b) => a.evaluado.localeCompare(b.evaluado));

    // Acotado también por evaluado — el resto de campos son el "drill-down" del
    // filtro completo (kpis, series mensuales, comentarios, por evaluador).
    const scoped = yearRows.filter((row) => (
        !evaluado || row.evaluated?.trim().toLowerCase() === evaluado.trim().toLowerCase()
    ));

    const completadas = scoped.filter((row) => row.state === 'Completada').length;
    const caducadas = scoped.filter((row) => row.state === 'Caducada').length;
    const scoresPerRow = scoped.map(evaluationScore).filter((s) => s !== null);

    const porEvaluadorMensual = [...groupRowsBy(scoped, (row) => row.evaluator).entries()]
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

    const porEvaluadorTrimestre = [...groupRowsBy(scoped, (row) => row.evaluator).entries()]
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

    // `scoped` ya viene ordenado por fecha descendente (loadEvaluations hace
    // ORDER BY createdAt DESC) — se limita a las 30 más recientes; sin filtro
    // esto puede ser el historial completo de la flota (miles de filas).
    const comentarios = scoped.flatMap((row) =>
        (row.respuestas || [])
            .filter((r) => r.answer && typeof SurveyScoring.asignarPuntaje(r.answer) !== 'number')
            .map((r) => ({ evaluado: row.evaluated, evaluador: row.evaluator, texto: r.answer }))
    ).slice(0, 30);

    return {
        years,
        kpisByYear,
        kpis: {
            calificacion: scoreValue(scoped),
            calificacionMax: scoresPerRow.length ? round2(Math.max(...scoresPerRow)) : null,
            calificacionMin: scoresPerRow.length ? round2(Math.min(...scoresPerRow)) : null,
            compliancePercent: compliancePercent(completadas, caducadas),
            completadas,
            caducadas,
        },
        avgByYate,
        monthlyCalificacion: monthlySeriesByYear(scoped, scoreValue),
        monthlyCompliance: monthlySeriesByYear(scoped, complianceValue),
        monthlyCalificacionByYate,
        months,
        porEvaluado,
        porEvaluadorMensual,
        porEvaluadorTrimestre,
        comentarios,
    };
}

function scoreForCompetencia(rows, competencia) {
    const numeric = rows.flatMap((row) =>
        (row.respuestas || [])
            .filter((r) => r.pregunta?.title === competencia)
            .map((r) => SurveyScoring.asignarPuntaje(r.answer))
            .filter((v) => typeof v === 'number')
    );
    return round2(average(numeric));
}

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
    getYates,
    getPersonas,
    getPreguntas,
};
