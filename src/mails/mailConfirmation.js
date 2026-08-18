require('dotenv').config();
const { mailLayout } = require('./mailLayout');

class MailConfirmation {
  static htmlConfirmationOrder(action, company, user) {
    const bodyHtml = `
              <div class="body-container">
                <p>Hola ${user.first_name} tu ${action} para ${company} ha sido enviado correctamente</p>
                <p>revisa su estado iniciando sesión</p>
              </div>
            `;
    return mailLayout({
      title: `Tu ${action} se a enviado correctamente!`,
      bodyHtml,
      button: { text: 'Iniciar sesión', href: process.env.URL_STAFFS }
    });
  }

  static htmlDispatch(action, content) {
    const bodyHtml = `
              <div class="body-container">
                <p>Hola ${content.responsible.firstName} el ${action} ${content.name} para ${content.company.name} ha sido despachado</p>
                <p>revisa su estado iniciando sesión</p>
              </div>
            `;
    return mailLayout({
      title: `Tu ${action} ha sido despachado`,
      bodyHtml,
      button: { text: 'Iniciar sesión', href: process.env.URL_STAFFS }
    });
  }

  static htmlConsumoRealizado(result) {
    const bodyHtml = `
              <p>Warm greetings.</p>
              <p>
                We would like to inform you that a bar consumption has been registered under your account, in accordance with the onboard services available during your stay.
              </p>
              <p>
                <strong>Consumption details:</strong><br>
                  • Date: ${result.date}<br>
                  • Time: ${result.time}<br>
                  • Point of sale: BAR ${result.yacht}<br>
                  • Description: ${result.items}<br>
                  • Total amount: <strong>$${result.totalAmount}</strong><br>
              </p>
              <p>
               This charge has been applied to your onboard account. We recommend reviewing your expenses regularly to maintain proper control of your spending during your journey.<br><br>
               If you have any questions or notice any discrepancies, please do not hesitate to contact our customer service team, who will be happy to assist you.<br><br>

               Thank you for your preference. We hope you continue enjoying an exceptional experience onboard.
              </p>
            `;
    return mailLayout({
      title: `DEAR, ${result.passengerName}`,
      bodyHtml,
      imageWidth: 180
    });
  }

  static htmlInvoicePassenger(result) {
    const bodyHtml = `
              <p>Warm greetings from <strong>Rolf Wittmer</strong>.</p>
              <p>
              We would like to sincerely thank you for choosing to travel with us and for enjoying your experience aboard the yacht <strong>${result.yacht}</strong>. It has been a pleasure having you with us.
              </p>
              <p>
              <strong>Invoice details:</strong><br>
                  • Date: ${result.date}<br>
                  • Time: ${result.time}<br>
                  • Yacht: ${result.yacht}<br>
                  • Total amount: <strong>$${result.totalAmount}</strong><br>
              </p>
              <p>
                This invoice reflects the services and consumptions registered to your onboard account during your journey.
              </p>
              <p>
                Should you have any questions or require any clarification regarding this invoice, please do not hesitate to contact us. Our team will be more than happy to assist you.
              </p>
              <p>
                Once again, thank you for choosing <strong>Rolf Wittmer</strong>. We truly hope to welcome you again for another unforgettable experience in the Galápagos Islands.
              </p>
            `;
    return mailLayout({
      title: `DEAR ${result.passengerName},`,
      bodyHtml,
      imageWidth: 180
    });
  }
}

module.exports = MailConfirmation;
