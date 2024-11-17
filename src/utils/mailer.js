const Mails = require('../utils/mails');
const MailsConfirmation = require('./mailsOfConfirmation');
const MailsOrder = require('./mailsOrder');
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
                action === 'retroalimetation' ? 'Retroalimentación evaluaciones de desempeño' : 'Evaluación de desempeño',
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

const sendEmailNewOrder = (companyName) => {
    const sgMail = require('@sendgrid/mail')
    const htmlContentNewOrder = MailsOrder.htmlNewOrder(companyName)
    sgMail.setApiKey(process.env.SENDGRID_API_KEY)
    const msg = {
        to: 'edwin@rwittmer.com', // Change to your recipient
        from: 'notify-sig@rwittmer.com', // Change to your verified sender
        cc: 'belen@rwittmer.com',
        subject: 'Pedido recibido',
        html: htmlContentNewOrder
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

const sendEmailNewRequest = (companyName) => {
    const sgMail = require('@sendgrid/mail')
    const htmlContentNewRequest = MailsOrder.htmlNewRequest(companyName)
    sgMail.setApiKey(process.env.SENDGRID_API_KEY)
    const msg = {
        to: 'fabian@rwittmer.com', // Change to your recipient
        from: 'notify-sig@rwittmer.com', // Change to your verified sender
        cc: 'pablo@rwittmer.com',
        subject: 'Requerimiento recibido',
        html: htmlContentNewRequest
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

const sendConfirmationEmail = (action, companyName, user) => {
    const sgMail = require('@sendgrid/mail')
    const htmlContentNewOrder = MailsConfirmation.htmlConfirmationOrder(action, companyName, user.dataValues)
    sgMail.setApiKey(process.env.SENDGRID_API_KEY)
    const msg = {
        to: user.email, // Change to your recipient
        from: 'notify-sig@rwittmer.com', // Change to your verified sender
        subject: `Su ${action} se envio correctamente`,
        html: htmlContentNewOrder
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

const sendDispatchEmail = (action, content) => {
    const sgMail = require('@sendgrid/mail')
    const htmlDispatch = MailsConfirmation.htmlDispatch(action, content.dataValues)
    sgMail.setApiKey(process.env.SENDGRID_API_KEY)
    const msg = {
        to: content.responsible.email, // Change to your recipient
        from: 'notify-sig@rwittmer.com', // Change to your verified sender
        subject: `Su ${action} ha sido despachado`,
        html: htmlDispatch
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

module.exports = {
    sendEmail,
    sendEmailNewOrder,
    sendConfirmationEmail,
    sendDispatchEmail,
    sendEmailNewRequest
};