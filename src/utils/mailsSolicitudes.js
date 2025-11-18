require('dotenv').config();

class MailsSolicitudes {
  static htmlNuevaSolicitud(result) {
      const htmlContent = `
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
               .footer p,h3 {
                 margin: 0px;
                }
               .footer {
                 margin-top: 20px;
                }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="image-container">
                    <img src="https://reservation.rwittmer.com/logo_rwittmer.png" alt="Imagen con Estilos" class="styled-image">
              </div>
              <h2>${result.formato}</h2>
  
              <p>
                Le informamos que <strong>${result.staff}</strong> ha generado una <strong>${result.formato}</strong>.
              </p>
              <p>Adjunto a este correo encontraras la solicitud en pdf.</p>
              <div class="footer">
                <p>
                  Este mensaje fue generado automáticamente por el sistema de gestión interna.<br>
                  Si tiene dudas o requiere asistencia, comuníquese con nuestro equipo de soporte.
                </p>
                <div class="footer">
                    <p>Atentamente</p>
                    <h3>Rolf Wittmer</h3>
                </div>
                <p><strong>Rolf Wittmer</strong> © 2025 — Todos los derechos reservados</p>
              </div>
            </div>
          </body>
          </html>
          `;
    return htmlContent;
  }

  static htmlConfirmacionLectura(result) {
    const htmlContent = `
          <!DOCTYPE html>
          <html lang="es">
          <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                  body {
                      font-family: arial, sans-serif;
                  }
                  .container-pass {
                      max-width: 600px;
                      margin: 0 auto;
                  }
                  .image-container {
                      text-align: center;
                      margin-top: 20px;
                  }
                  .styled-image {
                    width: 150px;
                  }
                  .credencial-container {
                    display: flex;
                    align-items: center;
                  }
                  .credencial-container p, h3 {
                    margin: 0px;
                  }
                  .credential-tittle {
                    margin-right: 10px;
                  }
                  .button {
                      display: inline-block;
                      padding: 10px 20px;
                      text-decoration: none;
                      background-color: #F29100;
                      border-radius: 150px;
                      color: #ffffff;
                  }
                  .buttom-container {
                      display: flex;
                      justify-content: center;
                      margin-bottom: 20px;
                      margin-top: 20px;
                  }
                  .body-container p {
                    margin: 0px;
                  }
                  .body-container {
                    margin-bottom: 20px;
                  }
                  .footer p,h3 {
                    margin: 0px;
                  }
                  .footer {
                    margin-top: 20px;
                  }
              </style>
          </head>
          <body>
              <div class="container-pass">
                  <div class="image-container">
                    <img src="https://reservation.rwittmer.com/logo_rwittmer.png" alt="Imagen con Estilos" class="styled-image">
                  </div>
                  <h2>${result.reglamento}</h2>
                  <p>Hola, Belen</p>
                  <div class="body-container">
                    <p>Has recibido la confirmación de lectura para ${result.reglamento}</p>
                    <p>de parte de ${result.staff}</p>
                  </div>
                  <div class="footer">
                    <p>Atentamente</p>
                    <h3>Rolf Wittmer</h3>
                  </div>
              </div>
          </body>
          </html>
          `;
    return htmlContent;
  }

  static htmlGuiaRemisionCreada(result) {
    const htmlContent = `
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
               .footer p,h3 {
                 margin: 0px;
                }
               .footer {
                 margin-top: 20px;
                }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="image-container">
                    <img src="https://reservation.rwittmer.com/logo_rwittmer.png" alt="Imagen con Estilos" class="styled-image">
              </div>
              <h2>Guía de Remisión Emitida</h2>
  
              <p>
                Le informamos que se ha generado exitosamente la <strong>Guía de Remisión Nº ${result.counter}</strong>
                correspondiente a la empresa <strong>${result.company}</strong>.
              </p>

              <p>
                Este documento ampara el traslado de los bienes registrados en su guía y ha sido emitido
                conforme a las disposiciones vigentes del SRI.
              </p>

              <p>
                Puede consultar o descargar la guía adjunta a este correo.
              </p>

              <div class="footer">
                <p>
                  Este mensaje fue generado automáticamente por el sistema de gestión interna.<br>
                  Si tiene dudas o requiere asistencia, comuníquese con nuestro equipo de soporte.
                </p>
                <div class="footer">
                    <p>Atentamente</p>
                    <h3>Rolf Wittmer</h3>
                </div>
                <p><strong>Rolf Wittmer</strong> © 2025 — Todos los derechos reservados</p>
              </div>
            </div>
          </body>
          </html>
          `;
    return htmlContent;
  }

}

module.exports = MailsSolicitudes;
