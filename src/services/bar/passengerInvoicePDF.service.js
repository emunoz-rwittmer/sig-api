const fs = require('fs');
const path = require('path');
const Utils = require('../../utils/Utils');
require('dotenv').config();

exports.passengerInvoicePDF = async (consumerCard, filePath) => {
  try {
    const { default: PDFDocument } = await import('pdfkit');

    const doc = new PDFDocument({
      margin: 50,
      bufferPages: true,
      size: 'LETTER'
    });
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    // Colores corporativos
    const primaryColor = '#1f5a96';
    const accentColor = '#4a90e2';
    const textDark = '#2c3e50';
    const textLight = '#7f8c8d';
    const borderColor = '#ecf0f1';

    const logoPath = path.resolve('./uploads/companies/logo_rwittmer.png');
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;

    // ============ ENCABEZADO ============
    // Logo
    let logoX = 420;
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, logoX, 45, { width: 150, height: 60 });
    }

    // Información de la empresa (a la derecha del logo)
    doc
      .font('Helvetica-Bold')
      .fontSize(18)
      .fillColor(primaryColor)
      .text('ROLF WITTMER', 50, 55);

    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(textLight)
      .text('Cruise Services', 50, 78)
      .text('Email: info@rwittmer.ec', 50, 92)
      .text('Phone: +593 (4) 2xxx-xxxx', 50, 106);

    // Línea separadora
    doc
      .strokeColor(primaryColor)
      .lineWidth(2)
      .moveTo(50, 145)
      .lineTo(pageWidth - 50, 145)
      .stroke();

    // Título INVOICE
    doc
      .font('Helvetica-Bold')
      .fontSize(24)
      .fillColor(primaryColor)
      .text('INVOICE', 50, 160);

    // Información de invoice y fecha (lado derecho)
    const invoiceRightX = pageWidth - 200;
    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor(textDark)
      .text('Invoice Number:', invoiceRightX, 160)
      .font('Helvetica')
      .fontSize(10)
      .fillColor(textLight)
      .text(Date.now() || 'N/A', invoiceRightX, 175);

    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor(textDark)
      .text('Date:', invoiceRightX, 195)
      .font('Helvetica')
      .fontSize(10)
      .fillColor(textLight)
      .text(new Date(), invoiceRightX, 210);

    // ============ INFORMACIÓN DEL PASAJERO ============
    doc.moveDown(2);

    // Sección: Bill To
    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor(primaryColor)
      .text('BILL TO:', 50, 200);

    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor(textDark)
      .text(consumerCard.passenger?.name || 'N/A', 50, 215);

    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(textLight)
      .text(`ID: ${consumerCard.passenger?.identificationNumber || 'N/A'}`, 50, 230)
      .text(`Email: ${consumerCard.passenger?.email || 'N/A'}`, 50, 245)
      .text(`Cabin: ${consumerCard.passenger?.cabin || 'N/A'}`, 50, 260)
      .text(`Type: ${consumerCard.passenger?.type || 'N/A'}`, 50, 275)
      .text(`Nationality: ${consumerCard.passenger?.nationality || 'N/A'}`, 50, 290)
      .text(`Country: ${consumerCard.passenger?.country || 'N/A'}`, 50, 305);


    // Información de consumo en columna derecha
    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor(primaryColor)
      .text('CONSUMER CARD DETAILS', invoiceRightX, 250);

    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(textDark);

    const detailsY = 265;
    doc.text(`Card Number: ${consumerCard.numberCard}`, invoiceRightX, detailsY);
    doc.text(`Payment Type: ${consumerCard.paymentType || 'N/A'}`, invoiceRightX, detailsY + 15);
    doc.text(`Status: ${consumerCard.paidAccount ? 'Paid' : 'Pending'}`, invoiceRightX, detailsY + 30);

    // ============ TABLA DE ITEMS ============
    const items = consumerCard.items || [];
    const tableY = 320;

    // Encabezado de tabla
    doc
      .fillColor(primaryColor)
      .rect(50, tableY, pageWidth - 100, 25)
      .fill();

    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor('white');

    const col1 = 60;
    const col2 = 250;
    const col3 = 370;
    const col4 = 470;

    doc.text('Product', col1, tableY + 5)
      .text('Qty', col2, tableY + 5)
      .text('Unit Price', col3, tableY + 5)
      .text('Total', col4, tableY + 5);

    // Filas de tabla
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(textDark);

    let currentY = tableY + 30;
    let subtotal = 0;

    items.forEach((item, index) => {
      // Fila alternada
      if (index % 2 === 0) {
        doc.fillColor(borderColor).rect(50, currentY - 5, pageWidth - 100, 20).fill();
      }

      doc.fillColor(textDark);
      doc.text(item.product?.name || 'N/A', col1, currentY);
      doc.text(item.quantity.toString(), col2, currentY);
      doc.text(`$${Number(item.product?.price || 0).toFixed(2)}`, col3, currentY);
      doc.text(`$${Number(item.price || 0).toFixed(2)}`, col4, currentY);

      subtotal += Number(item.price) || 0;
      currentY += 25;
    });

    // Línea final de tabla
    doc
      .strokeColor(primaryColor)
      .lineWidth(1.5)
      .moveTo(50, currentY)
      .lineTo(pageWidth - 50, currentY)
      .stroke();

    // ============ TOTALES ============
    const totalsY = currentY + 10;
    const totalsX = pageWidth - 200;

    // Total
    doc
      .font('Helvetica-Bold')
      .fontSize(12)
      .fillColor(primaryColor)
      .text('TOTAL:', totalsX, totalsY + 25);

    doc
      .font('Helvetica-Bold')
      .fontSize(14)
      .fillColor(primaryColor)
      .text(`$${consumerCard.totalCount || subtotal}`, totalsX + 70, totalsY + 25);

    let imageY = totalsY + 60;

    if (consumerCard.image) {
      try {
        const imagePath = path.resolve("." + consumerCard.image);
        if (fs.existsSync(imagePath)) {
          doc
            .font('Helvetica-Bold')
            .fontSize(11)
            .fillColor(primaryColor)
            .text('PAYMENT VOUCHER', 50, imageY);

          imageY += 20;
          doc.image(imagePath, 50, imageY, { width: 100, height: 150 });
        }
      } catch (error) {
        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor(textLight)
          .text('Voucher image not available', 50, imageY);
      }
    }

    doc.end();

    return new Promise((resolve, reject) => {
      writeStream.on('finish', () => resolve(filePath));
      writeStream.on('error', reject);
    });
  } catch (error) {
    throw error;
  }
};
