require('dotenv').config();
const { mailLayout } = require('./mailLayout');

class MailOrder {
  static htmlNewOrder(company) {
    const bodyHtml = `
              <div class="body-container">
                <p>Hola has recibido un nuevo pedido para la empresa</p>
                <p>${company}</p>
              </div>
              <div class="body-container">
                <p>Inicia sesión con tus credenciales para revisarlo</p>
              </div>
            `;
    return mailLayout({
      title: 'Has recibido un nuevo pedido',
      bodyHtml,
      button: { text: 'Iniciar sesión', href: process.env.URL_STAFFS }
    });
  }

  static htmlRegisterNovelty(counter, observations) {
    const safeObservations = String(observations ?? '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const bodyHtml = `
              <div class="body-container">
                <p>Galápagos ingresó el registro <strong>${counter}</strong> con diferencias frente a lo despachado.</p>
                <p>Observación: ${safeObservations}</p>
              </div>
              <div class="body-container">
                <p>Revisa el registro y aplica el ajuste en la bodega de origen.</p>
              </div>
            `;
    return mailLayout({
      title: 'Registro con novedad',
      bodyHtml,
      button: { text: 'Iniciar sesión', href: process.env.URL_STAFFS }
    });
  }

  static htmlNewRequest(company) {
    const bodyHtml = `
              <div class="body-container">
                <p>Hola has recibido un nuevo requerimiento para la embarcación</p>
                <p>${company}</p>
              </div>
              <div class="body-container">
                <p>Inicia sesión con tus credenciales para revisarlo</p>
              </div>
            `;
    return mailLayout({
      title: 'Has recibido un nuevo pedido',
      bodyHtml,
      button: { text: 'Iniciar sesión', href: process.env.URL_STAFFS }
    });
  }
}

module.exports = MailOrder;
