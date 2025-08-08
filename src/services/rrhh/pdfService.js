// services/pdfService.js
const puppeteer = require('puppeteer');
const fs = require('fs/promises');
const path = require('path');
require('dotenv').config();

async function generateAndSavePDF(htmlContent, filePath, result) {

  const contenidoHTML = htmlContent
    .replace('{compania}', result.company)
    .replace('{vuelo_uno}', `Ruta: ${result.flightOne}`)
    .replace('{fecha_vuelo_uno}', `Fecha: ${result.dateFlightOne}`)
    .replace('{vuelo_dos}', `Ruta: ${result.flightTwo}`)
    .replace('{fecha_vuelo_dos}', `Fecha: ${result.dateFlightTwo}`)

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
          .logo-container { text-align: center; margin-bottom: 20px; }
          .logo-container img { width: 300px; }
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

  // ✅ Guarda el archivo en la ruta completa recibida
  await fs.writeFile(filePath, pdfBuffer);

  return filePath;
}

module.exports = { generateAndSavePDF };
