const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { mailLayout } = require('./mailLayout');

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
    const bodyHtml = `
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
            `;
    const htmlContent = mailLayout({
      title: 'Estimado usuario,',
      bodyHtml,
      imageWidth: 180
    });

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
