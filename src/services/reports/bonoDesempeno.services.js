const { Op } = require('sequelize');
const EvaluationService = require('../operations/surveys/evaluations.services');
const Staff = require('../../models/catalogs/staff.models');
const Positions = require('../../models/catalogs/positions.models');
const StaffDocumentation = require('../../models/catalogs/staffDocumentation.models');
const Documentation = require('../../models/catalogs/documentation.models');
const BonusIncident = require('../../models/reports/bonusIncident.models');
const SurveyScoring = require('../../utils/surveyScoring');

// Reglas del bono (ver "reglas para el bono.xlsx"). La nota mínima y el 100 %
// de documentos las definió RRHH; los pesos salen del Excel.
const MIN_SCORE = 4.8;
const CRITERIA = {
    cap_operaciones: { role: 'capitan', label: 'Evaluación Operaciones - Capitanes', weight: 0.4, frecuencia: 'Cada desembarque' },
    cap_administrativa: { role: 'capitan', label: 'Evaluación Administrativa - Capitanes', weight: 0.4, frecuencia: '1 vez cada 3 semanas (relevos)' },
    cap_liderazgo: { role: 'capitan', label: 'Evaluación Liderazgo - Capitanes', weight: 0.2, frecuencia: 'Semanal' },
    crew_capitan: { role: 'tripulante', label: 'Evaluación del capitán', weight: 1, frecuencia: 'Cada desembarque' },
    // Informativo: se registra y se exporta pero no pondera ni exige datos (nadie la tiene aún).
    // Para reactivarla: capitán 0.5, hotelería 0.5 y quitar `informativo`.
    crew_hoteleria: { role: 'tripulante', label: 'Evaluación de Hotelería', weight: 0, informativo: true, frecuencia: '1 vez cada 3 semanas (relevos)' },
};
// Documentos "al día": vigentes o por vencer (aún no vencidos).
const DOC_OK = ['valid', 'expiring'];

const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

// Criterio de un formulario por su nombre (los `type` legados vienen null).
function criterionOf(formName) {
    const n = norm(formName);
    if (n.includes('capitanes')) {
        if (n.includes('operaciones')) return 'cap_operaciones';
        if (n.includes('administrativa')) return 'cap_administrativa';
        if (n.includes('liderazgo')) return 'cap_liderazgo';
        return null;
    }
    if (n.includes('hoteleria')) return 'crew_hoteleria';
    if (n.includes('desempeno')) return 'crew_capitan';
    return null;
}

const round2 = (v) => (v === null ? null : Math.round(v * 100) / 100);
const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

function rowScore(row) {
    const nums = (row.respuestas || []).map((r) => SurveyScoring.asignarPuntaje(r.answer)).filter((v) => typeof v === 'number');
    return avg(nums);
}
const rowDate = (row) => (row.updatedAt ? new Date(row.updatedAt) : new Date(row.createdAt));

function semesterBounds(anio, semestre) {
    const m0 = semestre === 2 ? 6 : 0;
    return { start: new Date(anio, m0, 1), end: new Date(anio, m0 + 6, 0, 23, 59, 59, 999), m0 };
}

const isoDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : null);

// Función pura: todo el cálculo, sin tocar BD (probada en bonoDesempeno.test.js).
// `withDetail` agrega las respuestas por pregunta (solo las usa el Excel).
function buildCumplimiento({ rows, staff, docs, incidents, anio, semestre, withDetail = false }) {
    const { start, end, m0 } = semesterBounds(anio, semestre);
    const byName = new Map(staff.map((s) => [norm(`${s.firstName} ${s.lastName}`), s]));
    const quarters = [
        { key: `T${m0 / 3 + 1}`, months: [m0, m0 + 1, m0 + 2] },
        { key: `T${m0 / 3 + 2}`, months: [m0 + 3, m0 + 4, m0 + 5] },
    ];

    // staffId -> criterio -> [notas T1, notas T2] (solo evaluaciones completadas del semestre)
    const scores = new Map();
    const evals = new Map(); // staffId -> detalle de cada evaluación usada
    rows.forEach((row) => {
        const crit = criterionOf(row.formulario?.name);
        const person = byName.get(norm(row.evaluated));
        const d = rowDate(row);
        if (!crit || !person || row.state !== 'Completada' || d < start || d > end) return;
        const score = rowScore(row);
        if (score === null) return;
        const q = quarters.findIndex((qq) => qq.months.includes(d.getMonth()));
        const byCrit = scores.get(person.id) || {};
        byCrit[crit] = byCrit[crit] || [[], []];
        byCrit[crit][q].push(score);
        scores.set(person.id, byCrit);
        const list = evals.get(person.id) || [];
        list.push({
            id: row.id,
            criterio: crit,
            label: CRITERIA[crit].label,
            trimestre: quarters[q].key,
            fecha: isoDate(d),
            evaluador: row.evaluator,
            formulario: row.formulario?.name,
            empresa: row.empresa?.name,
            yate: row.empresa?.yacht?.name,
            semana: row.periodWeek,
            puntaje: round2(score),
            comentario: row.comment,
            ...(withDetail && {
                respuestas: (row.respuestas || []).map((r) => ({ pregunta: r.pregunta?.title, respuesta: r.answer, puntaje: SurveyScoring.asignarPuntaje(r.answer) })),
            }),
        });
        evals.set(person.id, list);
    });

    const personas = staff
        .filter((s) => scores.has(s.id))
        .map((s) => {
            const role = norm(s.staff_position?.name) === 'capitan' ? 'capitan' : 'tripulante';
            const mine = scores.get(s.id);
            const criterios = Object.entries(CRITERIA).filter(([, c]) => c.role === role).map(([key, c]) => {
                const porTrimestre = quarters.map((q, i) => ({
                    trimestre: q.key,
                    valor: round2(avg(mine[key]?.[i] || [])),
                    n: mine[key]?.[i]?.length || 0,
                }));
                return {
                    key, label: c.label, weight: c.weight, informativo: !!c.informativo, frecuencia: c.frecuencia, porTrimestre,
                    valor: round2(avg(porTrimestre.map((t) => t.valor).filter((v) => v !== null))),
                };
            });
            // Nota del trimestre = promedio ponderado de los criterios con datos.
            const trimestres = quarters.map((q, i) => {
                const withData = criterios.filter((c) => c.porTrimestre[i].valor !== null);
                const w = withData.reduce((a, c) => a + c.weight, 0);
                return { trimestre: q.key, valor: w ? round2(withData.reduce((a, c) => a + c.porTrimestre[i].valor * c.weight, 0) / w) : null };
            });
            const nota = round2(avg(trimestres.map((t) => t.valor).filter((v) => v !== null)));
            const sinDatos = criterios.filter((c) => !CRITERIA[c.key].informativo && c.valor === null).map((c) => c.label);

            const myDocs = docs.filter((d) => d.staffId === s.id);
            const okDocs = myDocs.filter((d) => DOC_OK.includes(d.status)).length;
            const docsPct = myDocs.length ? Math.round((okDocs / myDocs.length) * 100) : 100;
            const myIncidents = incidents.filter((i) => i.staffId === s.id);

            // La política aplica solo a quien estuvo en todos los trimestres del año (ingreso al 1 de enero o antes).
            const ingreso = s.dateEntry ? new Date(s.dateEntry) : null;
            const todoElAnio = !ingreso || ingreso <= new Date(anio, 0, 1, 23, 59, 59);

            const razones = [];
            if (!todoElAnio) razones.push(`Ingresó el ${isoDate(ingreso)}: no estuvo en todos los trimestres de ${anio}`);
            if (nota === null || nota < MIN_SCORE) razones.push(`Nota ${nota ?? '—'} menor a ${MIN_SCORE}`);
            if (sinDatos.length) razones.push(`Sin evaluaciones de: ${sinDatos.join(', ')}`);
            if (docsPct < 100) razones.push(`Documentos al día ${docsPct}% (se exige 100%)`);
            if (myIncidents.length) razones.push(`${myIncidents.length} memo(s)/incumplimiento(s) en el semestre`);
            return {
                staffId: s.id,
                nombre: `${s.firstName} ${s.lastName}`.replace(/\s+/g, ' ').trim(),
                rol: role,
                fechaIngreso: isoDate(ingreso),
                todoElAnio,
                evaluaciones: (evals.get(s.id) || []).sort((a, b) => a.fecha.localeCompare(b.fecha)),
                criterios, trimestres, nota,
                documentos: {
                    total: myDocs.length, alDia: okDocs, porcentaje: docsPct,
                    pendientes: myDocs.filter((d) => !DOC_OK.includes(d.status)).map((d) => ({ nombre: d.document?.name, estado: d.status })),
                },
                incidencias: myIncidents.map((i) => ({ id: i.id, kind: i.kind, date: i.date, description: i.description })),
                apto: razones.length === 0,
                razones,
            };
        })
        .sort((a, b) => (b.nota ?? 0) - (a.nota ?? 0));

    return { anio, semestre, minScore: MIN_SCORE, personas, resumen: { total: personas.length, aptos: personas.filter((p) => p.apto).length } };
}

async function getCumplimiento({ anio, semestre, withDetail = false } = {}) {
    const year = Number(anio) || new Date().getFullYear();
    const sem = Number(semestre) === 2 ? 2 : 1;
    const { start, end } = semesterBounds(year, sem);
    // Rango por createdAt ampliado: la fecha de la evaluación es `updatedAt`.
    const rows = await EvaluationService.getEvaluationsByCompany(undefined, new Date(start.getTime() - 45 * 864e5), new Date(end.getTime() + 45 * 864e5));
    const staff = await Staff.findAll({
        where: { active: true },
        attributes: ['id', 'firstName', 'lastName', 'dateEntry'],
        include: [{ model: Positions, as: 'staff_position', attributes: ['name'] }],
    });
    const docs = await StaffDocumentation.findAll({
        where: { staffId: { [Op.in]: staff.map((s) => s.id) } },
        include: [{ model: Documentation, as: 'document', attributes: ['name', 'required'], where: { required: true } }],
    });
    const incidents = await BonusIncident.findAll({ where: { date: { [Op.between]: [start, end] } } });
    return buildCumplimiento({ rows, staff, docs, incidents, anio: year, semestre: sem, withDetail });
}

const createIncident = ({ staffId, kind, date, description }) => BonusIncident.create({ staffId, kind, date, description });
const deleteIncident = (id) => BonusIncident.destroy({ where: { id } });

module.exports = { getCumplimiento, buildCumplimiento, criterionOf, createIncident, deleteIncident, MIN_SCORE };
