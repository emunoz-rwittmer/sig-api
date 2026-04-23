const fs = require('fs');
const path = require('path');
const Utils = require('../../utils/Utils');
require('dotenv').config();

exports.generateCruiseReportPDF = async (cruise, passengers, filePath) => {
  try {
    const { default: PDFDocument } = await import('pdfkit');

    const doc = new PDFDocument({ margin: 40, bufferPages: true });
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    // Colores
    const primaryColor = '#2C70BB';
    const secondaryColor = '#4472C4';

    // Página 1: Portada del crucero
    const logoPath = path.resolve('./uploads/companies/logo_rwittmer.png');

    // Logo
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 40, 40, { width: 100 });
    }

    // Título
    doc
      .font('Helvetica-Bold')
      .fontSize(24)
      .text('REPORTE DE CRUCERO', 150, 60, { align: 'center' })
      .fontSize(12)
      .font('Helvetica')
      .text('Consumer Cards Report', 150, 90, { align: 'center' });

    doc.moveDown(2);

    // Información del crucero
    doc
      .font('Helvetica-Bold')
      .fontSize(14)
      .text('Información del Crucero', { underline: true })
      .font('Helvetica')
      .fontSize(11);

    doc.moveDown(0.5);
    doc.text(`Código: ${cruise.code}`);
    doc.text(`Nombre: ${cruise.name}`);
    doc.text(`Yacht: ${cruise.yacht?.name || 'N/A'}`);
    doc.text(`Itinerario: ${cruise.itinerary}`);
    doc.text(`Fecha Inicio: ${Utils.formatDateToLocal(cruise.startDate)}`);
    doc.text(`Fecha Fin: ${Utils.formatDateToLocal(cruise.endDate)}`);
    doc.text(`Barman: ${cruise.barman}`);

    // Filtrar pasajeros con consumer_card válida
    const passengersWithCards = passengers.filter(
      (p) => p.consumer_card && p.consumer_card.totalCount > 0 && p.consumer_card.paidAccount === true
    );

    doc.moveDown(1);
    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .text(`Total de Pasajeros con Consumo: ${passengersWithCards.length}`);

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
        .fontSize(14)
        .text(`Pasajero: ${passenger.name}`, { underline: true })
        .font('Helvetica')
        .fontSize(10);

      doc.moveDown(0.5);
      doc.text(`Identificación: ${passenger.identificationNumber}`);
      doc.text(`Email: ${passenger.email}`);
      doc.text(`Cabina: ${passenger.cabin}`);
      doc.text(`Tipo: ${passenger.type}`);
      doc.text(`Género: ${passenger.gender}`);
      doc.text(`Nacionalidad: ${passenger.nationality}`);

      doc.moveDown(0.5);

      // Consumer Card Info
      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .text('Información de la Tarjeta de Consumo');

      doc.font('Helvetica').fontSize(10);
      doc.text(`Número de Tarjeta: ${consumerCard.numberCard}`);
      doc.text(`Total Consumo: $${consumerCard.totalCount.toFixed(2)}`);
      doc.text(`Tipo de Pago: ${consumerCard.paymentType || 'N/A'}`);
      doc.text(`Recibo Nº: ${consumerCard.receiptNumber || 'N/A'}`);
      doc.text(`Cuenta Pagada: ${consumerCard.paidAccount ? 'Sí' : 'No'}`);

      doc.moveDown(0.5);

      // Tabla de items
      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .text(`Items Consumidos (${items.length})`);

      doc.moveDown(0.3);

      if (items.length > 0) {
        // Encabezados de tabla
        const tableTop = doc.y;
        const col1 = 40;
        const col2 = 200;
        const col3 = 300;
        const col4 = 380;
        const rowHeight = 20;

        doc
          .font('Helvetica-Bold')
          .fontSize(9)
          .text('Producto', col1, tableTop)
          .text('Cantidad', col2, tableTop)
          .text('Precio', col3, tableTop)
          .text('Total', col4, tableTop);

        doc.moveTo(40, tableTop + 15).lineTo(520, tableTop + 15).stroke();

        // Filas de items
        doc.font('Helvetica').fontSize(9);
        items.forEach((item, itemIndex) => {
          const itemY = tableTop + 20 + itemIndex * rowHeight;
          doc.text(item.product?.name || 'N/A', col1, itemY);
          doc.text(item.quantity.toString(), col2, itemY);
          doc.text(`$${(item.product?.price || 0).toFixed(2)}`, col3, itemY);
          doc.text(`$${item.price.toFixed(2)}`, col4, itemY);
        });

        doc.moveTo(40, tableTop + 20 + items.length * rowHeight).lineTo(520, tableTop + 20 + items.length * rowHeight).stroke();

        // Total de items
        const totalY = tableTop + 25 + items.length * rowHeight;
        doc
          .font('Helvetica-Bold')
          .fontSize(9)
          .text('TOTAL:', col3, totalY)
          .text(`$${consumerCard.totalCount.toFixed(2)}`, col4, totalY);
      }

      doc.moveDown(2);

      // Imagen del voucher
      if (consumerCard.image) {
        try {
          const imagePath = path.resolve(`${process.env.URL_STAFFS + "/api" + consumerCard.image}`);
          if (fs.existsSync(imagePath)) {
            doc
              .font('Helvetica-Bold')
              .fontSize(11)
              .text('Foto del Voucher:', { underline: true });

            doc.moveDown(0.3);
            doc.image(imagePath, 40, doc.y, { width: 400, height: 300 });
          }
        } catch (error) {
          doc.fontSize(10).text('Foto del voucher no disponible', { color: '#999999' });
        }
      } else {
        doc.fontSize(10).text('Foto del voucher no disponible', { color: '#999999' });
      }
    });

    // Página final
    doc.addPage();
    doc
      .font('Helvetica-Bold')
      .fontSize(16)
      .text('Fin del Reporte', { align: 'center' })
      .moveDown(1)
      .font('Helvetica')
      .fontSize(10)
      .text(`Fecha de Generación: ${Utils.formatDateToLocal(new Date())}`, { align: 'center' })
      .text(`Crucero: ${cruise.name}`, { align: 'center' })
      .text(`Total de Pasajeros con Consumo: ${passengersWithCards.length}`, { align: 'center' });

    doc.end();

    return new Promise((resolve, reject) => {
      writeStream.on('finish', () => resolve(filePath));
      writeStream.on('error', reject);
    });
  } catch (error) {
    throw error;
  }
};
