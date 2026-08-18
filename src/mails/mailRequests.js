require('dotenv').config();
const { mailLayout } = require('./mailLayout');

class MailRequests {
  static htmlNuevaSolicitud(result) {
    const bodyHtml = `
              <p>
                Le informamos que <strong>${result.staff}</strong> ha generado una <strong>${result.formato}</strong>.
              </p>
              <p>Adjunto a este correo encontraras la solicitud en pdf.</p>
            `;
    return mailLayout({
      title: `${result.formato}`,
      bodyHtml,
      imageWidth: 180
    });
  }

  static htmlConfirmacionLectura(result) {
    const bodyHtml = `
              <p>Hola, Belen</p>
              <div class="body-container">
                <p>Has recibido la confirmación de lectura para ${result.reglamento}</p>
                <p>de parte de ${result.staff}</p>
              </div>
            `;
    return mailLayout({
      title: `${result.reglamento}`,
      bodyHtml
    });
  }

  static htmlGuiaRemisionCreada(result) {
    const bodyHtml = `
              <p>
                Le informamos que se ha generado exitosamente la <strong>Guía de Remisión Nº ${result.counter}</strong>
                correspondiente a la empresa <strong>Rolf Wittmer Turismo</strong>.
              </p>
              <p>
                Este documento ampara el traslado de los bienes registrados en su guía y ha sido emitido
                conforme a las disposiciones vigentes de la empresa.
              </p>
              <p>
                Puede consultar o descargar la guía adjunta a este correo.
              </p>
            `;
    return mailLayout({
      title: 'Guía de Remisión Emitida',
      bodyHtml
    });
  }
}

module.exports = MailRequests;
