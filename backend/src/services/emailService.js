const nodemailer = require('nodemailer');

let cachedTransporter = null;

const isEmailConfigured = () =>
    Boolean(process.env.SENDGRID_API_KEY) ||
    Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

const buildTransporter = () => {
    if (cachedTransporter) return cachedTransporter;

    // SendGrid via API key (preferred)
    if (process.env.SENDGRID_API_KEY) {
        cachedTransporter = nodemailer.createTransport({
            host: 'smtp.sendgrid.net',
            port: 587,
            secure: false,
            auth: {
                user: 'apikey',
                pass: process.env.SENDGRID_API_KEY,
            },
        });
        return cachedTransporter;
    }

    // Generic SMTP fallback
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        cachedTransporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT) || 587,
            secure: String(process.env.SMTP_SECURE || 'false') === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
        return cachedTransporter;
    }

    return null;
};

const sendEmail = async ({ to, subject, html, text }) => {
    if (!to) {
        return { success: false, simulated: false, message: 'Missing recipient email' };
    }

    const transporter = buildTransporter();
    const from = process.env.EMAIL_FROM ||
                 process.env.SMTP_FROM ||
                 process.env.SMTP_USER ||
                 'no-reply@floodguard.lk';

    if (!transporter) {
        console.log('[email:simulated] →', { to, subject });
        if (text) console.log('[email:simulated] body:\n' + text);
        return { success: true, simulated: true, message: 'Email simulated (not configured).' };
    }

    try {
        const info = await transporter.sendMail({ from, to, subject, html, text });
        console.log('[email] sent →', to, '| id:', info.messageId);
        return { success: true, simulated: false, messageId: info.messageId };
    } catch (err) {
        console.error('[email] send failed:', err.message);
        return { success: false, simulated: false, message: err.message };
    }
};

module.exports = { sendEmail, isEmailConfigured };
