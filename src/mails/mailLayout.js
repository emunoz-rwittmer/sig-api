require('dotenv').config();

const LOGO_URL = 'https://reservation.rwittmer.com/logo_rwittmer.png';

/**
 * Layout reutilizable para todos los correos del sistema interno.
 * Estándar visual: Segoe UI, contenedor blanco redondeado, acento azul #004aad.
 *
 * @param {Object} options
 * @param {string} options.title   - Título principal (etiqueta <h2>).
 * @param {string} options.bodyHtml - Cuerpo del correo en HTML (párrafos, listas, etc.).
 * @param {Object} [options.button] - Botón opcional de acción.
 * @param {string} options.button.text - Texto del botón.
 * @param {string} options.button.href  - Enlace del botón.
 * @param {number} [options.imageWidth=200] - Ancho del logo en px.
 * @returns {string} HTML completo del correo.
 */
const mailLayout = ({ title, bodyHtml, button = null, imageWidth = 200 }) => {
  const buttonHtml = button
    ? `<a href="${button.href}" class="button">${button.text}</a>`
    : '';

  return `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8" />
          <style>
              body {
                font-family: 'Segoe UI', Arial, sans-serif;
                background-color: #f9fafb;
                color: #333;
                margin: 0;
                padding: 0;
              }
              .container {
                background-color: #ffffff;
                max-width: 650px;
                margin: 40px auto;
                padding: 30px;
                border-radius: 12px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.05);
              }
              h2 {
                color: #004aad;
                margin-bottom: 8px;
              }
              p {
                line-height: 1.6;
                margin: 8px 0;
              }
              .highlight {
                font-weight: 600;
                color: #004aad;
              }
              .footer {
                margin-top: 25px;
                font-size: 13px;
                color: #666;
                border-top: 1px solid #eee;
                padding-top: 15px;
                text-align: center;
              }
              .button {
                display: inline-block;
                margin-top: 20px;
                background-color: #004aad;
                color: #fff;
                text-decoration: none;
                padding: 10px 18px;
                border-radius: 6px;
                font-weight: 500;
              }
              .image-container {
                 text-align: center;
                 margin-top: 20px;
               }
              .styled-image {
                 width: ${imageWidth}px;
              }
            </style>
        </head>
        <body>
          <div class="container">
              <div class="image-container">
                    <img src="${LOGO_URL}" alt="Rolf Wittmer" class="styled-image">
              </div>
              <h2>${title}</h2>
              ${bodyHtml}
              ${buttonHtml}
              <div class="footer">
                <p>
                  Este mensaje fue generado automáticamente por el sistema de gestión interna.<br>
                  Si tiene dudas o requiere asistencia, comuníquese con nuestro equipo de soporte.
                </p>
                <div class="footer">
                    <p>Atentamente</p>
                    <h3>Rolf Wittmer</h3>
                </div>
                <p><strong>Rolf Wittmer</strong> © ${new Date().getFullYear()} — Todos los derechos reservados</p>
              </div>
          </div>
        </body>
        </html>
        `;
};

module.exports = { mailLayout, LOGO_URL };
