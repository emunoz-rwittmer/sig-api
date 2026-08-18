require('dotenv').config();
const { mailLayout } = require('./mailLayout');

class MailTemplates {
  static htmlNewUser(result, passwordGenerate) {
    const bodyHtml = `
              <p>Hola, ${result.firstName} ${result.lastName}</p>
              <div class="body-container">
                <p>Rolf Wittmer te ha invitado a ser parte de su equipo en el sistema interno,</p>
                <p>por favor utiliza las siguientes credenciales para ingresar.</p>
              </div>
              <div class="credencial-container">
                <h3 class="credential-tittle">User:</h3> <p>${result.email}</p>
              </div>
              <div class="credencial-container">
                <h3 class="credential-tittle">Password:</h3> <p>${passwordGenerate}</p>
              </div>
            `;
    return mailLayout({
      title: 'Tu cuenta ha sido creada con éxito',
      bodyHtml,
      button: { text: 'Iniciar sesión', href: process.env.URL }
    });
  }

  static htmlStaffForgotPassword(result, passwordGenerate) {
    const bodyHtml = `
              <p>
                Hola, <strong>${result.firstName} ${result.lastName}</strong>.
              </p>
              <p>Recibimos tu solicitud de restablecimiento de contraseña,</p>
              <p>puedes iniciar sesión con la siguiente contraseña temporal y tu correo registrado.</p>
              <div class="credencial-container">
                <h3 class="credential-tittle">Password:</h3> <p>${passwordGenerate}</p>
              </div>
            `;
    return mailLayout({
      title: 'Contraseña restablecida con éxito',
      bodyHtml,
      button: { text: 'Iniciar sesión', href: process.env.URL_STAFFS }
    });
  }

  static htmlForgotPassword(result, passwordGenerate) {
    const bodyHtml = `
              <p>Hola, ${result.firstName} ${result.lastName}</p>
              <div class="body-container">
                <p>Recibimos tu solicitud de restablecimiento de contraseña,</p>
                <p>puedes iniciar sesión con la siguiente contraseña temporal y tu correo registrado.</p>
              </div>
              <div class="credencial-container">
                <h3 class="credential-tittle">Password:</h3> <p>${passwordGenerate}</p>
              </div>
            `;
    return mailLayout({
      title: 'Contraseña restablecida con éxito',
      bodyHtml,
      button: { text: 'Iniciar sesión', href: process.env.URL }
    });
  }

  static htmlContentNewEvaluations() {
    const bodyHtml = `
              <p>
                Hola, <strong>Maria Belen Jara</strong>.
              </p>
              <p>Le informamos que el sistema creo y envió correctamente las evaluaciones de desempeño</p>
              <p>• Capitán → Tripulación</p>
              <p>• Tripulación → Capitán</p>
              <p>Para revisar detalles y listados ingrese al sistema, apartado evaluaciones enviadas.</p>
            `;
    return mailLayout({
      title: 'Evaluaciones creadas y enviadas correctamente',
      bodyHtml,
      button: { text: 'Iniciar sesión', href: process.env.URL }
    });
  }

  static htmlContentCommentCards() {
    const bodyHtml = `
              <p>
                Hola, <strong>Administrador</strong>.
              </p>
              <p>Le informamos que el sistema creo correctamente las comment cards para cada barco de forma satisfactoria</p>
              <p>Para revisar detalles ingrese al sistema, apartado Comment Cards</p>
            `;
    return mailLayout({
      title: 'Comment Cards creadas exitosamente',
      bodyHtml,
      button: { text: 'Iniciar sesión', href: process.env.URL }
    });
  }

  static htmlContentRetoalimentationEvaluation(result) {
    const bodyHtml = `
              <p>${result}</p>
            `;
    return mailLayout({
      title: 'Retroalimentacion de evaluaciones de desempeño',
      bodyHtml
    });
  }
}

module.exports = MailTemplates;
