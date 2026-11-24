const moment = require('moment');
const { createReport, newSheet, writeKpis, writeTable, saveWorkbook, FIRST_ROW } = require('../../utils/excelReport');

const staffName = (staff) => `${staff?.lastName ?? ''} ${staff?.firstName ?? ''}`.trim() || 'N/A';
const daysTone = (days) => (days < 0 ? 'bad' : days <= 15 ? 'warn' : 'info');

exports.generateExpiringDocumentsReportExcel = async (records, filePath) => {
    const today = moment().startOf('day');
    const rows = records.map(({ staff, document, expiryDate }) => [
        staffName(staff),
        staff?.email || 'N/A',
        (staff?.companies ?? []).map((relation) => relation.company?.name).filter(Boolean).join(', ') || 'Sin asignar',
        document?.name || 'N/A',
        expiryDate,
        moment(expiryDate).startOf('day').diff(today, 'days'),
    ]);

    const { wb, st } = createReport();
    const ws = newSheet(wb, st, {
        name: 'Documentos por vencer',
        title: 'Documentos por vencer',
        subtitle: 'Documentos del personal próximos a vencer o vencidos',
        widths: [32, 30, 26, 32, 13, 13],
    });
    const next = writeKpis(ws, st, FIRST_ROW, [
        { label: 'Documentos', value: rows.length },
        { label: 'Colaboradores', value: new Set(rows.map((row) => row[0])).size },
        { label: 'Vencen en 15 días', value: rows.filter((row) => row[5] >= 0 && row[5] <= 15).length },
    ]);
    writeTable(ws, st, next, [
        { title: 'Colaborador', kind: 'strong' }, { title: 'Correo' }, { title: 'Empresa(s)' }, { title: 'Documento' },
        { title: 'Vence', kind: 'day' }, { title: 'Días restantes', kind: 'int', tone: daysTone },
    ], rows, { emptyText: 'No hay documentos por vencer en la ventana actual.' });

    return saveWorkbook(wb, filePath);
};

exports.generateEmbarkedTodayReportExcel = async (records, filePath) => {
    const rows = records
        .map((record) => {
            const staff = record.empresa?.staff;
            const company = record.empresa?.company;
            return [
                staffName(staff),
                staff?.email || 'N/A',
                company?.name || 'Sin asignar',
                company?.yacht?.name || 'Sin embarcación',
                record.shipmentDate,
                record.dischargeDate || 'Indefinido',
            ];
        })
        .sort((a, b) => a[0].localeCompare(b[0]));

    const { wb, st } = createReport();
    const ws = newSheet(wb, st, {
        name: 'Embarcados hoy',
        title: 'Personal embarcado hoy',
        subtitle: moment().format('DD/MM/YYYY'),
        widths: [32, 30, 26, 22, 13, 14],
    });
    const next = writeKpis(ws, st, FIRST_ROW, [
        { label: 'Embarcados', value: rows.length },
        { label: 'Embarcaciones', value: new Set(rows.map((row) => row[3])).size },
    ]);
    writeTable(ws, st, next, [
        { title: 'Colaborador', kind: 'strong' }, { title: 'Correo' }, { title: 'Empresa' }, { title: 'Embarcación' },
        { title: 'Embarque', kind: 'day' }, { title: 'Desembarque', kind: 'day' },
    ], rows, { emptyText: 'No hay personal embarcado hoy.' });

    return saveWorkbook(wb, filePath);
};
