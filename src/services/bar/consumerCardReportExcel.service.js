const path = require('path');
const xl = require('excel4node');
const Utils = require('../../utils/Utils');

exports.generateConsumerCardReportExcel = async (yachtName, start, end, consumerCards, cortecyCards, filePath) => {
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

    // Agrupar Consumer Cards por Crucero
    const groupedByCruise = {};
    consumerCards.forEach((card) => {
      if (card.passenger && card.passenger.cruise) {
        const cruiseCode = card.passenger.cruise.code;
        if (!groupedByCruise[cruiseCode]) {
          groupedByCruise[cruiseCode] = {
            cruise: card.passenger.cruise,
            cards: []
          };
        }
        groupedByCruise[cruiseCode].cards.push(card);
      }
    });

    // Sheet 1: Consumer Cards
    const wsConsumer = wb.addWorksheet('Consumer Cards');

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

    // Función para formatear fechas
    const formatDateForReport = (dateStr) => {
      const date = new Date(dateStr);
      // Compensar el offset de zona horaria para evitar desfase de fechas
      const offset = date.getTimezoneOffset() * 60000; // en milisegundos
      const adjustedDate = new Date(date.getTime() + offset);
      const options = { day: '2-digit', month: 'long', year: 'numeric' };
      return adjustedDate.toLocaleDateString('es-ES', options);
    };

    // Título
    wsConsumer.cell(1, 1, 1, 14, true).string(`REPORTE DE CONSUMER CARDS - YATE: ${yachtName}`).style(titleStyle);

    if ((start && (start !== "undefined" && start !== 'null')) && (end && (end !== "undefined" && end !== 'null'))) {
      const startFormatted = formatDateForReport(start);
      const endFormatted = formatDateForReport(end);
      wsConsumer.cell(2, 1, 2, 14, true).string(`DEL ${startFormatted} AL ${endFormatted}`).style(titleStyle);
    }

    // Procesar datos agrupados por crucero
    let consumerRow = 4;
    let totalConsumerSubtotal = 0.00;
    let totalConsumerIva = 0.00;
    let totalConsumerTotal = 0.00;

    Object.keys(groupedByCruise).forEach((cruiseCode) => {
      const cruiseGroup = groupedByCruise[cruiseCode];
      const cruise = cruiseGroup.cruise;

      // Encabezado del Crucero
      wsConsumer.cell(consumerRow, 1).string(`CRUCERO: ${cruise.name}`).style(labelStyle);
      consumerRow++;

      wsConsumer.cell(consumerRow, 1).string('Código:').style(labelStyle);
      wsConsumer.cell(consumerRow, 2).string(cruise.code).style(cellStyle);
      wsConsumer.cell(consumerRow, 3).string('Fecha Inicio:').style(labelStyle);
      wsConsumer.cell(consumerRow, 4).string(formatDateForReport(cruise.startDate) || 'N/A').style(cellStyle);
      wsConsumer.cell(consumerRow, 5).string('Fecha Fin:').style(labelStyle);
      wsConsumer.cell(consumerRow, 6).string(formatDateForReport(cruise.endDate) || 'N/A').style(cellStyle);
      wsConsumer.cell(consumerRow, 7).string('Barman:').style(labelStyle);
      wsConsumer.cell(consumerRow, 8).string(cruise.barman || 'N/A').style(cellStyle);
      consumerRow++;
      consumerRow++; // Espacio en blanco

      // Headers de pasajeros
      const consumerHeaders = ['Pasajero', 'Identificación', 'Tipo', 'Inicio Crucero', 'Fin Crucero', 'Cabina', 'Tarjeta Nº', 'SubTotal', 'IVA 15%', 'Total', 'Método Pago', 'Recibo Nº', 'Cuenta Pagada', 'Items'];
      consumerHeaders.forEach((header, colIndex) => {
        wsConsumer.cell(consumerRow, colIndex + 1).string(header).style(headerStyle);
      });
      consumerRow++;

      // Pasajeros del crucero
      let cruiseTotalSubtotal = 0.00;
      let cruiseTotalIva = 0.00;
      let cruiseTotalAmount = 0.00;

      cruiseGroup.cards.forEach((card) => {
        if (card.passenger) {
          const itemCount = card.items?.length || 0;
          const subtotal = parseFloat((card.totalCount / 1.15).toFixed(2));
          const iva = parseFloat((subtotal * 0.15).toFixed(2));

          wsConsumer.cell(consumerRow, 1).string(card.passenger.name).style(cellStyle);
          wsConsumer.cell(consumerRow, 2).string(card.passenger.identificationNumber).style(cellStyle);
          wsConsumer.cell(consumerRow, 3).string(card.passenger.type).style(cellStyle);
          wsConsumer.cell(consumerRow, 4).string(formatDateForReport(card.passenger.cruiseStartDate)).style(cellStyle);
          wsConsumer.cell(consumerRow, 5).string(formatDateForReport(card.passenger.cruiseEndDate)).style(cellStyle);
          wsConsumer.cell(consumerRow, 6).string(card.passenger.cabin).style(cellStyle);
          wsConsumer.cell(consumerRow, 7).string(card.numberCard).style(cellStyle);
          wsConsumer.cell(consumerRow, 8).string(subtotal.toString()).style(cellStyle);
          wsConsumer.cell(consumerRow, 9).string(iva.toString()).style(cellStyle);
          wsConsumer.cell(consumerRow, 10).string(card.totalCount.toString()).style(cellStyle);
          wsConsumer.cell(consumerRow, 11).string(card.paymentType || 'N/A').style(cellStyle);
          wsConsumer.cell(consumerRow, 12).string(card.receiptNumber || 'N/A').style(cellStyle);
          wsConsumer.cell(consumerRow, 13).string(card.paidAccount ? 'Sí' : 'No').style(cellStyle);
          wsConsumer.cell(consumerRow, 14).number(itemCount).style(cellStyle);

          cruiseTotalSubtotal += subtotal;
          cruiseTotalIva += iva;
          cruiseTotalAmount += Number(card.totalCount);
          totalConsumerSubtotal += subtotal;
          totalConsumerIva += iva;
          totalConsumerTotal += Number(card.totalCount);
          consumerRow++;
        }
      });

      // Subtotal del Crucero
      wsConsumer.cell(consumerRow, 2).string(`SUBTOTAL ${cruise.code}:`).style(labelStyle);
      wsConsumer.cell(consumerRow, 8).string(cruiseTotalSubtotal.toFixed(2)).style(headerStyle);
      wsConsumer.cell(consumerRow, 9).string(cruiseTotalIva.toFixed(2)).style(headerStyle);
      wsConsumer.cell(consumerRow, 10).string(cruiseTotalAmount.toFixed(2)).style(headerStyle);
      consumerRow += 2; // Espacio entre cruceros
    });

    // Fila de totales generales
    wsConsumer.cell(consumerRow, 2).string('TOTALES GENERALES:').style(labelStyle);
    wsConsumer.cell(consumerRow, 8).string(totalConsumerSubtotal.toFixed(2)).style(headerStyle);
    wsConsumer.cell(consumerRow, 9).string(totalConsumerIva.toFixed(2)).style(headerStyle);
    wsConsumer.cell(consumerRow, 10).string(totalConsumerTotal.toFixed(2)).style(headerStyle);

    // Agrupar Cortecy Cards por Crucero
    const groupedCortecyByCruise = {};
    cortecyCards.forEach((card) => {
      if (card.cruise) {
        const cruiseCode = card.cruise.code;
        if (!groupedCortecyByCruise[cruiseCode]) {
          groupedCortecyByCruise[cruiseCode] = {
            cruise: card.cruise,
            cards: []
          };
        }
        groupedCortecyByCruise[cruiseCode].cards.push(card);
      }
    });

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
    
    if ((start && (start !== "undefined" && start !== 'null')) && (end && (end !== "undefined" && end !== 'null'))) {
      const startFormatted = formatDateForReport(start);
      const endFormatted = formatDateForReport(end);
      wsCortecy.cell(2, 1, 2, 10, true).string(`DEL ${startFormatted} AL ${endFormatted}`).style(titleStyle);
    }

    // Procesar datos agrupados por crucero
    let cortecyRow = 4;
    let totalCortecyGeneral = 0.00;
    let totalCortecySubtotalGeneral = 0.00;
    let totalCortecyIvaGeneral = 0.00;

    Object.keys(groupedCortecyByCruise).forEach((cruiseCode) => {
      const cortecyCruiseGroup = groupedCortecyByCruise[cruiseCode];
      const cruise = cortecyCruiseGroup.cruise;

      // Encabezado del Crucero
      wsCortecy.cell(cortecyRow, 1).string(`CRUCERO: ${cruise.name}`).style(labelStyle);
      cortecyRow++;

      wsCortecy.cell(cortecyRow, 1).string('Código:').style(labelStyle);
      wsCortecy.cell(cortecyRow, 2).string(cruise.code).style(cellStyle);
      wsCortecy.cell(cortecyRow, 3).string('Fecha Inicio:').style(labelStyle);
      wsCortecy.cell(cortecyRow, 4).string(formatDateForReport(cruise.startDate) || 'N/A').style(cellStyle);
      wsCortecy.cell(cortecyRow, 5).string('Fecha Fin:').style(labelStyle);
      wsCortecy.cell(cortecyRow, 6).string(formatDateForReport(cruise.endDate) || 'N/A').style(cellStyle);
      wsCortecy.cell(cortecyRow, 7).string('Barman:').style(labelStyle);
      wsCortecy.cell(cortecyRow, 8).string(cruise.barman || 'N/A').style(cellStyle);
      cortecyRow++;
      cortecyRow++; // Espacio en blanco

      // Headers de Cortecy Cards
      const cortecyHeaders = ['Tarjeta Nº', 'SubTotal', 'IVA 15%', 'Total', 'Observación', 'Items', 'Creada', 'Estado', ''];
      cortecyHeaders.forEach((header, colIndex) => {
        wsCortecy.cell(cortecyRow, colIndex + 1).string(header).style(headerStyle);
      });
      cortecyRow++;

      // Tarjetas del crucero
      let cruiseCortecySubtotal = 0.00;
      let cruiseCortecyIva = 0.00;
      let cruiseCortecyTotal = 0.00;

      cortecyCruiseGroup.cards.forEach((card) => {
        const itemCount = card.items?.length || 0;
        const subtotal = parseFloat((card.totalCount / 1.15).toFixed(2));
        const iva = parseFloat((subtotal * 0.15).toFixed(2));

        wsCortecy.cell(cortecyRow, 1).string(card.numberCard).style(cellStyle);
        wsCortecy.cell(cortecyRow, 2).string(subtotal.toString()).style(cellStyle);
        wsCortecy.cell(cortecyRow, 3).string(iva.toString()).style(cellStyle);
        wsCortecy.cell(cortecyRow, 4).string(card.totalCount.toString()).style(cellStyle);
        wsCortecy.cell(cortecyRow, 5).string(card.observation || 'N/A').style(cellStyle);
        wsCortecy.cell(cortecyRow, 6).number(itemCount).style(cellStyle);
        wsCortecy.cell(cortecyRow, 7).string(formatDateForReport(card.createdAt)).style(cellStyle);
        wsCortecy.cell(cortecyRow, 8).string(card.status || 'Activa').style(cellStyle);

        cruiseCortecySubtotal += subtotal;
        cruiseCortecyIva += iva;
        cruiseCortecyTotal += Number(card.totalCount);
        totalCortecySubtotalGeneral += subtotal;
        totalCortecyIvaGeneral += iva;
        totalCortecyGeneral += Number(card.totalCount);
        cortecyRow++;
      });

      // Subtotal del Crucero
      wsCortecy.cell(cortecyRow, 1).string(`SUBTOTAL ${cruise.code}:`).style(labelStyle);
      wsCortecy.cell(cortecyRow, 2).string(cruiseCortecySubtotal.toFixed(2)).style(headerStyle);
      wsCortecy.cell(cortecyRow, 3).string(cruiseCortecyIva.toFixed(2)).style(headerStyle);
      wsCortecy.cell(cortecyRow, 4).string(cruiseCortecyTotal.toFixed(2)).style(headerStyle);
      cortecyRow += 2; // Espacio entre cruceros
    });

    // Fila de totales generales
    wsCortecy.cell(cortecyRow, 1).string('TOTALES GENERALES:').style(labelStyle);
    wsCortecy.cell(cortecyRow, 2).string(totalCortecySubtotalGeneral.toFixed(2)).style(headerStyle);
    wsCortecy.cell(cortecyRow, 3).string(totalCortecyIvaGeneral.toFixed(2)).style(headerStyle);
    wsCortecy.cell(cortecyRow, 4).string(totalCortecyGeneral.toFixed(2)).style(headerStyle);

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
