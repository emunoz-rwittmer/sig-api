const Mails = require('../utils/mails');
require('dotenv').config();

const sendEmail = (user, passwordGenerated, action, userCopy, bodyMail) => {
    const sgMail = require('@sendgrid/mail')
    const htmlContentNewUser = Mails.htmlNewUser(user, passwordGenerated)
    const htmlContentForgotPassword = Mails.htmlForgotPassword(user, passwordGenerated)
    const htmlContentNewEvaluations = Mails.htmlContentNewEvaluations(user.dataValues)
    const htmlContentRetoalimentationEvaluation = Mails.htmlContentRetoalimentationEvaluation(bodyMail)
    sgMail.setApiKey(process.env.SENDGRID_API_KEY)
    const msg = { 
        to: user.email, // Change to your recipient
        from: 'notify-sig@rwittmer.com', // Change to your verified sender
        cc: action === 'retroalimetation' ? userCopy.email : "",
        subject: action === "new user" ? 'Acceso sistema interno' :
                 action === 'forgot passowrd' ? 'Restablecimiento de contraseña' : 
                 action === 'retroalimetation' ? 'Retroalimentación evaluaciones de desempeño' :'Evaluación de desempeño',
        html: action === "new user" ? htmlContentNewUser : 
              action === 'new evaluation' ? htmlContentNewEvaluations :
              action === 'retroalimetation' ? htmlContentRetoalimentationEvaluation : htmlContentForgotPassword
    }
    sgMail
        .send(msg)
        .then(() => {
            console.log('Email sent')
        })
        .catch((error) => {
            console.error(error)
        })
}

module.exports = sendEmail;