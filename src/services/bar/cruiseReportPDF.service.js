const fs = require('fs');
const path = require('path');
const Utils = require('../../utils/Utils');
require('dotenv').config();

exports.generateCruiseReportPDF = async (cruise, passengers, filePath) => {
  try {
    const { default: PDFDocument } = await import('pdfkit');

    const doc = new PDFDocument({ margin: 30, bufferPages: true, size: 'A4' });
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    // Página 1: Portada del crucero
    const logoPath = path.resolve('./uploads/companies/logo_rwittmer.png');

    // Logo - si existe
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 40, 30, { width: 80 });
    }

    // Título principal
    doc
      .font('Helvetica-Bold')
      .fontSize(20)
      .text(`REPORTE DE CRUCERO`, 130, 40, { align: 'center' })
      .fontSize(11)
      .font('Helvetica')
      .text(`${cruise.yacht?.name}`, 130, 70, { align: 'center' });

    doc.moveDown(3);

    // Información del crucero
    doc
      .font('Helvetica-Bold')
      .fontSize(12)
      .text('Información del Crucero', { underline: true })
      .font('Helvetica')
      .fontSize(10);

    doc.moveDown(0.4);
    doc.text(`Código: ${cruise.code}`);
    doc.text(`Nombre: ${cruise.name}`);
    doc.text(`Yacht: ${cruise.yacht?.name || 'N/A'}`);
    doc.text(`Itinerario: ${cruise.itinerary}`);
    doc.text(`Inicio: ${Utils.formatDateToLocal(cruise.startDate)}`);
    doc.text(`Fin: ${Utils.formatDateToLocal(cruise.endDate)}`);
    doc.text(`Barman: ${cruise.barman}`);

    const passengersWithCards = passengers.filter(
      (p) => p.consumer_card && p.consumer_card.totalCount > 0 && p.consumer_card.paidAccount === true
    );

    doc.moveDown(0.5);
    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .text(`Total de Pasajeros: ${passengersWithCards.length}`);

    doc.addPage();

    // Páginas de detalle de pasajeros
    passengersWithCards.forEach((passenger, passengerIndex) => {
      if (passengerIndex > 0) {
        doc.addPage();
      }

      const consumerCard = passenger.consumer_card;
      const items = consumerCard.items || [];

      // Encabezado de pasajero
      doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .text(`Pasajero: ${passenger.name}`, { underline: true })
        .font('Helvetica')
        .fontSize(9);

      doc.moveDown(0.3);
      doc.text(`ID: ${passenger.identificationNumber}`);
      doc.text(`Email: ${passenger.email}`);
      doc.text(`Cabina: ${passenger.cabin}`);
      doc.text(`Nacionalidad: ${passenger.nationality}`);

      doc.moveDown(0.3);

      // Consumer Card Info - compacto
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .text('Tarjeta de Consumo');

      doc.font('Helvetica').fontSize(9);
      doc.text(`Tarjeta: ${consumerCard.numberCard}`);
      doc.text(`Total: $${consumerCard.totalCount}`);
      doc.text(`Pago: ${consumerCard.paymentType || 'N/A'}`);
      doc.text(`Recibo: ${consumerCard.receiptNumber || 'N/A'}`);
      doc.text(`Pagado: ${consumerCard.paidAccount ? 'Sí' : 'No'}`);

      doc.moveDown(0.3);

      // Tabla de items - compacta
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .text(`Items (${items.length})`);

      doc.moveDown(0.2);

      if (items.length > 0) {
        const tableTop = doc.y;
        const col1 = 30;
        const col2 = 180;
        const col3 = 290;
        const col4 = 380;
        const rowHeight = 16;

        doc
          .font('Helvetica-Bold')
          .fontSize(8)
          .text('Producto', col1, tableTop)
          .text('Cant.', col2, tableTop)
          .text('Precio', col3, tableTop)
          .text('Total', col4, tableTop);

        doc.moveTo(30, tableTop + 12).lineTo(520, tableTop + 12).stroke();

        // Filas de items
        doc.font('Helvetica').fontSize(8);
        items.forEach((item, itemIndex) => {
          const itemY = tableTop + 16 + itemIndex * rowHeight;
          doc.text(item.product?.name || 'N/A', col1, itemY);
          doc.text(item.quantity.toString(), col2, itemY);
          doc.text(`$${(item.product?.price.toFixed(2) || 0)}`, col3, itemY);
          doc.text(`$${item.price}`, col4, itemY);
        });

        doc.moveTo(30, tableTop + 16 + items.length * rowHeight).lineTo(520, tableTop + 16 + items.length * rowHeight).stroke();

        // Total
        const totalY = tableTop + 20 + items.length * rowHeight;
        doc
          .font('Helvetica-Bold')
          .fontSize(9)
          .text('TOTAL:', col3, totalY)
          .text(`$${consumerCard.totalCount}`, col4, totalY);
      }
    });

    // Página final
    doc.addPage();
    doc
      .font('Helvetica-Bold')
      .fontSize(14)
      .text('Fin del Reporte', { align: 'center' })
      .moveDown(0.5)
      .font('Helvetica')
      .fontSize(9)
      .text(`Generado: ${Utils.formatDateToLocal(new Date())}`, { align: 'center' })
      .text(`Crucero: ${cruise.name}`, { align: 'center' })
      .text(`Pasajeros: ${passengersWithCards.length}`, { align: 'center' });

    doc.end();

    return new Promise((resolve, reject) => {
      writeStream.on('finish', () => resolve(filePath));
      writeStream.on('error', reject);
    });
  } catch (error) {
    throw error;
  }
};
