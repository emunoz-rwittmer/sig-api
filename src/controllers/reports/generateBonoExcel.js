const xl = require('excel4node');
const Bono = require('../../services/reports/bonoDesempeno.services');
const AppError = require('../../errors/AppError');

const KIND = { memo: 'Memo', reglamento: 'Incumplimiento de reglamento' };
const DOC_STATE = { expired: 'Vencido', pending: 'Pendiente' };
const ROL = { capitan: 'Capitán', tripulante: 'Tripulante' };

// Una hoja = encabezado + filas (arrays alineados a `cols`). Números como número, el resto como texto.
function addSheet(wb, name, cols, rows) {
    const ws = wb.addWorksheet(name);
    const head = wb.createStyle({
        font: { bold: true, color: 'FFFFFF' },
        fill: { type: 'pattern', patternType: 'solid', fgColor: '0B2A45' },
        alignment: { vertical: 'center', wrapText: true },
    });
    cols.forEach(([title, width], c) => {
        ws.column(c + 1).setWidth(width);
        ws.cell(1, c + 1).string(title).style(head);
    });
    rows.forEach((r, i) => r.forEach((v, c) => {
        const cell = ws.cell(i + 2, c + 1);
        if (typeof v === 'number') cell.number(v);
        else cell.string(v === null || v === undefined ? '' : String(v));
    }));
    ws.row(1).freeze();
    if (rows.length) ws.row(1).filter({ firstColumn: 1, lastColumn: cols.length });
}

const generateBonoExcel = async (req, res, next) => {
    try {
        const { anio, semestre, staffId } = req.query;
        const data = await Bono.getCumplimiento({ anio, semestre, withDetail: true });
        const personas = staffId ? data.personas.filter((p) => String(p.staffId) === String(staffId)) : data.personas;
        if (!personas.length) throw new AppError('Sin datos del bono para esa selección', 404);

        const wb = new xl.Workbook({ defaultFont: { name: 'Calibri', size: 10 }, author: 'Rolf Wittmer SIG' });

        addSheet(wb, 'Resumen', [
            ['Persona', 30], ['Rol', 12], ['Fecha de ingreso', 15], ['Todo el año', 12],
            [`Nota ${personas[0].trimestres[0].trimestre}`, 10], [`Nota ${personas[0].trimestres[1].trimestre}`, 10], ['Nota semestre', 13],
            ['Documentos al día %', 18], ['Memos / incumplimientos', 22], ['Apto al bono', 13], ['Motivos', 70],
        ], personas.map((p) => [
            p.nombre, ROL[p.rol], p.fechaIngreso, p.todoElAnio ? 'Sí' : 'No',
            p.trimestres[0].valor, p.trimestres[1].valor, p.nota,
            p.documentos.porcentaje, p.incidencias.length, p.apto ? 'Sí' : 'No', p.razones.join(' | '),
        ]));

        addSheet(wb, 'Evaluaciones', [
            ['Persona', 30], ['Rol', 12], ['Criterio', 36], ['Pondera', 10], ['Trimestre', 10], ['Fecha', 12],
            ['Evaluó', 30], ['Formulario', 36], ['Yate', 22], ['Empresa', 22], ['Semana', 14], ['Puntaje', 10], ['Comentario', 50],
        ], personas.flatMap((p) => p.evaluaciones.map((e) => [
            p.nombre, ROL[p.rol], e.label, p.criterios.find((c) => c.key === e.criterio)?.informativo ? 'No (informativo)' : 'Sí',
            e.trimestre, e.fecha, e.evaluador, e.formulario, e.yate, e.empresa, e.semana, e.puntaje, e.comentario,
        ])));

        addSheet(wb, 'Respuestas', [
            ['Persona', 30], ['Criterio', 36], ['Fecha', 12], ['Evaluó', 30], ['Pregunta', 60], ['Respuesta', 30], ['Puntaje', 10],
        ], personas.flatMap((p) => p.evaluaciones.flatMap((e) => e.respuestas.map((r) => [
            p.nombre, e.label, e.fecha, e.evaluador, r.pregunta, r.respuesta, typeof r.puntaje === 'number' ? r.puntaje : '',
        ]))));

        addSheet(wb, 'Memos y documentos', [['Persona', 30], ['Tipo', 30], ['Fecha / estado', 16], ['Detalle', 60]],
            personas.flatMap((p) => [
                ...p.incidencias.map((i) => [p.nombre, KIND[i.kind] ?? i.kind, i.date, i.description]),
                ...p.documentos.pendientes.map((d) => [p.nombre, 'Documento pendiente', DOC_STATE[d.estado] ?? d.estado, d.nombre]),
            ]));

        const name = personas.length === 1 && staffId ? personas[0].nombre.replace(/[^\w]+/g, '_') : 'general';
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=bono_${data.anio}_S${data.semestre}_${name}.xlsx`);
        res.status(200).send(await wb.writeToBuffer());
    } catch (error) {
        next(error);
    }
};

module.exports = { generateBonoExcel };
