const Mails = require('./mailTemplates');
const MailsConfirmation = require('./mailConfirmation');
const MailsOrder = require('./mailOrder');
const MailsSolicitudes = require('./mailRequests');
require('dotenv').config();
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendEmail = (user, passwordGenerated, action, userCopy, bodyMail) => {
    const htmlContentNewUser = Mails.htmlNewUser(user, passwordGenerated)
    const htmlContentForgotPassword = Mails.htmlForgotPassword(user, passwordGenerated)
    const htmlContentNewEvaluations = Mails.htmlContentNewEvaluations(user.dataValues)
    const htmlContentRetoalimentationEvaluation = Mails.htmlContentRetoalimentationEvaluation(bodyMail)
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

const sendEmailCommentCard = () => {
    const htmlContentCommentCards = Mails.htmlContentCommentCards()
    const msg = {
        to: 'edison@tiptoptravel.ec',
        from: 'notify-sig@rwittmer.com',
        subject: 'Comment Cards creadas con exito',
        html: htmlContentCommentCards
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

const sendInvoiceEmail = async (data) => {
    const fs = require('fs').promises;
    const htmlContentCommentCards = MailsConfirmation.htmlInvoicePassenger(data)
    
    try {
        const fileContent = await fs.readFile(data.invoicePath);
        const base64Content = fileContent.toString('base64');
        
        const msg = {
            to: data.passengerEmail,
            from: 'notify-sig@rwittmer.com',
            subject: 'Bar Notification',
            html: htmlContentCommentCards,
            attachments: [
                {
                    content: base64Content,
                    filename: `Invoice_${data.passengerName.replace(/\s+/g, '_')}.pdf`,
                    type: 'application/pdf',
                    disposition: 'attachment'
                },
            ],
        }
        await sgMail.send(msg);
        console.log('Email sent')
    } catch (error) {
        console.error(error)
    }
}

const sendBarConsumption = (data) => {
    const htmlContentCommentCards = MailsConfirmation.htmlConsumoRealizado(data)
    const msg = {
        to: data.passengerEmail,
        from: 'notify-sig@rwittmer.com',
        subject: 'Bar Consumption Notification',
        html: htmlContentCommentCards
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

const sendEmailEvaluationCrew = () => {
    const htmlContentNewEvaluations = Mails.htmlContentNewEvaluations()
    const msg = {
        to: 'belen@rwittmer.com',
        from: 'notify-sig@rwittmer.com',
        cc: 'edison@tiptoptravel.ec',
        subject: 'Evaluaciónes de desempeño creadas y enviadas',
        html: htmlContentNewEvaluations
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

const sendEmailPasswordStaff = (user, passwordGenerated) => {
    const htmlContentForgotPassword = Mails.htmlStaffForgotPassword(user, passwordGenerated)
    const msg = {
        to: user.email, // Change to your recipient
        from: 'notify-sig@rwittmer.com', // Change to your verified sender
        subject: 'Restablecimiento de contraseña',
        html: htmlContentForgotPassword
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
    const htmlContentNewOrder = MailsOrder.htmlNewOrder(companyName)
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
    const htmlContentNewRequest = MailsOrder.htmlNewRequest(companyName)
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
    const htmlContentNewOrder = MailsConfirmation.htmlConfirmationOrder(action, companyName, user.dataValues)
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
    const htmlDispatch = MailsConfirmation.htmlDispatch(action, content.dataValues)
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

const sendEmailNuevaSolicitud = async (formatId, dataMail, adjuntos, yachtEmail) => {
    try {
        const htmlFirmaContrato = MailsSolicitudes.htmlNuevaSolicitud(dataMail);

        const msg = {
            to: ['belen@rwittmer.com'],
            from: 'notify-sig@rwittmer.com',
            subject: `${dataMail.formato} de ${dataMail.staff}`,
            html: htmlFirmaContrato,
            attachments: adjuntos,
        };

        if (formatId === 1 || formatId === 2) {
            msg.cc = ['javier@tiptoptravel.ec', 'mirian@rwittmer.com', 'marjuri@rwittmer.com', 'rosa@tiptoptravel.ec'];
        }

        if (formatId === 10) {
            msg.cc = ['mirian@rwittmer.com', `${yachtEmail}`];
        }

        await sgMail.send(msg);

    } catch (error) {
        console.error('Error enviando correo:', error);
    }
};

const sendEmailConfirmacion = (dataMail) => {

    const htmlFirmaContrato = MailsSolicitudes.htmlConfirmacionLectura(dataMail);
    const msg = {
        to: 'belen@rwittmer.com', // Change to your recipient
        from: 'notify-sig@rwittmer.com', // Change to your verified sender
        subject: 'Confirmación de lectura',
        html: htmlFirmaContrato,
    }
    sgMail
        .send(msg)
        .then(() => {
            console.log('Email sent')
        })
        .catch((error) => {
            console.log(error)
        })
}

const sendEmailGuiaRemisionCreada = (dataMail, fileName, filePath) => {
    const html = MailsSolicitudes.htmlGuiaRemisionCreada(dataMail);
    const msg = {
        to: 'belen@rwittmer.com', // Change to your recipient
        from: 'notify-sig@rwittmer.com', // Change to your verified sender
        cc: 'enrique@rwittmer.com',
        subject: 'Confirmación de guía de remisión',
        html: html,
        attachments: [
            {
                content: filePath, // contenido en base64
                filename: fileName,
                type: 'application/pdf',
                disposition: 'attachment',
            },
        ],
    }
    sgMail
        .send(msg)
        .then(() => {
            console.log('Email sent')
        })
        .catch((error) => {
            console.log(error)
        })
}

module.exports = {
    sendEmail,
    sendBarConsumption,
    sendInvoiceEmail,
    sendEmailEvaluationCrew,
    sendEmailCommentCard,
    sendEmailPasswordStaff,
    sendEmailNewOrder,
    sendConfirmationEmail,
    sendDispatchEmail,
    sendEmailNewRequest,
    sendEmailNuevaSolicitud,
    sendEmailConfirmacion,
    sendEmailGuiaRemisionCreada
};