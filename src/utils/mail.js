import Mailgen from 'mailgen';
import nodemailer from 'nodemailer';
import { ApiError } from './ApiError';

const sendMail = async (options = { content: '', email: '', subject: '' }) => {
    // Initialize mailgen instance with default theme and brand configuration
    const mailGenerator = new Mailgen({
        theme: 'default',
        product: {
            name: 'Cartify',
            link: 'https://cartify.app',
        },
    });

    // Generate the plaintext version of the e-mail (for clients that do not support HTML)
    const emailTextual = mailGenerator.generatePlaintext(options.content);

    // Generate an HTML email with the provided contents
    const emailHtml = mailGenerator.generate(options.content);

    // Create a nodemailer transporter instance which is responsible to send a mail
    const transporter = nodemailer.createTransport({
        host: process.env.MAILTRAP_SMTP_HOST,
        port: process.env.MAILTRAP_SMTP_PORT,
        auth: {
            user: process.env.MAILTRAP_SMTP_USER,
            pass: process.env.MAILTRAP_SMTP_PASS,
        },
    });
    const mail = {
        from: 'mail.freeapi@gmail.com', // We can name this anything. The mail will go to your Mailtrap inbox
        to: options.email, // receiver's mail
        subject: options.subject, // mail subject
        text: emailTextual, // mailgen content textual variant
        html: emailHtml, // mailgen content html variant
    };

    try {
        await transporter.sendMail(mail);
    } catch (error) {
        throw new ApiError(404, error.message);
    }
};
