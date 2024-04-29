const Mails = require('../utils/mails');
const sendgrid = require('../utils/sendgrid');
require('dotenv').config();

const sendEmail = (user, passwordGenerated, action) => {
    const sgMail = require('@sendgrid/mail')
    const htmlContentNewUser = Mails.htmlNewUser(user, passwordGenerated)
    const htmlContentForgotPassword = Mails.htmlForgotPassword(user, passwordGenerated)
    const htmlContentEvaluationCaptain = Mails.htmlContentEvaluationCaptain(user.dataValues, passwordGenerated)
    const htmlContentEvaluationCrew = Mails.htmlContentEvaluationCrew(user.dataValues, passwordGenerated)
    sgMail.setApiKey(sendgrid.sendgrid_api_key)
    const msg = {
        to: user.email, // Change to your recipient
        from: 'edison@tiptoptravel.ec', // Change to your verified sender
        subject: action === "new user" ? 'Acceso sistema interno' :
                 action === 'forgot passowrd' ? 'Restablecimiento de contraseña' : 'Evaluación de desempeño',
        html: action === "new user" ? htmlContentNewUser : 
              action === 'capitanes' ? htmlContentEvaluationCaptain : 
              action === 'tripulacion' ? htmlContentEvaluationCrew : htmlContentForgotPassword
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