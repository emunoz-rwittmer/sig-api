require('dotenv').config();

class MailsConfirmation {
  static htmlConfirmationOrder(action, company, user) {
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
                    width: 230px;
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
                  <h2>Tu ${action} se a enviado correctamente!</h2>
                  <div class="body-container">
                    <p>Hola ${user.first_name} tu ${action} para ${company} ha sido enviado correctamente</p>
                    <p>revisa su estado iniciando sesión</p>
                  </div>
                  <div class="buttom-container">
                      <a href=${process.env.URL_STAFFS} class="button">Iniciar sesión</a>
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

  static htmlDispatch(action, content) {
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
                    width: 230px;
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
                  <h2>Tu ${action} ha sido despachado</h2>
                  <div class="body-container">
                    <p>Hola ${content.responsible.firstName} el ${action} ${content.name} para ${content.company.name} ha sido despachado</p>
                    <p>revisa su estado iniciando sesión</p>
                  </div>
                  <div class="buttom-container">
                      <a href=${process.env.URL_STAFFS} class="button">Iniciar sesión</a>
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

  static htmlConsumoRealizado(result) {
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
              <h2>DEAR ${result.passengerName},</h2>
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
              <div class="footer">
                <p>
                  This message was automatically generated by the internal management system.<br>
                  If you have any questions or require assistance, please contact our support team.
                </p>
                <div class="footer">
                    <p>Sincerely,</p>
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

module.exports = MailsConfirmation;
