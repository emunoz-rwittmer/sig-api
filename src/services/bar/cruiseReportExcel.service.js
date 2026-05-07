const path = require('path');
const xl = require('excel4node');
const Utils = require('../../utils/Utils');

exports.generateCruiseReportExcel = async (cruise, passengers, filePath) => {
  try {
    const wb = new xl.Workbook({
      dateFormat: 'dd/mm/yyyy hh:mm:ss',
    });

    // Sheet 1: Información del Crucero
    const wsCruise = wb.addWorksheet('Crucero');

    // Estilos minimalistas para reducir tamaño
    const titleStyle = wb.createStyle({
      alignment: { horizontal: 'center', vertical: 'center' },
      fill: {
        type: 'pattern',
        patternType: 'solid',
        fgColor: 'CCCCCC',
      },
      font: {
        bold: true,
        size: 11,
      },
    });

    const headerStyle = wb.createStyle({
      alignment: { horizontal: 'center', vertical: 'center' },
      fill: {
        type: 'pattern',
        patternType: 'solid',
        fgColor: 'DDDDDD',
      },
      font: {
        bold: true,
        size: 10,
      },
    });

    const labelStyle = wb.createStyle({
      font: { bold: true, size: 10 },
      alignment: { horizontal: 'left' },
    });

    const cellStyle = wb.createStyle({
      font: { size: 9 },
      alignment: { horizontal: 'left' },
    });

    // Ancho de columnas optimizado
    wsCruise.column(1).setWidth(20);
    wsCruise.column(2).setWidth(40);

    // Título
    wsCruise.cell(1, 1, 1, 2, true).string(`INFORMACIÓN DEL CRUCERO (${cruise.yacht?.name})`).style(titleStyle);

    // Información del crucero
    let row = 3;
    wsCruise.cell(row, 1).string('Código:').style(labelStyle);
    wsCruise.cell(row, 2).string(cruise.code).style(cellStyle);
    row++;

    wsCruise.cell(row, 1).string('Nombre:').style(labelStyle);
    wsCruise.cell(row, 2).string(cruise.name).style(cellStyle);
    row++;

    wsCruise.cell(row, 1).string('Yacht:').style(labelStyle);
    wsCruise.cell(row, 2).string(cruise.yacht?.name || 'N/A').style(cellStyle);
    row++;

    wsCruise.cell(row, 1).string('Itinerario:').style(labelStyle);
    wsCruise.cell(row, 2).string(cruise.itinerary).style(cellStyle);
    row++;

    wsCruise.cell(row, 1).string('Fecha Inicio:').style(labelStyle);
    wsCruise.cell(row, 2).string(Utils.formatDateToLocal(cruise.startDate)).style(cellStyle);
    row++;

    wsCruise.cell(row, 1).string('Fecha Fin:').style(labelStyle);
    wsCruise.cell(row, 2).string(Utils.formatDateToLocal(cruise.endDate)).style(cellStyle);
    row++;

    wsCruise.cell(row, 1).string('Barman:').style(labelStyle);
    wsCruise.cell(row, 2).string(cruise.barman).style(cellStyle);
    row++;

    // Columnas optimizadas para tabla
    wsCruise.column(3).setWidth(20);
    wsCruise.column(4).setWidth(18);
    wsCruise.column(5).setWidth(12);
    wsCruise.column(6).setWidth(12);
    wsCruise.column(7).setWidth(12);
    wsCruise.column(8).setWidth(12);
    wsCruise.column(9).setWidth(12);
    wsCruise.column(10).setWidth(12);
    wsCruise.column(11).setWidth(10);

    // Encabezados
    wsCruise.cell(11, 1, 11, 11, true).string('CONSUMER CARDS - PASAJEROS CON CONSUMO').style(titleStyle);

    // Headers de tabla
    const headers = ['Pasajero', 'Pasaporte Nº', 'Nacionalidad', 'Tarjeta', 'SubTotal', 'IVA 15%', 'Total', 'Metodo de Pago', 'Recibo Nº', 'Cuenta Pagada', 'Items'];
    headers.forEach((header, colIndex) => {
      wsCruise.cell(13, colIndex + 1).string(header).style(headerStyle);
    });

    // Datos
    let dataRow = 14;
    let totalGeneral = 0;

    passengers.forEach((passenger) => {
      if (passenger.consumer_card && passenger.consumer_card.totalCount > 0 && passenger.consumer_card.paidAccount === true) {
        const itemCount = passenger.consumer_card.items?.length || 0;
        const subtotal = (passenger.consumer_card.totalCount / 1.15).toFixed(2);
        const iva = (subtotal * 0.15).toFixed(2);

        wsCruise.cell(dataRow, 1).string(passenger.name).style(cellStyle);
        wsCruise.cell(dataRow, 2).string(passenger.identificationNumber).style(cellStyle);
        wsCruise.cell(dataRow, 3).string(passenger.country).style(cellStyle);
        wsCruise.cell(dataRow, 4).string(passenger.consumer_card.numberCard).style(cellStyle);
        wsCruise.cell(dataRow, 5).string(subtotal).style(cellStyle);
        wsCruise.cell(dataRow, 6).string(iva).style(cellStyle);
        wsCruise.cell(dataRow, 7).string(passenger.consumer_card.totalCount).style(cellStyle);
        wsCruise.cell(dataRow, 8).string(passenger.consumer_card.paymentType || 'N/A').style(cellStyle);
        wsCruise.cell(dataRow, 9).string(passenger.consumer_card.receiptNumber || 'N/A').style(cellStyle);
        wsCruise.cell(dataRow, 10).string(passenger.consumer_card.paidAccount ? 'Sí' : 'No').style(cellStyle);
        wsCruise.cell(dataRow, 11).number(itemCount).style(cellStyle);

        totalGeneral += Number(passenger.consumer_card.totalCount);
        dataRow++;
      }
    });

    // Fila de total
    wsCruise.cell(dataRow + 1, 2).string('TOTAL GENERAL:').style(labelStyle);
    wsCruise.cell(dataRow + 1, 3).string(totalGeneral).style(headerStyle);

    // Sheet 2: Detalle de Items (solo si es necesario)
    const wsItems = wb.addWorksheet('Detalle Items');

    wsItems.column(1).setWidth(20);
    wsItems.column(2).setWidth(22);
    wsItems.column(3).setWidth(12);
    wsItems.column(4).setWidth(12);
    wsItems.column(5).setWidth(12);

    wsItems.cell(1, 1, 1, 5, true).string('DETALLE DE ITEMS CONSUMIDOS').style(titleStyle);

    const itemHeaders = ['Pasajero', 'Producto', 'Cantidad', 'Precio Unit.', 'Total'];
    itemHeaders.forEach((header, colIndex) => {
      wsItems.cell(3, colIndex + 1).string(header).style(headerStyle);
    });

    let itemRow = 4;
    passengers.forEach((passenger) => {
      if (passenger.consumer_card && passenger.consumer_card.totalCount > 0 && passenger.consumer_card.paidAccount === true) {
        const items = passenger.consumer_card.items || [];

        items.forEach((item, index) => {
          if (index === 0) {
            wsItems.cell(itemRow, 1).string(passenger.name).style(cellStyle);
          }

          wsItems.cell(itemRow, 2).string(item.product?.name || 'N/A').style(cellStyle);
          wsItems.cell(itemRow, 3).number(item.quantity).style(cellStyle);
          wsItems.cell(itemRow, 4).number(item.product?.price || 0).style(cellStyle);
          wsItems.cell(itemRow, 5).string(item.price).style(cellStyle);

          itemRow++;
        });
      }
    });

    // Escribir archivo
    await new Promise((resolve, reject) => {
      wb.write(filePath, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    return filePath;
  } catch (error) {
    throw error;
  }
};
