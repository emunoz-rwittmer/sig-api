// services/pdfService.js
const puppeteer = require('puppeteer');
const fs = require('fs/promises');
const path = require('path');
require('dotenv').config();

async function generateAndSavePDF(htmlContent, filePath, result, staffSignature, compania) {

  const firmaRRHH = `<img src="${process.env.URL_STAFFS + "/api/uploads/companies/firma_rrhh.png"}" alt="signature" style="width:180px;" />`;
  const firmaColaborador = `<img src="${process.env.URL_STAFFS + "/api" + staffSignature}" alt="signature" style="width:180px;" />`;
  const logoUrl = `<img src="${process.env.URL_STAFFS + "/api" + compania.logo}" alt="logo_empresa" style="width:180px;" />`;

  const contenidoHTML = htmlContent
    .replace('{compania}', result.compania)
    .replace('{yate}', result.yate)
    .replace('{valor_numero}', result.valor_numero)
    .replace('{numero_cuotas}', result.numero_cuotas)
    .replace('{motivo_prestamo}', result.motivo_prestamo)
    .replace('{adjuntar_documento}', '')
    .replace('{vuelo_uno}', `Ruta: ${result.vuelo_uno}`)
    .replace('{fecha_vuelo_uno}', `Fecha: ${result.fecha_vuelo_uno}`)
    .replace('{vuelo_dos}', `Ruta: ${result.vuelo_dos}`)
    .replace('{fecha_vuelo_dos}', `Fecha: ${result.fecha_vuelo_dos}`)
    .replace('{nombre_persona}', result.nombre_persona)
    .replace('{cedula_persona}', result.cedula_persona)
    .replace('{firma_rrhh}', firmaRRHH)
    .replace('{firma_colaborador}', firmaColaborador)

    .replace('{fecha_desembarque}', result.fecha_desembarque|| '')
    .replace('{fecha_ingreso}', result.fecha_ingreso|| '')

    .replace('{relevo_colaborador}', result.relevo_colaborador|| '')
    .replace('{relevo_cargo}', result.relevo_cargo)
    .replace('{relevo_telf}', result.relevo_telf || '')
    .replace('{relevo_correo}', result.relevo_correo || '')
    .replace('{obser_colaborador}', result.obser_colaborador || '')


  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  const finalHtmlContent = `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; padding: 10px 20px 20px; }
          .logo-container { text-align: right; margin-bottom: 5px; }
          .logo-container img { width: 200px; }
          .footer-logo {
            position: fixed;
            bottom: 0px;
            left: 0;
            right: 0;
            height: 20px;
            text-align: center;
          }
          .footer-logo img {
            width: 100%;
          }
        </style>
      </head>
      <body>
      <div class="logo-container">
       ${logoUrl}
      </div>
        ${contenidoHTML}
      </body>
    </html>
  `;

  await page.setContent(finalHtmlContent, { waitUntil: 'networkidle0' });

  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    margin: { top: '40px', bottom: '60px', left: '40px', right: '40px' },
    headerTemplate: `<div></div>`,
    footerTemplate: `<div></div>`,
  });

  await browser.close();

  await fs.writeFile(filePath, pdfBuffer);

  return filePath;
}

module.exports = { generateAndSavePDF };
