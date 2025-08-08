require('dotenv').config();

class MailsSolicitudes {
  static htmlNuevaSolicitud(result) {
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
                  <h2>${result.formato}</h2>
                  <p>Hola, Belen</p>
                  <div class="body-container">
                    <p>Has resibido una ${result.formato}</p>
                    <p>de ${result.staff}</p>
                  </div>
                   <div class="body-container">
                    <p>Adjunto a este correo encontraras la solicitud en pdf</p>
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

}

module.exports = MailsSolicitudes;
