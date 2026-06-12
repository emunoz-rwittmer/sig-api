const fs = require('fs');
const path = require('path');
const Utils = require('../../utils/Utils');
const sharp = require('sharp');

require('dotenv').config();

exports.generateCruiseReportPDF = async (cruise, passengers, cortecyCards = [], filePath) => {
  try {
    const { default: PDFDocument } = await import('pdfkit');

    const doc = new PDFDocument({ margin: 30, bufferPages: true, size: 'A4' });
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    const logoPath = path.resolve('./uploads/companies/logo_rwittmer.png');
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 40, 30, { width: 80 });
    }

    doc
      .font('Helvetica-Bold')
      .fontSize(20)
      .text('REPORTE DE CRUCERO', 130, 40, { align: 'center' })
      .fontSize(11)
      .font('Helvetica')
      .text(`${cruise.yacht?.name || 'N/A'}`, 130, 70, { align: 'center' });

    doc.moveDown(3);

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

    const consumerPassengers = passengers.filter(
      (p) => p.consumer_card && p.consumer_card.totalCount > 0 && p.consumer_card.paidAccount === true
    );

    const totalConsumerAmount = consumerPassengers.reduce(
      (sum, passenger) => sum + Number(passenger.consumer_card.totalCount || 0),
      0
    );
    const totalCortecyAmount = cortecyCards.reduce(
      (sum, card) => sum + Number(card.totalCount || 0),
      0
    );

    doc.moveDown(0.5);
    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .text(`Total de Pasajeros con Consumer Cards: ${consumerPassengers.length}`);
    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .text(`Total de Cortecy Cards: ${cortecyCards.length}`);
    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .text(`Total Consumer Cards: $${totalConsumerAmount.toFixed(2)}`);
    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .text(`Total Cortecy Cards: $${totalCortecyAmount.toFixed(2)}`);
    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .text(`Total General: $${(totalConsumerAmount + totalCortecyAmount).toFixed(2)}`);

    const ensurePageSpace = (spaceNeeded = 160) => {
      const bottomLimit = doc.page.height - doc.page.margins.bottom;
      if (doc.y + spaceNeeded > bottomLimit) {
        doc.addPage();
      }
    };

    if (consumerPassengers.length > 0) {
      doc.addPage();
      consumerPassengers.forEach((passenger, passengerIndex) => {
        if (passengerIndex > 0) {
          doc.addPage();
        }

        const consumerCard = passenger.consumer_card;
        const items = consumerCard.items || [];

        doc
          .font('Helvetica-Bold')
          .fontSize(12)
          .text(`Pasajero: ${passenger.name}`, { underline: true })
          .font('Helvetica')
          .fontSize(9);

        doc.moveDown(0.3);
        doc.text(`ID: ${passenger.identificationNumber}`);
        doc.text(`Email: ${passenger.email || 'N/A'}`);
        doc.text(`Cabina: ${passenger.cabin}`);
        doc.text(`Nacionalidad: ${passenger.nationality}`);

        doc.moveDown(0.3);
        doc
          .font('Helvetica-Bold')
          .fontSize(10)
          .text('Tarjeta de Consumo');

        doc.font('Helvetica').fontSize(9);
        doc.text(`Tarjeta: ${consumerCard.numberCard}`);
        doc.text(`Total: $${Number(consumerCard.totalCount || 0).toFixed(2)}`);
        doc.text(`Pago: ${consumerCard.paymentType || 'N/A'}`);
        doc.text(`Recibo: ${consumerCard.receiptNumber || 'N/A'}`);
        doc.text(`Pagado: ${consumerCard.paidAccount ? 'Sí' : 'No'}`);

        doc.moveDown(0.3);
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

          doc.font('Helvetica').fontSize(8);
          items.forEach((item, itemIndex) => {
            const itemY = tableTop + 16 + itemIndex * rowHeight;
            doc.text(item.product?.name || 'N/A', col1, itemY);
            doc.text(String(item.quantity || 0), col2, itemY);
            doc.text(`$${Number(item.product?.price || 0).toFixed(2)}`, col3, itemY);
            doc.text(`$${Number(item.price || 0).toFixed(2)}`, col4, itemY);
          });

          doc.moveTo(30, tableTop + 16 + items.length * rowHeight).lineTo(520, tableTop + 16 + items.length * rowHeight).stroke();

          const totalY = tableTop + 20 + items.length * rowHeight;
          doc
            .font('Helvetica-Bold')
            .fontSize(9)
            .text('TOTAL:', col3, totalY)
            .text(`$${Number(consumerCard.totalCount || 0).toFixed(2)}`, col4, totalY);
        }

        doc.moveDown(2);
        if (consumerCard.image) {
          try {
            const imagePath = path.resolve('.' + consumerCard.image);
            const compressedImage = await sharp(imagePath)
              .resize(800)
              .jpeg({ quality: 60 })
              .toBuffer();

            if (fs.existsSync(imagePath)) {
              doc
                .font('Helvetica-Bold')
                .fontSize(11)
                .text('Foto del Voucher:', { underline: true });

              doc.moveDown(0.3);
              doc.image(compressedImage, 40, doc.y, { width: 200 });
            }
          } catch (error) {
            doc.fontSize(10).text('Foto del voucher no disponible', { color: '#999999' });
          }
        } else {
          doc.fontSize(10).text('Foto del voucher no disponible', { color: '#999999' });
        }
      });
    }

    if (cortecyCards.length > 0) {
      doc.addPage();
      doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .text('Cortecy Cards', { underline: true })
        .font('Helvetica')
        .fontSize(10);

      doc.moveDown(0.3);
      cortecyCards.forEach((card, cardIndex) => {
        if (cardIndex > 0) {
          doc.addPage();
        }

        ensurePageSpace(180);
        doc
          .font('Helvetica-Bold')
          .fontSize(11)
          .text(`Tarjeta Cortecy: ${card.numberCard}`);

        doc.moveDown(0.2);
        doc.font('Helvetica').fontSize(9);
        doc.text(`Total: $${Number(card.totalCount || 0).toFixed(2)}`);
        doc.text(`Tipo: ${card.type || 'N/A'}`);
        doc.text(`Estado: ${card.status || 'Activa'}`);
        doc.text(`Creada: ${card.createdAt ? Utils.formatDateToLocal(card.createdAt) : 'N/A'}`);
        if (card.observation) {
          doc.text(`Observación: ${card.observation}`);
        }

        const items = card.items || [];
        doc.moveDown(0.3);
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
          const col5 = 460;
          const rowHeight = 16;

          doc
            .font('Helvetica-Bold')
            .fontSize(8)
            .text('Producto', col1, tableTop)
            .text('Cant.', col2, tableTop)
            .text('Precio', col3, tableTop)
            .text('Total', col4, tableTop)
            .text('Obs.', col5, tableTop);

          doc.moveTo(30, tableTop + 12).lineTo(560, tableTop + 12).stroke();

          doc.font('Helvetica').fontSize(8);
          items.forEach((item, itemIndex) => {
            const itemY = tableTop + 16 + itemIndex * rowHeight;
            doc.text(item.product?.name || 'N/A', col1, itemY);
            doc.text(String(item.quantity || 0), col2, itemY);
            doc.text(`$${Number(item.product?.price || 0).toFixed(2)}`, col3, itemY);
            doc.text(`$${Number(item.price || 0).toFixed(2)}`, col4, itemY);
            doc.text(item.observation || '-', col5, itemY);
          });

          doc.moveTo(30, tableTop + 16 + items.length * rowHeight).lineTo(560, tableTop + 16 + items.length * rowHeight).stroke();
        }

        doc.moveDown(2);
      });
    }

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
      .text(`Pasajeros con Consumer Cards: ${consumerPassengers.length}`, { align: 'center' })
      .text(`Cortecy Cards: ${cortecyCards.length}`, { align: 'center' });

    doc.end();

    return new Promise((resolve, reject) => {
      writeStream.on('finish', () => resolve(filePath));
      writeStream.on('error', reject);
    });
  } catch (error) {
    console.error('Error limpiando archivos:', error);
    throw error;
  }
};
