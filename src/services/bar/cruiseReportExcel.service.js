const path = require('path');
const xl = require('excel4node');
const Utils = require('../../utils/Utils');

const createDefaultStyles = (wb) => ({
  titleStyle: wb.createStyle({
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
  }),
  headerStyle: wb.createStyle({
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
  }),
  labelStyle: wb.createStyle({
    font: { bold: true, size: 10 },
    alignment: { horizontal: 'left' },
  }),
  cellStyle: wb.createStyle({
    font: { size: 9 },
    alignment: { horizontal: 'left' },
  }),
});

const formatDateForReport = (dateStr) => {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  const offset = date.getTimezoneOffset() * 60000;
  const adjustedDate = new Date(date.getTime() + offset);
  const options = { day: '2-digit', month: 'long', year: 'numeric' };
  return adjustedDate.toLocaleDateString('es-ES', options);
};

exports.generateCruiseReportExcel = async (cruise, passengers, cortecyCards = [], filePath) => {
  try {
    const wb = new xl.Workbook({
      dateFormat: 'dd/mm/yyyy hh:mm:ss',
    });

    const { titleStyle, headerStyle, labelStyle, cellStyle } = createDefaultStyles(wb);

    const wsConsumer = wb.addWorksheet('Consumer Cards');
    const wsCortecy = wb.addWorksheet('Cortecy Cards');
    const wsItems = wb.addWorksheet('Detalle Items');

    wsConsumer.column(1).setWidth(20);
    wsConsumer.column(2).setWidth(20);
    wsConsumer.column(3).setWidth(10);
    wsConsumer.column(4).setWidth(20);
    wsConsumer.column(5).setWidth(20);
    wsConsumer.column(6).setWidth(18);
    wsConsumer.column(7).setWidth(15);
    wsConsumer.column(8).setWidth(12);
    wsConsumer.column(9).setWidth(12);
    wsConsumer.column(10).setWidth(12);
    wsConsumer.column(11).setWidth(15);
    wsConsumer.column(12).setWidth(12);
    wsConsumer.column(13).setWidth(12);
    wsConsumer.column(14).setWidth(10);

    wsConsumer.cell(1, 1, 1, 14, true).string(`REPORTE DE CONSUMER CARDS - YATE: ${cruise.yacht?.name || 'N/A'}`).style(titleStyle);
    wsConsumer.cell(2, 1, 2, 14, true).string(`DEL ${formatDateForReport(cruise.startDate)} AL ${formatDateForReport(cruise.endDate)}`).style(titleStyle);

    const consumerHeaders = ['Pasajero', 'Identificación', 'Tipo', 'Inicio Crucero', 'Fin Crucero', 'Cabina', 'Tarjeta Nº', 'SubTotal', 'IVA 15%', 'Total', 'Método Pago', 'Recibo Nº', 'Cuenta Pagada', 'Items'];
    consumerHeaders.forEach((header, colIndex) => {
      wsConsumer.cell(4, colIndex + 1).string(header).style(headerStyle);
    });

    let consumerRow = 5;
    let totalConsumerSubtotal = 0.00;
    let totalConsumerIva = 0.00;
    let totalConsumerTotal = 0.00;

    passengers.forEach((passenger) => {
      if (passenger.consumer_card && passenger.consumer_card.totalCount > 0 && passenger.consumer_card.paidAccount === true) {
        const itemCount = passenger.consumer_card.items?.length || 0;
        const subtotal = parseFloat((passenger.consumer_card.totalCount / 1.15).toFixed(2));
        const iva = parseFloat((subtotal * 0.15).toFixed(2));

        wsConsumer.cell(consumerRow, 1).string(passenger.name).style(cellStyle);
        wsConsumer.cell(consumerRow, 2).string(passenger.identificationNumber).style(cellStyle);
        wsConsumer.cell(consumerRow, 3).string(passenger.type || 'N/A').style(cellStyle);
        wsConsumer.cell(consumerRow, 4).string(formatDateForReport(passenger.cruiseStartDate || cruise.startDate)).style(cellStyle);
        wsConsumer.cell(consumerRow, 5).string(formatDateForReport(passenger.cruiseEndDate || cruise.endDate)).style(cellStyle);
        wsConsumer.cell(consumerRow, 6).string(String(passenger.cabin || 'N/A')).style(cellStyle);
        wsConsumer.cell(consumerRow, 7).string(passenger.consumer_card.numberCard || 'N/A').style(cellStyle);
        wsConsumer.cell(consumerRow, 8).string(subtotal.toFixed(2)).style(cellStyle);
        wsConsumer.cell(consumerRow, 9).string(iva.toFixed(2)).style(cellStyle);
        wsConsumer.cell(consumerRow, 10).string(Number(passenger.consumer_card.totalCount).toFixed(2)).style(cellStyle);
        wsConsumer.cell(consumerRow, 11).string(passenger.consumer_card.paymentType || 'N/A').style(cellStyle);
        wsConsumer.cell(consumerRow, 12).string(passenger.consumer_card.receiptNumber || 'N/A').style(cellStyle);
        wsConsumer.cell(consumerRow, 13).string(passenger.consumer_card.paidAccount ? 'Sí' : 'No').style(cellStyle);
        wsConsumer.cell(consumerRow, 14).number(itemCount).style(cellStyle);

        totalConsumerSubtotal += subtotal;
        totalConsumerIva += iva;
        totalConsumerTotal += Number(passenger.consumer_card.totalCount);
        consumerRow++;
      }
    });

    wsConsumer.cell(consumerRow + 1, 7).string('TOTALES:').style(labelStyle);
    wsConsumer.cell(consumerRow + 1, 8).string(totalConsumerSubtotal.toFixed(2)).style(headerStyle);
    wsConsumer.cell(consumerRow + 1, 9).string(totalConsumerIva.toFixed(2)).style(headerStyle);
    wsConsumer.cell(consumerRow + 1, 10).string(totalConsumerTotal.toFixed(2)).style(headerStyle);

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

    wsCortecy.cell(1, 1, 1, 10, true).string(`REPORTE DE CORTECY CARDS - YATE: ${cruise.yacht?.name || 'N/A'}`).style(titleStyle);
    wsCortecy.cell(2, 1, 2, 10, true).string(`DEL ${formatDateForReport(cruise.startDate)} AL ${formatDateForReport(cruise.endDate)}`).style(titleStyle);

    const cortecyHeaders = ['Tarjeta Nº', 'SubTotal', 'IVA 15%', 'Total', 'Observación', 'Items', 'Creada', 'Estado'];
    cortecyHeaders.forEach((header, colIndex) => {
      wsCortecy.cell(4, colIndex + 1).string(header).style(headerStyle);
    });

    let cortecyRow = 5;
    let totalCortecySubtotal = 0.00;
    let totalCortecyIva = 0.00;
    let totalCortecyTotal = 0.00;

    cortecyCards.forEach((card) => {
      const itemCount = card.items?.length || 0;
      const subtotal = parseFloat((card.totalCount / 1.15).toFixed(2));
      const iva = parseFloat((subtotal * 0.15).toFixed(2));

      wsCortecy.cell(cortecyRow, 1).string(card.numberCard || 'N/A').style(cellStyle);
      wsCortecy.cell(cortecyRow, 2).string(subtotal.toFixed(2)).style(cellStyle);
      wsCortecy.cell(cortecyRow, 3).string(iva.toFixed(2)).style(cellStyle);
      wsCortecy.cell(cortecyRow, 4).string(Number(card.totalCount || 0).toFixed(2)).style(cellStyle);
      wsCortecy.cell(cortecyRow, 5).string(card.observation || 'N/A').style(cellStyle);
      wsCortecy.cell(cortecyRow, 6).number(itemCount).style(cellStyle);
      wsCortecy.cell(cortecyRow, 7).string(formatDateForReport(card.createdAt)).style(cellStyle);
      wsCortecy.cell(cortecyRow, 8).string(card.status || 'Activa').style(cellStyle);

      totalCortecySubtotal += subtotal;
      totalCortecyIva += iva;
      totalCortecyTotal += Number(card.totalCount || 0);
      cortecyRow++;
    });

    wsCortecy.cell(cortecyRow + 1, 1).string('TOTALES:').style(labelStyle);
    wsCortecy.cell(cortecyRow + 1, 2).string(totalCortecySubtotal.toFixed(2)).style(headerStyle);
    wsCortecy.cell(cortecyRow + 1, 3).string(totalCortecyIva.toFixed(2)).style(headerStyle);
    wsCortecy.cell(cortecyRow + 1, 4).string(totalCortecyTotal.toFixed(2)).style(headerStyle);

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

    passengers.forEach((passenger) => {
      if (passenger.consumer_card && passenger.consumer_card.totalCount > 0 && passenger.consumer_card.paidAccount === true) {
        const items = passenger.consumer_card.items || [];
        items.forEach((item) => {
          wsItems.cell(itemRow, 1).string('Consumer').style(cellStyle);
          wsItems.cell(itemRow, 2).string(passenger.consumer_card.numberCard || 'N/A').style(cellStyle);
          wsItems.cell(itemRow, 3).string(item.product?.name || 'N/A').style(cellStyle);
          wsItems.cell(itemRow, 4).number(item.quantity || 0).style(cellStyle);
          wsItems.cell(itemRow, 5).string(String(item.product?.price || 0)).style(cellStyle);
          wsItems.cell(itemRow, 6).string(String(item.price || 0)).style(cellStyle);
          itemRow++;
        });
      }
    });

    cortecyCards.forEach((card) => {
      const items = card.items || [];
      items.forEach((item) => {
        wsItems.cell(itemRow, 1).string('Cortecy').style(cellStyle);
        wsItems.cell(itemRow, 2).string(card.numberCard || 'N/A').style(cellStyle);
        wsItems.cell(itemRow, 3).string(item.product?.name || 'N/A').style(cellStyle);
        wsItems.cell(itemRow, 4).number(item.quantity || 0).style(cellStyle);
        wsItems.cell(itemRow, 5).string(String(item.product?.price || 0)).style(cellStyle);
        wsItems.cell(itemRow, 6).string(String(item.price || 0)).style(cellStyle);
        itemRow++;
      });
    });

    await new Promise((resolve, reject) => {
      wb.write(filePath, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    return filePath;
  } catch (error) {
    console.error('Error escribiendo archivo de reporte de crucero:', error);
    throw error;
  }
};
