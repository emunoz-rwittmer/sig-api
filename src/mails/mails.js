require('dotenv').config();

class Mails {
  static htmlNewUser(result, passwordGenerate) {
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
                  <h2>Tu cuenta ha sido creada con éxito</h2>
                  <p>Hola, ${result.firstName} ${result.lastName}</p>
                  <div class="body-container">
                    <p>Rolf Wittmer te ha invitado a ser parte de su equipo en el sistema interno,</p>
                    <p>por favor utiliza las siguientes credenciales para ingresar.</p>
                  </div>
                  <div class="credencial-container">
                    <h3 class="credential-tittle">User:</h3> <p>${result.email}</p>
                  </div>
                  <div class="credencial-container">
                    <h3 class="credential-tittle">Password:</h3> <p>${passwordGenerate} </p>
                  </div>
                  <div class="buttom-container">
                      <a href=${process.env.URL} class="button">Iniciar sesión</a>
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

  static htmlStaffForgotPassword(result, passwordGenerate) {
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
              .credencial-container p, h3 {
                 margin: 0px;
              }
              .credential-tittle {
                 margin-right: 10px;
              }
              .styled-image {
                 width: 200px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="image-container">
                    <img src="https://reservation.rwittmer.com/logo_rwittmer.png" alt="Imagen con Estilos" class="styled-image">
              </div>
              <h2>Contraseña restablecida con éxito</h2> 
              <p>
                Hola, <strong>${result.firstName} ${result.lastName}</strong>.
              </p>
              <p>Recibimos tu solicitud de restablecimiento de contraseña,</p>
              <p>puedes iniciar sesión con la siguiente contraseña temporal y tu correo registrado.</p>
              <div class="credencial-container">
                <h3 class="credential-tittle">Password:</h3> <p>${passwordGenerate} </p>
              </div>              
              <a href=${process.env.URL_STAFFS} class="button">Iniciar sesión</a>
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

  static htmlForgotPassword(result, passwordGenerate) {
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
                  <h2>Contraseña restablecida con éxito</h2>
                  <p>Hola, ${result.firstName} ${result.lastName}</p>
                  <div class="body-container">
                    <p>Recibimos tu solicitud de restablecimiento de contraseña,</p>
                    <p>puedes iniciar sesión con la siguiente contraseña temporal y tu correo registrado.</p>
                  </div>
                  <div class="credencial-container">
                    <h3 class="credential-tittle">Password:</h3> <p>${passwordGenerate} </p>
                  </div>
                  <div class="buttom-container">
                      <a href=${process.env.URL} class="button">Iniciar sesión</a>
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

  static htmlContentNewEvaluations() {
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
              .credencial-container p, h3 {
                 margin: 0px;
              }
              .credential-tittle {
                 margin-right: 10px;
              }
              .styled-image {
                 width: 200px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="image-container">
                    <img src="https://reservation.rwittmer.com/logo_rwittmer.png" alt="Imagen con Estilos" class="styled-image">
              </div>
              <h2>Evaluaciones creadas y enviadas correctamente</h2> 
              <p>
                Hola, <strong>Maria Belen Jara</strong>.
              </p>
              <p>Le informamos que el sistema creo y envió  correctamente las evaluaciones de desempeño </p>
              <p>• Capitán → Tripulación</p>
              <p>• Tripulación → Capitán</p>

              <p>Para revisar detalles y listados ingrese al sistema, apartado evaluaciones enviadas.</p>

              <a href=${process.env.URL} class="button">Iniciar sesión</a>

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

  static htmlContentCommentCards() {
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
              .credencial-container p, h3 {
                 margin: 0px;
              }
              .credential-tittle {
                 margin-right: 10px;
              }
              .styled-image {
                 width: 200px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="image-container">
                    <img src="https://reservation.rwittmer.com/logo_rwittmer.png" alt="Imagen con Estilos" class="styled-image">
              </div>
              <h2>Comment Cards creadas exitosamente</h2> 
              <p>
                Hola, <strong>Administrador</strong>.
              </p>
              <p>Le informamos que el sistema creo correctamente las comment cards para cada barco</p>
              <p>de forma satisfactoria</p>
              <p>Para revisar detalles ingrese al sistema, apartado Comment Cards</p>

              <a href=${process.env.URL} class="button">Iniciar sesión</a>

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

  static htmlContentRetoalimentationEvaluation(result) {
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
                  <h2>Retroalimentacion de evaluaciones de desempeño</h2>
                  <p>${result} </p>
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

}

module.exports = Mails;
