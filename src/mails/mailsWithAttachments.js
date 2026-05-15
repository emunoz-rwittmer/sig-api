const fs = require('fs');
const path = require('path');
require('dotenv').config();

const sendEmailWithAttachments = async (to, subject, htmlContent, attachments = [], cc) => {
  try {
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    // Procesar archivos adjuntos
    const attachmentsData = [];
    
    for (const attachment of attachments) {
      try {
        const fileContent = fs.readFileSync(attachment.path);
        const base64Content = fileContent.toString('base64');
        
        attachmentsData.push({
          content: base64Content,
          filename: attachment.filename,
          type: attachment.type || 'application/octet-stream',
          disposition: 'attachment'
        });
      } catch (error) {
        console.error(`Error reading attachment ${attachment.path}:`, error);
      }
    }

    const msg = {
      to,
      from: 'notify-sig@rwittmer.com',
      cc: cc || '',
      subject,
      html: htmlContent,
      attachments: attachmentsData,
    };

    await sgMail.send(msg);
    console.log('Email sent successfully with attachments');
    return { success: true };
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

const sendCruiseReportEmail = async (to, cruise, excelPath, pdfPath, zipPath, cc) => {
  try {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
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
                    width: 180px;
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
              <h2>Estimado usuario,</h2>
              <p>Se adjunta el reporte completo del crucero: <strong>${cruise.name}</strong></p>
               <p>
                <strong>Detalles del Crucero:</strong><br>
                - Código: ${cruise.code}<br>
                - Yacht: ${cruise.yacht?.name || 'N/A'}<br>
                - Itinerario: ${cruise.itinerary}<br>
                - Fechas: ${new Date(cruise.startDate).toLocaleDateString('es-ES')} - ${new Date(cruise.endDate).toLocaleDateString('es-ES')} <br>
                - Barman: ${cruise.barman}
                </p>
              <p>
                <strong>Documentos adjuntos:</strong><br>
                • Reporte Excel con información de consumer cards<br>
                • Reporte PDF detallado con fotos de vouchers<br>
                • Archivo ZIP con todos los documentos
              </p>
              <p>Por favor, descargue los archivos adjuntos para revisar los detalles completos.</p>
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

    const attachments = [];

    // Agregar archivos individuales
    if (fs.existsSync(excelPath)) {
      attachments.push({
        path: excelPath,
        filename: `Reporte_Crucero_${cruise.code}.xlsx`,
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
    }

    if (fs.existsSync(pdfPath)) {
      attachments.push({
        path: pdfPath,
        filename: `Reporte_Crucero_${cruise.code}.pdf`,
        type: 'application/pdf'
      });
    }

    // O agregar el ZIP si existe
    if (fs.existsSync(zipPath)) {
      attachments.push({
        path: zipPath,
        filename: `Reporte_Crucero_${cruise.code}.zip`,
        type: 'application/zip'
      });
    }

    return await sendEmailWithAttachments(to, `Reporte de Crucero: ${cruise.name}`, htmlContent, attachments, cc);
  } catch (error) {
    console.error('Error sending cruise report email:', error);
    throw error;
  }
};

module.exports = {
  sendEmailWithAttachments,
  sendCruiseReportEmail
};
