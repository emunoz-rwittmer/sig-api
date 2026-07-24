const fs = require('fs');
const path = require('path');
const DateFormat = require('../../../utils/dateFormat');

exports.generateRemisionPDF = async (data, filePath) => {
  const { default: PDFDocument } = await import('pdfkit');

  const doc = new PDFDocument({ margin: 40 });
  const writeStream = fs.createWriteStream(filePath);
  doc.pipe(writeStream);

  // === ENCABEZADO (alineado en una sola línea) ===
  const logoPath = path.resolve(`./uploads/companies/logo_rwittmer.png`);
  const startY = 40;

  // Cuadro de encabezado
  doc.rect(40, startY, 515, 100).stroke();

  // Logo (izquierda)
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, 410, startY + 5, { width: 100 });
  }

  // Datos de empresa (centro)
  doc
    .font('Helvetica-Bold')
    .fontSize(12)
    .text('ROLF WITTMER', 50, startY + 15, { align: 'left' })
    .fontSize(9)
    .font('Helvetica')
    .text('CONTRIBUYENTE ESPECIAL - RESOLUCIÓN SRA No 571', 50, startY + 30)
    .text('DEL 7 DE AGOSTO DE 2009', 50, startY + 42)
    .text('MATRIZ: Tomás de Berlanga s/n y Los Colonos - Santa Cruz', 50, startY + 54)
    .text(`SUCURSAL: Leonidas Plaza N24-282 y Lizardo García Quito - Ecuador`, 50, startY + 66);

  // Bloque de la guía (derecha)
  const rightX = 380;
  doc
    .font('Helvetica-Bold')
    .fontSize(10)
    .text('GUÍA DE REMISIÓN', rightX, startY + 50, { align: 'center', width: 160 })
    .fontSize(14)
    .text(`Nº ${data.counter || ''}`, rightX, startY + 65, { align: 'center', width: 160 })

  // === FECHAS DE TRASLADO ===
  doc.moveDown(2);
  const fechasY = startY + 120;
  doc
    .fontSize(9)
    .font('Helvetica-Bold')
    .text('TRASLADO', 50, fechasY)
    .font('Helvetica')
    .text(`Inicio de traslado: ${DateFormat.formatMonthYear(data.dateStartTraslate)}`, 50, fechasY + 15)
    .text(`Terminación de traslado: ${DateFormat.formatMonthYear(data.dateEndTraslate)}`, 50, fechasY + 30);

  // Bloque de la guía (derecha)
  doc
    .fontSize(9)
    .font('Helvetica-Bold')
    .text('RUTA', rightX, fechasY)
    .font('Helvetica')
    .text(`Origen: ${data.from}`, rightX, fechasY + 15)
    .text(`Destino: ${data.to}`, rightX, fechasY + 30)

  doc
    .fontSize(10)
    .font('Helvetica')
    .text(`Ventas: ${data.sale ? 'x': ''}`, 50, fechasY + 45)
    .text(`Compras: ${data.buy ? 'x': ''}`, 150, fechasY + 45)
    .text(`Otros: ${data.other ? 'x': ''}`, 300, fechasY + 45);


  // Datos de traslado (centro)
  doc.moveDown(3);
  const trasladoY = fechasY + 65;
  doc
    .fontSize(9)
    .font('Helvetica-Bold')
    .text('IDENTIFICACION DE DESTINATARIO', 50, trasladoY)
    .font('Helvetica')
    .text(`Razon Social: ${data.addressee}`, 50, trasladoY + 15)
    .text(`RUC / CI: ${data.addresseeRuc}`, 50, trasladoY + 30);

  // Bloque de la guía (derecha)
  doc
    .fontSize(9)
    .font('Helvetica-Bold')
    .text('IDENTIFICACION DE TRANSPORTISTA', rightX, trasladoY)
    .font('Helvetica')
    .text(`Razon Social: ${data.carrier}`, rightX, trasladoY + 15)
    .text(`RUC / CI: ${data.carrierRuc}`, rightX, trasladoY + 30)
    .text(`PLACA: ${data.carrierLicence}`, rightX, trasladoY + 45);

  // === DETALLE DE LOS BIENES ===
  doc.moveDown(3);
  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .text('BIENES TRANSPORTADOS', 40);
  doc.moveDown(0.5);

  const tableTop = doc.y + 5;
  const pageWidth = doc.page.width - 80; // ancho total con márgenes
  const colWidths = [100, pageWidth - 100]; // Cantidad + Descripción
  const colX = [40, 140];

  // Encabezado tabla
  doc.rect(colX[0], tableTop, pageWidth, 20).stroke();
  doc
    .font('Helvetica-Bold')
    .fontSize(10)
    .text('CANTIDAD', colX[0] + 5, tableTop + 5)
    .text('DESCRIPCIÓN', colX[1] + 5, tableTop + 5);

  // Filas de la tabla
  let y = tableTop + 20;
  data.details.forEach((item) => {
    const rowHeight = 25;
    doc.rect(colX[0], y, pageWidth, rowHeight).stroke();

    doc
      .font('Helvetica')
      .fontSize(10)
      .text(item.quantity.toString(), colX[0] + 5, y + 7)
      .text(item.detail, colX[1] + 5, y + 7, { width: colWidths[1] - 10 });

    y += rowHeight;
  });

  const firmasY = y + 200;
  doc
    .moveTo(100, firmasY)
    .lineTo(250, firmasY)
    .stroke()
    .font('Helvetica')
    .fontSize(9)
    .text('Administrador', 100, firmasY + 5, { width: 150, align: 'center' });

  doc
    .moveTo(370, firmasY)
    .lineTo(520, firmasY)
    .stroke()
    .font('Helvetica')
    .fontSize(9)
    .text('Transportista', 370, firmasY + 5, { width: 150, align: 'center' });

  doc.end();
  await new Promise((resolve) => writeStream.on('finish', resolve));
  return filePath;
};
