const path = require('path');
const xl = require('excel4node');
const Utils = require('../../utils/Utils');

exports.generateConsumerCardReportExcel = async (yachtName, consumerCards, cortecyCards, filePath) => {
  try {
    const wb = new xl.Workbook({
      dateFormat: 'dd/mm/yyyy hh:mm:ss',
    });

    // Estilos
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

    // Sheet 1: Consumer Cards
    const wsConsumer = wb.addWorksheet('Consumer Cards');

    wsConsumer.column(1).setWidth(20);
    wsConsumer.column(2).setWidth(18);
    wsConsumer.column(3).setWidth(20);
    wsConsumer.column(4).setWidth(15);
    wsConsumer.column(5).setWidth(12);
    wsConsumer.column(6).setWidth(12);
    wsConsumer.column(7).setWidth(12);
    wsConsumer.column(8).setWidth(15);
    wsConsumer.column(9).setWidth(12);
    wsConsumer.column(10).setWidth(12);
    wsConsumer.column(11).setWidth(10);

    // Título
    wsConsumer.cell(1, 1, 1, 11, true).string(`REPORTE DE CONSUMER CARDS - YATE: ${yachtName}`).style(titleStyle);

    // Headers
    const consumerHeaders = ['Pasajero', 'Identificación', 'Camarote', 'Tarjeta Nº', 'SubTotal', 'IVA 15%', 'Total', 'Método Pago', 'Recibo Nº', 'Cuenta Pagada', 'Items'];
    consumerHeaders.forEach((header, colIndex) => {
      wsConsumer.cell(3, colIndex + 1).string(header).style(headerStyle);
    });

    // Datos Consumer Cards
    let consumerRow = 4;
    let totalConsumerSubtotal = 0.00;
    let totalConsumerIva = 0.00;
    let totalConsumerTotal = 0.00;

    consumerCards.forEach((card) => {
      if (card.passenger) {
        const itemCount = card.items?.length || 0;
        const subtotal = parseFloat((card.totalCount / 1.15).toFixed(2));
        const iva = parseFloat((subtotal * 0.15).toFixed(2));

        wsConsumer.cell(consumerRow, 1).string(card.passenger.name).style(cellStyle);
        wsConsumer.cell(consumerRow, 2).string(card.passenger.identificationNumber).style(cellStyle);
        wsConsumer.cell(consumerRow, 3).string(card.passenger.cabin).style(cellStyle);
        wsConsumer.cell(consumerRow, 4).string(card.numberCard).style(cellStyle);
        wsConsumer.cell(consumerRow, 5).string(subtotal.toString()).style(cellStyle);
        wsConsumer.cell(consumerRow, 6).string(iva.toString()).style(cellStyle);
        wsConsumer.cell(consumerRow, 7).string(card.totalCount.toString()).style(cellStyle);
        wsConsumer.cell(consumerRow, 8).string(card.paymentType || 'N/A').style(cellStyle);
        wsConsumer.cell(consumerRow, 9).string(card.receiptNumber || 'N/A').style(cellStyle);
        wsConsumer.cell(consumerRow, 10).string(card.paidAccount ? 'Sí' : 'No').style(cellStyle);
        wsConsumer.cell(consumerRow, 11).number(itemCount).style(cellStyle);

        totalConsumerSubtotal += subtotal;
        totalConsumerIva += iva;
        totalConsumerTotal += Number(card.totalCount);
        consumerRow++;
      }
    });

    // Fila de totales Consumer
    wsConsumer.cell(consumerRow + 1, 2).string('TOTALES:').style(labelStyle);
    wsConsumer.cell(consumerRow + 1, 5).string(totalConsumerSubtotal.toFixed(2)).style(headerStyle);
    wsConsumer.cell(consumerRow + 1, 6).string(totalConsumerIva.toFixed(2)).style(headerStyle);
    wsConsumer.cell(consumerRow + 1, 7).string(totalConsumerTotal.toFixed(2)).style(headerStyle);

    // Sheet 2: Cortecy Cards
    const wsCortecy = wb.addWorksheet('Cortecy Cards');

    wsCortecy.column(1).setWidth(20);
    wsCortecy.column(2).setWidth(18);
    wsCortecy.column(3).setWidth(20);
    wsCortecy.column(4).setWidth(15);
    wsCortecy.column(5).setWidth(12);
    wsCortecy.column(6).setWidth(12);
    wsCortecy.column(7).setWidth(12);
    wsCortecy.column(8).setWidth(15);
    wsCortecy.column(9).setWidth(12);
    wsCortecy.column(10).setWidth(10);

    wsCortecy.cell(1, 1, 1, 10, true).string(`REPORTE DE CORTECY CARDS - YATE: ${yachtName}`).style(titleStyle);

    const cortecyHeaders = ['Crucero', 'Tarjeta Nº', 'SubTotal', 'IVA 15%', 'Total', 'Observación', 'Items', 'Creada', 'Estado', ''];
    cortecyHeaders.forEach((header, colIndex) => {
      wsCortecy.cell(3, colIndex + 1).string(header).style(headerStyle);
    });

    let cortecyRow = 4;
    let totalCortecy = 0.00;

    cortecyCards.forEach((card) => {
      const itemCount = card.items?.length || 0;
      const subtotal = (card.totalCount / 1.15).toFixed(2);
      const iva = (subtotal * 0.15).toFixed(2);

      wsCortecy.cell(cortecyRow, 1).string(card.cruise?.name || 'N/A').style(cellStyle);
      wsCortecy.cell(cortecyRow, 2).string(card.numberCard).style(cellStyle);
      wsCortecy.cell(cortecyRow, 3).string(subtotal).style(cellStyle);
      wsCortecy.cell(cortecyRow, 4).string(iva).style(cellStyle);
      wsCortecy.cell(cortecyRow, 5).string(card.totalCount.toString()).style(cellStyle);
      wsCortecy.cell(cortecyRow, 6).string(card.observation || 'N/A').style(cellStyle);
      wsCortecy.cell(cortecyRow, 7).number(itemCount).style(cellStyle);
      wsCortecy.cell(cortecyRow, 8).string(Utils.formatDateToLocal(card.createdAt)).style(cellStyle);
      wsCortecy.cell(cortecyRow, 9).string(card.status || 'Activa').style(cellStyle);

      totalCortecy += Number(card.totalCount);
      cortecyRow++;
    });

    // Fila de total Cortecy
    wsCortecy.cell(cortecyRow + 1, 2).string('TOTAL CORTECY CARDS:').style(labelStyle);
    wsCortecy.cell(cortecyRow + 1, 5).string(totalCortecy.toString()).style(headerStyle);

    // Sheet 3: Detalle de Items
    const wsItems = wb.addWorksheet('Detalle Items');

    wsItems.column(1).setWidth(20);
    wsItems.column(2).setWidth(15);
    wsItems.column(3).setWidth(22);
    wsItems.column(4).setWidth(12);
    wsItems.column(5).setWidth(12);
    wsItems.column(6).setWidth(12);

    wsItems.cell(1, 1, 1, 6, true).string('DETALLE DE ITEMS CONSUMIDOS').style(titleStyle);

    const itemHeaders = ['Tipo', 'Tarjeta Nº', 'Producto', 'Cantidad', 'Precio Unit.', 'Total'];
    itemHeaders.forEach((header, colIndex) => {
      wsItems.cell(3, colIndex + 1).string(header).style(headerStyle);
    });

    let itemRow = 4;

    // Items de Consumer Cards
    consumerCards.forEach((card) => {
      const items = card.items || [];
      items.forEach((item) => {
        wsItems.cell(itemRow, 1).string('Consumer').style(cellStyle);
        wsItems.cell(itemRow, 2).string(card.numberCard).style(cellStyle);
        wsItems.cell(itemRow, 3).string(item.product?.name || 'N/A').style(cellStyle);
        wsItems.cell(itemRow, 4).number(item.quantity).style(cellStyle);
        wsItems.cell(itemRow, 5).string(String(item.product?.price || 0)).style(cellStyle);
        wsItems.cell(itemRow, 6).string(String(item.price)).style(cellStyle);
        itemRow++;
      });
    });

    // Items de Cortecy Cards
    cortecyCards.forEach((card) => {
      const items = card.items || [];
      items.forEach((item) => {
        wsItems.cell(itemRow, 1).string('Cortecy').style(cellStyle);
        wsItems.cell(itemRow, 2).string(card.numberCard).style(cellStyle);
        wsItems.cell(itemRow, 3).string(item.product?.name || 'N/A').style(cellStyle);
        wsItems.cell(itemRow, 4).number(item.quantity).style(cellStyle);
        wsItems.cell(itemRow, 5).string(String(item.product?.price || 0)).style(cellStyle);
        wsItems.cell(itemRow, 6).string(String(item.price)).style(cellStyle);
        itemRow++;
      });
    });

    // Escritura del archivo
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
