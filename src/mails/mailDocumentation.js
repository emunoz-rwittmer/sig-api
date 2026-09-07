require('dotenv').config();
const moment = require('moment');
const { mailLayout } = require('./mailLayout');

const STAGE_LABELS = {
  '30': 'está por caducar',
  '7': 'está por caducar de forma urgente',
  expired: 'ya caducó',
};

class MailDocumentation {
  static htmlStaffDocumentExpiring(staff, document, stage, expiryDate) {
    const formattedDate = moment(expiryDate).format('DD/MM/YYYY');
    const bodyHtml = `
              <p>Hola, <strong>${staff.firstName} ${staff.lastName}</strong>.</p>
              <div class="body-container">
                <p>Tu documento <span class="highlight">${document.name}</span> ${STAGE_LABELS[stage]}.</p>
                <p>Fecha de caducidad: <strong>${formattedDate}</strong></p>
                <p>Por favor gestiona la renovación y actualiza el documento en el sistema lo antes posible.</p>
              </div>
            `;
    return mailLayout({
      title: 'Documento por gestionar',
      bodyHtml,
      button: { text: 'Iniciar sesión', href: process.env.URL_STAFFS }
    });
  }

  static htmlRRHHDocumentExpiringDigest(items) {
    const rows = items.map(({ staff, document, stage, expiryDate }) => `
              <tr>
                <td>${staff.firstName} ${staff.lastName}</td>
                <td>${document.name}</td>
                <td>${STAGE_LABELS[stage]}</td>
                <td>${moment(expiryDate).format('DD/MM/YYYY')}</td>
              </tr>
            `).join('');

    const bodyHtml = `
              <p>Hola, <strong>Maria Belen Jara</strong>.</p>
              <p>Los siguientes documentos de staff requieren gestión de renovación:</p>
              <table style="width:100%; border-collapse: collapse;" border="1" cellpadding="6">
                <thead>
                  <tr>
                    <th>Staff</th>
                    <th>Documento</th>
                    <th>Estado</th>
                    <th>Caducidad</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows}
                </tbody>
              </table>
            `;
    return mailLayout({
      title: 'Documentos de staff por caducar',
      bodyHtml,
      button: { text: 'Iniciar sesión', href: process.env.URL }
    });
  }
}

module.exports = MailDocumentation;
