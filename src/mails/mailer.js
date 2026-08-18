const fs = require('fs').promises;
const Mails = require('./mailTemplates');
const MailsConfirmation = require('./mailConfirmation');
const MailsOrder = require('./mailOrder');
const MailsSolicitudes = require('./mailRequests');
require('dotenv').config();
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const FROM_EMAIL = 'notify-sig@rwittmer.com';

const RECIPIENTS = {
    edison: 'edison@tiptoptravel.ec',
    belen: 'belen@rwittmer.com',
    edwin: 'edwin@rwittmer.com',
    fabian: 'fabian@rwittmer.com',
    pablo: 'pablo@rwittmer.com',
    enrique: 'enrique@rwittmer.com',
    mirian: 'mirian@rwittmer.com',
    marjuri: 'marjuri@rwittmer.com',
    rosa: 'rosa@tiptoptravel.ec',
    javier: 'javier@tiptoptravel.ec',
};

const sendMail = (msg) =>
    sgMail
        .send(msg)
        .then(() => {
            console.log('Email sent')
        })
        .catch((error) => {
            console.error(error)
        });

const EMAIL_ACTIONS = {
    'new user': {
        subject: 'Acceso sistema interno',
        buildHtml: (user, passwordGenerated) => Mails.htmlNewUser(user, passwordGenerated),
    },
    'forgot passowrd': {
        subject: 'Restablecimiento de contraseña',
        buildHtml: (user, passwordGenerated) => Mails.htmlForgotPassword(user, passwordGenerated),
    },
    'new evaluation': {
        subject: 'Evaluación de desempeño',
        buildHtml: (user) => Mails.htmlContentNewEvaluations(user.dataValues),
    },
    'retroalimetation': {
        subject: 'Retroalimentación evaluaciones de desempeño',
        buildHtml: (_user, _passwordGenerated, _userCopy, bodyMail) => Mails.htmlContentRetoalimentationEvaluation(bodyMail),
    },
};

// Acción por defecto: replica el fallback original (subject de evaluación + html de forgot password)
// para cualquier action no reconocida.
const DEFAULT_EMAIL_ACTION = {
    subject: 'Evaluación de desempeño',
    buildHtml: (user, passwordGenerated) => Mails.htmlForgotPassword(user, passwordGenerated),
};

const sendEmail = (user, passwordGenerated, action, userCopy, bodyMail) => {
    const { subject, buildHtml } = EMAIL_ACTIONS[action] || DEFAULT_EMAIL_ACTION;
    const msg = {
        to: user.email,
        from: FROM_EMAIL,
        cc: action === 'retroalimetation' ? userCopy.email : "",
        subject,
        html: buildHtml(user, passwordGenerated, userCopy, bodyMail),
    };
    return sendMail(msg);
}

const sendEmailCommentCard = () => {
    const html = Mails.htmlContentCommentCards()
    return sendMail({
        to: RECIPIENTS.edison,
        from: FROM_EMAIL,
        subject: 'Comment Cards creadas con exito',
        html,
    });
}

const sendInvoiceEmail = async (data) => {
    const html = MailsConfirmation.htmlInvoicePassenger(data)

    try {
        const fileContent = await fs.readFile(data.invoicePath);
        const base64Content = fileContent.toString('base64');

        const msg = {
            to: data.passengerEmail,
            from: FROM_EMAIL,
            subject: 'Bar Notification',
            html,
            attachments: [
                {
                    content: base64Content,
                    filename: `Invoice_${data.passengerName.replace(/\s+/g, '_')}.pdf`,
                    type: 'application/pdf',
                    disposition: 'attachment'
                },
            ],
        }
        await sendMail(msg);
    } catch (error) {
        console.error(error)
    }
}

const sendBarConsumption = (data) => {
    const html = MailsConfirmation.htmlConsumoRealizado(data)
    return sendMail({
        to: data.passengerEmail,
        from: FROM_EMAIL,
        subject: 'Bar Consumption Notification',
        html,
    });
}

const sendEmailEvaluationCrew = () => {
    const html = Mails.htmlContentNewEvaluations()
    return sendMail({
        to: RECIPIENTS.belen,
        from: FROM_EMAIL,
        cc: RECIPIENTS.edison,
        subject: 'Evaluaciónes de desempeño creadas y enviadas',
        html,
    });
}

const sendEmailPasswordStaff = (user, passwordGenerated) => {
    const html = Mails.htmlStaffForgotPassword(user, passwordGenerated)
    return sendMail({
        to: user.email,
        from: FROM_EMAIL,
        subject: 'Restablecimiento de contraseña',
        html,
    });
}

const sendEmailNewOrder = (companyName) => {
    const html = MailsOrder.htmlNewOrder(companyName)
    return sendMail({
        to: RECIPIENTS.edwin,
        from: FROM_EMAIL,
        cc: RECIPIENTS.belen,
        subject: 'Pedido recibido',
        html,
    });
}

const sendEmailNewRequest = (companyName) => {
    const html = MailsOrder.htmlNewRequest(companyName)
    return sendMail({
        to: RECIPIENTS.fabian,
        from: FROM_EMAIL,
        cc: RECIPIENTS.pablo,
        subject: 'Requerimiento recibido',
        html,
    });
}

const sendConfirmationEmail = (action, companyName, user) => {
    const html = MailsConfirmation.htmlConfirmationOrder(action, companyName, user.dataValues)
    return sendMail({
        to: user.email,
        from: FROM_EMAIL,
        subject: `Su ${action} se envio correctamente`,
        html,
    });
}

const sendDispatchEmail = (action, content) => {
    const html = MailsConfirmation.htmlDispatch(action, content.dataValues)
    return sendMail({
        to: content.responsible.email,
        from: FROM_EMAIL,
        subject: `Su ${action} ha sido despachado`,
        html,
    });
}

// formatId -> constructor de la lista de CC. Agregar un nuevo formato con CC
// especial solo requiere añadir una entrada aquí, sin tocar sendEmailNuevaSolicitud.
const FORMAT_CC_MAP = {
    1: () => [RECIPIENTS.javier, RECIPIENTS.mirian, RECIPIENTS.marjuri, RECIPIENTS.rosa],
    2: () => [RECIPIENTS.javier, RECIPIENTS.mirian, RECIPIENTS.marjuri, RECIPIENTS.rosa],
    10: (yachtEmail) => [RECIPIENTS.mirian, `${yachtEmail}`],
};

const sendEmailNuevaSolicitud = async (formatId, dataMail, adjuntos, yachtEmail) => {
    try {
        const html = MailsSolicitudes.htmlNuevaSolicitud(dataMail);

        const msg = {
            to: [RECIPIENTS.belen],
            from: FROM_EMAIL,
            subject: `${dataMail.formato} de ${dataMail.staff}`,
            html,
            attachments: adjuntos,
        };

        const buildCc = FORMAT_CC_MAP[formatId];
        if (buildCc) {
            msg.cc = buildCc(yachtEmail);
        }

        await sgMail.send(msg);

    } catch (error) {
        console.error('Error enviando correo:', error);
    }
};

const sendEmailConfirmacion = (dataMail) => {
    const html = MailsSolicitudes.htmlConfirmacionLectura(dataMail);
    return sendMail({
        to: RECIPIENTS.belen,
        from: FROM_EMAIL,
        subject: 'Confirmación de lectura',
        html,
    });
}

const sendEmailGuiaRemisionCreada = (dataMail, fileName, filePath) => {
    const html = MailsSolicitudes.htmlGuiaRemisionCreada(dataMail);
    return sendMail({
        to: RECIPIENTS.belen,
        from: FROM_EMAIL,
        cc: RECIPIENTS.enrique,
        subject: 'Confirmación de guía de remisión',
        html,
        attachments: [
            {
                content: filePath, // contenido en base64
                filename: fileName,
                type: 'application/pdf',
                disposition: 'attachment',
            },
        ],
    });
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
