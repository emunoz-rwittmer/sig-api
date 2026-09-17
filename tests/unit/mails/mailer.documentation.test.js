jest.mock('@sendgrid/mail', () => ({
    setApiKey: jest.fn(),
    send: jest.fn().mockResolvedValue(undefined),
}));

const sgMail = require('@sendgrid/mail');
const { sendEmailRRHHDocumentExpiringDigest } = require('../../../src/mails/mailer');

describe('sendEmailRRHHDocumentExpiringDigest', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        sgMail.send.mockResolvedValue(undefined);
    });

    it('envía el resumen a Belén, Miriam, Edison y únicamente al yate correspondiente', async () => {
        const yacht = {
            id: 10,
            name: 'TIP TOP II',
            email: 'tiptopii@rwittmer.com',
        };
        const items = [{
            staff: { firstName: 'Juan', lastName: 'Perez' },
            document: { name: 'Cédula' },
            stage: '30',
            expiryDate: new Date('2026-10-01T00:00:00.000Z'),
        }];

        await sendEmailRRHHDocumentExpiringDigest(items, yacht);

        expect(sgMail.send).toHaveBeenCalledTimes(1);
        expect(sgMail.send).toHaveBeenCalledWith(expect.objectContaining({
            to: 'belen@rwittmer.com',
            cc: [
                'mirian@rwittmer.com',
                'edison@tiptoptravel.ec',
                'tiptopii@rwittmer.com',
            ],
            subject: expect.stringContaining('TIP TOP II'),
        }));
        expect(sgMail.send.mock.calls[0][0].cc).not.toContain('tiptopiv@rwittmer.com');
    });
});
