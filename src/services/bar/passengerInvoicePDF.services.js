const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const PDFDocument = require('pdfkit');

// Style constants - Cache para evitar recalculos
const STYLES = {
  colors: {
    primary: '#1f5a96',
    accent: '#4a90e2',
    textDark: '#2c3e50',
    textLight: '#7f8c8d',
    border: '#ecf0f1'
  },
  fonts: {
    title: { name: 'Helvetica-Bold', size: 24 },
    heading: { name: 'Helvetica-Bold', size: 11 },
    label: { name: 'Helvetica-Bold', size: 10 },
    normal: { name: 'Helvetica', size: 9 },
    largeLabel: { name: 'Helvetica-Bold', size: 12 }
  }
};

const LAYOUT = {
  margin: 50,
  pageSize: 'LETTER',
  col1: 60,
  col2: 250,
  col3: 370,
  col4: 470,
  logoX: 420,
  logoY: 45,
  logoWidth: 150,
  logoHeight: 60
};

const applyStyle = (doc, style) => {
  if (style.font) {
    doc.font(style.font.name).fontSize(style.font.size);
  }
  if (style.color) {
    doc.fillColor(style.color);
  }
  return doc;
};

const drawHeader = async (doc, pageWidth, logoPath) => {
  const hasLogo = await (async () => {
    try {
      await fsPromises.access(logoPath);
      return true;
    } catch {
      return false;
    }
  })();

  if (hasLogo) {
    doc.image(logoPath, LAYOUT.logoX, LAYOUT.logoY, {
      width: LAYOUT.logoWidth,
      height: LAYOUT.logoHeight
    });
  }

  applyStyle(doc, { font: STYLES.fonts.title, color: STYLES.colors.primary });
  doc.text('ROLF WITTMER', 50, 55);

  applyStyle(doc, { font: STYLES.fonts.normal, color: STYLES.colors.textLight });
  doc.text('Cruise Services', 50, 78)
    .text('Email: info@rwittmer.ec', 50, 92)
    .text('Phone: +593 (4) 2xxx-xxxx', 50, 106);

  doc.strokeColor(STYLES.colors.primary)
    .lineWidth(2)
    .moveTo(50, 145)
    .lineTo(pageWidth - 50, 145)
    .stroke();

  applyStyle(doc, { font: STYLES.fonts.title, color: STYLES.colors.primary });
  doc.text('INVOICE', 50, 160);

  return { hasLogo };
};

const drawInvoiceDetails = (doc, pageWidth, invoiceDate) => {
  const invoiceRightX = pageWidth - 200;
  const invoiceNumber = Date.now();

  applyStyle(doc, { font: STYLES.fonts.label, color: STYLES.colors.textDark });
  doc.text('Invoice Number:', invoiceRightX, 160);

  applyStyle(doc, { font: STYLES.fonts.normal, color: STYLES.colors.textLight });
  doc.text(invoiceNumber.toString(), invoiceRightX, 175);

  applyStyle(doc, { font: STYLES.fonts.label, color: STYLES.colors.textDark });
  doc.text('Date:', invoiceRightX, 195);

  applyStyle(doc, { font: STYLES.fonts.normal, color: STYLES.colors.textLight });
  doc.text(invoiceDate.toLocaleDateString(), invoiceRightX, 210);

  return invoiceNumber;
};

const drawPassengerInfo = (doc, pageWidth, passenger) => {
  const invoiceRightX = pageWidth - 200;

  applyStyle(doc, { font: STYLES.fonts.heading, color: STYLES.colors.primary });
  doc.text('BILL TO:', 50, 200);

  applyStyle(doc, { font: STYLES.fonts.heading, color: STYLES.colors.textDark });
  doc.text(passenger?.name || 'N/A', 50, 215);

  applyStyle(doc, { font: STYLES.fonts.normal, color: STYLES.colors.textLight });
  const passengerDetails = [
    { label: 'ID', value: passenger?.identificationNumber },
    { label: 'Email', value: passenger?.email },
    { label: 'Cabin', value: passenger?.cabin },
    { label: 'Type', value: passenger?.type },
    { label: 'Nationality', value: passenger?.nationality },
    { label: 'Country', value: passenger?.country }
  ];

  let yPos = 230;
  passengerDetails.forEach(({ label, value }) => {
    doc.text(`${label}: ${value || 'N/A'}`, 50, yPos);
    yPos += 15;
  });
};

const drawConsumerCardDetails = (doc, pageWidth, consumerCard) => {
  const invoiceRightX = pageWidth - 200;

  applyStyle(doc, { font: STYLES.fonts.label, color: STYLES.colors.primary });
  doc.text('CONSUMER CARD DETAILS', invoiceRightX, 250);

  applyStyle(doc, { font: STYLES.fonts.normal, color: STYLES.colors.textDark });

  const detailsY = 265;
  const details = [
    { label: 'Card Number', value: consumerCard.numberCard },
    { label: 'Payment Type', value: consumerCard.paymentType || 'N/A' },
    { label: 'Status', value: consumerCard.paidAccount ? 'Paid' : 'Pending' }
  ];

  details.forEach(({ label, value }, index) => {
    doc.text(`${label}: ${value}`, invoiceRightX, detailsY + (index * 15));
  });
};

const drawItemsTable = (doc, pageWidth, items) => {
  const tableY = 320;
  let subtotal = 0;

  doc.fillColor(STYLES.colors.primary)
    .rect(50, tableY, pageWidth - 100, 25)
    .fill();

  applyStyle(doc, { font: STYLES.fonts.label, color: 'white' });
  doc.text('Product', LAYOUT.col1, tableY + 5)
    .text('Qty', LAYOUT.col2, tableY + 5)
    .text('Unit Price', LAYOUT.col3, tableY + 5)
    .text('Total', LAYOUT.col4, tableY + 5);

  applyStyle(doc, { font: STYLES.fonts.normal, color: STYLES.colors.textDark });

  let currentY = tableY + 30;

  (items || []).forEach((item, index) => {
    if (index % 2 === 0) {
      doc.fillColor(STYLES.colors.border)
        .rect(50, currentY - 5, pageWidth - 100, 20)
        .fill();
    }

    applyStyle(doc, { color: STYLES.colors.textDark });
    doc.text(item.product?.name || 'N/A', LAYOUT.col1, currentY)
      .text(item.quantity.toString(), LAYOUT.col2, currentY)
      .text(`$${Number(item.product?.price || 0).toFixed(2)}`, LAYOUT.col3, currentY)
      .text(`$${Number(item.price || 0).toFixed(2)}`, LAYOUT.col4, currentY);

    subtotal += Number(item.price) || 0;
    currentY += 25;
  });

  doc.strokeColor(STYLES.colors.primary)
    .lineWidth(1.5)
    .moveTo(50, currentY)
    .lineTo(pageWidth - 50, currentY)
    .stroke();

  return { currentY, subtotal };
};

const drawTotals = (doc, pageWidth, currentY, total) => {
  const totalsX = pageWidth - 200;
  const totalsY = currentY + 10;

  applyStyle(doc, { font: STYLES.fonts.largeLabel, color: STYLES.colors.primary });
  doc.text('TOTAL:', totalsX, totalsY + 25);

  applyStyle(doc, { font: { name: 'Helvetica-Bold', size: 14 }, color: STYLES.colors.primary });
  doc.text(`$${Number(total || 0).toFixed(2)}`, totalsX + 70, totalsY + 25);

  return totalsY + 60;
};

const drawPaymentVoucher = async (doc, consumerCard, imageY) => {
  if (!consumerCard.image) return imageY;

  try {
    const imagePath = path.resolve("." + consumerCard.image);
    await fsPromises.access(imagePath);

    applyStyle(doc, { font: STYLES.fonts.heading, color: STYLES.colors.primary });
    doc.text('PAYMENT VOUCHER', 50, imageY);

    imageY += 20;
    doc.image(imagePath, 50, imageY, { width: 100, height: 150 });
    return imageY + 150;
  } catch (error) {
    applyStyle(doc, { font: STYLES.fonts.normal, color: STYLES.colors.textLight });
    doc.text('Voucher image not available', 50, imageY);
    return imageY + 20;
  }
};

exports.passengerInvoicePDF = async (consumerCard, filePath) => {
  try {
    const logoPath = path.resolve('./uploads/companies/logo_rwittmer.png');
    const invoiceDate = new Date();
    const doc = new PDFDocument({
      margin: LAYOUT.margin,
      size: LAYOUT.pageSize,
      bufferPages: false
    });

    const writeStream = fs.createWriteStream(filePath);
    writeStream.on('error', (err) => {
      throw new Error(`Write stream error: ${err.message}`);
    });

    doc.pipe(writeStream);

    const pageWidth = doc.page.width;

    await drawHeader(doc, pageWidth, logoPath);
    drawInvoiceDetails(doc, pageWidth, invoiceDate);
    doc.moveDown(2);
    drawPassengerInfo(doc, pageWidth, consumerCard.passenger);
    drawConsumerCardDetails(doc, pageWidth, consumerCard);

    const { currentY, subtotal } = drawItemsTable(doc, pageWidth, consumerCard.items);
    const imageY = drawTotals(doc, pageWidth, currentY, consumerCard.totalCount || subtotal);

    await drawPaymentVoucher(doc, consumerCard, imageY);

    doc.end();

    return new Promise((resolve, reject) => {
      writeStream.on('finish', () => resolve(filePath));
      writeStream.on('error', reject);
    });
  } catch (error) {
    throw new Error(`PDF generation failed: ${error.message}`);
  }
};
