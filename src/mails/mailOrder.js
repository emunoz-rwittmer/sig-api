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
