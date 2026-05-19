const nodemailer = require('nodemailer');

let cachedTransporter = null;

const isEmailConfigured = () =>
    Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

const buildTransporter = () => {
    if (cachedTransporter) return cachedTransporter;
    if (!isEmailConfigured()) return null;

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
};

const sendEmail = async ({ to, subject, html, text }) => {
    if (!to) {
        return { success: false, simulated: false, message: 'Missing recipient email' };
    }

    const transporter = buildTransporter();
    const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@floodguard.local';

    if (!transporter) {
        // Simulation fallback so the flow still works without SMTP credentials.
        // The code is printed to the server console for local/demo testing.
        console.log('[email:simulated] →', { to, subject });
        if (text) console.log('[email:simulated] body:\n' + text);
        return { success: true, simulated: true, message: 'Email simulated (SMTP not configured).' };
    }

    try {
        const info = await transporter.sendMail({ from, to, subject, html, text });
        return { success: true, simulated: false, messageId: info.messageId };
    } catch (err) {
        console.error('[email] send failed:', err.message);
        return { success: false, simulated: false, message: err.message };
    }
};

module.exports = { sendEmail, isEmailConfigured };
