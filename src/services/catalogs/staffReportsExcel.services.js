const xl = require('excel4node');
const moment = require('moment');

const formatDate = (value) => (value ? moment(value).format('DD/MM/YYYY') : 'N/A');

const buildWorkbook = () => {
    const wb = new xl.Workbook({ dateFormat: 'dd/mm/yyyy' });

    const titleStyle = wb.createStyle({
        alignment: { horizontal: 'center', vertical: 'center' },
        fill: { type: 'pattern', patternType: 'solid', fgColor: 'CCCCCC' },
        font: { bold: true, size: 11 },
    });

    const headerStyle = wb.createStyle({
        alignment: { horizontal: 'center', vertical: 'center' },
        fill: { type: 'pattern', patternType: 'solid', fgColor: 'DDDDDD' },
        font: { bold: true, size: 10 },
    });

    const cellStyle = wb.createStyle({
        font: { size: 9 },
        alignment: { horizontal: 'left' },
    });

    return { wb, titleStyle, headerStyle, cellStyle };
};

exports.generateExpiringDocumentsReportExcel = async (records, filePath) => {
    const { wb, titleStyle, headerStyle, cellStyle } = buildWorkbook();
    const now = moment();

    const ws = wb.addWorksheet('Documentos por vencer');
    [30, 22, 22, 30, 16, 14].forEach((width, index) => ws.column(index + 1).setWidth(width));

    ws.cell(1, 1, 1, 6, true).string('REPORTE DE DOCUMENTOS POR VENCER').style(titleStyle);
    ws.cell(2, 1, 2, 6, true).string(`Generado el ${formatDate(new Date())}`).style(titleStyle);

    const headers = ['Colaborador', 'Correo', 'Empresa(s)', 'Documento', 'Vence', 'Días restantes'];
    headers.forEach((header, colIndex) => ws.cell(4, colIndex + 1).string(header).style(headerStyle));

    let row = 5;
    records.forEach((record) => {
        const { staff, document, expiryDate } = record;
        const companyNames = (staff?.companies ?? [])
            .map((relation) => relation.company?.name)
            .filter(Boolean)
            .join(', ');
        const daysRemaining = moment(expiryDate).startOf('day').diff(now.clone().startOf('day'), 'days');

        ws.cell(row, 1).string(`${staff?.lastName ?? ''} ${staff?.firstName ?? ''}`.trim() || 'N/A').style(cellStyle);
        ws.cell(row, 2).string(staff?.email || 'N/A').style(cellStyle);
        ws.cell(row, 3).string(companyNames || 'Sin asignar').style(cellStyle);
        ws.cell(row, 4).string(document?.name || 'N/A').style(cellStyle);
        ws.cell(row, 5).string(formatDate(expiryDate)).style(cellStyle);
        ws.cell(row, 6).number(daysRemaining).style(cellStyle);
        row++;
    });

    if (records.length === 0) {
        ws.cell(row, 1, row, 6, true).string('No hay documentos por vencer en la ventana actual.').style(cellStyle);
    }

    await new Promise((resolve, reject) => {
        wb.write(filePath, (err) => (err ? reject(err) : resolve()));
    });

    return filePath;
};

exports.generateEmbarkedTodayReportExcel = async (records, filePath) => {
    const { wb, titleStyle, headerStyle, cellStyle } = buildWorkbook();

    const ws = wb.addWorksheet('Embarcados hoy');
    [30, 22, 26, 22, 16, 16].forEach((width, index) => ws.column(index + 1).setWidth(width));

    ws.cell(1, 1, 1, 6, true).string('REPORTE DE PERSONAL EMBARCADO HOY').style(titleStyle);
    ws.cell(2, 1, 2, 6, true).string(`Generado el ${formatDate(new Date())}`).style(titleStyle);

    const headers = ['Colaborador', 'Correo', 'Empresa', 'Embarcación', 'Embarque', 'Desembarque'];
    headers.forEach((header, colIndex) => ws.cell(4, colIndex + 1).string(header).style(headerStyle));

    const sortedRecords = [...records].sort((a, b) => {
        const nameA = `${a.empresa?.staff?.lastName ?? ''} ${a.empresa?.staff?.firstName ?? ''}`;
        const nameB = `${b.empresa?.staff?.lastName ?? ''} ${b.empresa?.staff?.firstName ?? ''}`;
        return nameA.localeCompare(nameB);
    });

    let row = 5;
    sortedRecords.forEach((record) => {
        const staff = record.empresa?.staff;
        const company = record.empresa?.company;

        ws.cell(row, 1).string(`${staff?.lastName ?? ''} ${staff?.firstName ?? ''}`.trim() || 'N/A').style(cellStyle);
        ws.cell(row, 2).string(staff?.email || 'N/A').style(cellStyle);
        ws.cell(row, 3).string(company?.name || 'Sin asignar').style(cellStyle);
        ws.cell(row, 4).string(company?.yacht?.name || 'Sin embarcación').style(cellStyle);
        ws.cell(row, 5).string(formatDate(record.shipmentDate)).style(cellStyle);
        ws.cell(row, 6).string(record.dischargeDate ? formatDate(record.dischargeDate) : 'Indefinido').style(cellStyle);
        row++;
    });

    if (sortedRecords.length === 0) {
        ws.cell(row, 1, row, 6, true).string('No hay personal embarcado hoy.').style(cellStyle);
    }

    await new Promise((resolve, reject) => {
        wb.write(filePath, (err) => (err ? reject(err) : resolve()));
    });

    return filePath;
};
