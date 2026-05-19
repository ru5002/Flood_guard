const User = require('../models/User');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const SMSLog = require('../models/SMSLog');
const { sendSMS, isTwilioConfigured } = require('../services/smsService');
const { sendEmail, isEmailConfigured } = require('../services/emailService');

const JWT_SECRET = process.env.JWT_SECRET || 'floodguard_secret_key_2026';
const RESET_CODE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const RESET_TOKEN_TTL = '15m';
const RESET_MAX_ATTEMPTS = 5;

const normalizeEmail = (email) =>
    typeof email === 'string' ? email.trim().toLowerCase() : '';

const isBcryptHash = (value) =>
    typeof value === 'string' && /^\$2[aby]\$\d{2}\$/.test(value);

const normalizeLocation = (value = '') =>
    String(value).toLowerCase().replace(/[^a-z0-9]/g, '');

const sameLocation = (left = '', right = '') => {
    const a = normalizeLocation(left);
    const b = normalizeLocation(right);
    return Boolean(a && b && (a === b || a.includes(b) || b.includes(a)));
};

const locationRiskMessage = ({ zone, location, riskLevel, rainfall, floodProbability }) => {
    const place = location || zone;
    const rainText = Number.isFinite(Number(rainfall))
        ? ` Rainfall: ${Number(rainfall).toFixed(1)}mm.`
        : '';
    const probabilityText = Number.isFinite(Number(floodProbability))
        ? ` Flood probability: ${Number(floodProbability) > 1 ? Number(floodProbability).toFixed(0) : (Number(floodProbability) * 100).toFixed(0)}%.`
        : '';

    if (riskLevel === 'Moderate') {
        return `FloodGuard MODERATE alert for ${place}: Flood risk is increasing.${rainText}${probabilityText} Stay alert, prepare essentials, and avoid low-lying areas. DMC: 117.`;
    }

    return `FloodGuard ${riskLevel.toUpperCase()} warning for ${place}: Flooding is possible.${rainText}${probabilityText} Move to a safe place if water rises and follow local evacuation guidance. DMC: 117.`;
};

// Register a new user
exports.registerUser = async (req, res) => {
    try {
        const { name, email, phone, password, zone, address } = req.body;

        const emailNorm = normalizeEmail(email);
        if (!emailNorm) {
            return res.status(400).json({ message: 'Valid email is required' });
        }
        if (!name || !phone || !password || !zone) {
            return res.status(400).json({ message: 'Name, phone, password, and location are required' });
        }

        let user = await User.findOne({ email: emailNorm });
        if (user) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Create new user instance
        user = new User({
            name,
            email: emailNorm,
            phone,
            password,
            zone,
            address,
            isActive: true,
            alertsEnabled: true
        });

     
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

       
        await user.save();

        const token = jwt.sign(
            { id: user._id, role: 'user' },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({ message: 'User registered successfully', token });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// Login user
exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        const emailNorm = normalizeEmail(email);
        if (!emailNorm || password === undefined || password === null) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        // Check if user exists
        let user = await User.findOne({ email: emailNorm });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Validate password (bcrypt; upgrade legacy plaintext hashes once on success)
        let isMatch = false;
        if (isBcryptHash(user.password)) {
            isMatch = await bcrypt.compare(password, user.password);
        } else if (typeof user.password === 'string' && password === user.password) {
            isMatch = true;
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
            await user.save();
        }

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Return user data (in a real app, generate JWT token here)
        const token = jwt.sign(
            { id: user._id, role: 'user' },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(200).json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                zone: user.zone,
                address: user.address,
                alertsEnabled: user.alertsEnabled,
                role: 'user'
            }
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// Update user profile
exports.updateUserProfile = async (req, res) => {
    try {
        const userId = req.params.id;
        const { name, email, phone, zone, alertsEnabled } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.name = name || user.name;
        user.email = email || user.email;
        user.phone = phone || user.phone;
        user.zone = zone || user.zone;
        if (alertsEnabled !== undefined) {
            user.alertsEnabled = alertsEnabled;
        }

        await user.save();

        res.status(200).json({
            message: 'Profile updated successfully',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                zone: user.zone,
                address: user.address,
                alertsEnabled: user.alertsEnabled,
                role: 'user'
            }
        });
    } catch (err) {
        console.error('Update profile error:', err.message);
        res.status(500).send('Server Error');
    }
};

const hashResetCode = (code) =>
    crypto.createHash('sha256').update(String(code)).digest('hex');

const buildResetEmail = ({ name, code }) => {
    const safeName = name ? name.split(' ')[0] : 'there';
    const subject = 'FloodGuard password reset code';
    const text = `Hi ${safeName},\n\n` +
        `Your FloodGuard password reset code is: ${code}\n` +
        `It expires in 15 minutes.\n\n` +
        `If you did not request this, you can ignore this email.\n\n` +
        `— FloodGuard`;
    const html = `
        <div style="font-family:Segoe UI,Arial,sans-serif;color:#0f172a;padding:24px;background:#f8fafc;">
            <div style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;padding:28px;">
                <h2 style="margin:0 0 8px;font-size:1.15rem;color:#1a6b5a;">FloodGuard</h2>
                <p style="margin:0 0 16px;color:#475569;">Password reset code</p>
                <p style="margin:0 0 12px;">Hi ${safeName},</p>
                <p style="margin:0 0 16px;">Use the code below to reset your FloodGuard password. It expires in 15 minutes.</p>
                <div style="font-size:1.75rem;font-weight:800;letter-spacing:0.4em;text-align:center;
                            padding:14px 0;background:#f1f5f9;border-radius:10px;color:#0f172a;">${code}</div>
                <p style="margin:18px 0 0;font-size:0.85rem;color:#64748b;">If you did not request a password reset, you can safely ignore this email.</p>
            </div>
        </div>`;
    return { subject, text, html };
};

// POST /api/users/password/forgot
// Always returns 200 to avoid leaking which emails are registered.
exports.requestPasswordReset = async (req, res) => {
    try {
        const emailNorm = normalizeEmail(req.body?.email);
        if (!emailNorm) {
            return res.status(400).json({ message: 'A valid email is required.' });
        }

        const genericResponse = {
            message: 'If an account exists for that email, a reset code has been sent.',
            emailConfigured: isEmailConfigured(),
        };

        const user = await User.findOne({ email: emailNorm });
        if (!user) {
            return res.status(200).json(genericResponse);
        }

        const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
        user.resetCodeHash = hashResetCode(code);
        user.resetCodeExpires = new Date(Date.now() + RESET_CODE_TTL_MS);
        user.resetCodeAttempts = 0;
        await user.save();

        const { subject, text, html } = buildResetEmail({ name: user.name, code });
        const result = await sendEmail({ to: user.email, subject, text, html });

        return res.status(200).json({
            ...genericResponse,
            simulated: Boolean(result.simulated),
        });
    } catch (err) {
        console.error('requestPasswordReset error:', err.message);
        return res.status(500).json({ message: 'Server error' });
    }
};

// POST /api/users/password/verify
// Verifies the 6-digit code and returns a short-lived reset token.
exports.verifyPasswordResetCode = async (req, res) => {
    try {
        const emailNorm = normalizeEmail(req.body?.email);
        const code = String(req.body?.code || '').trim();
        if (!emailNorm || !/^\d{6}$/.test(code)) {
            return res.status(400).json({ message: 'Email and 6-digit code are required.' });
        }

        const user = await User.findOne({ email: emailNorm });
        if (!user || !user.resetCodeHash || !user.resetCodeExpires) {
            return res.status(400).json({ message: 'Invalid or expired code.' });
        }

        if (user.resetCodeExpires.getTime() < Date.now()) {
            user.resetCodeHash = null;
            user.resetCodeExpires = null;
            user.resetCodeAttempts = 0;
            await user.save();
            return res.status(400).json({ message: 'Code expired. Request a new one.' });
        }

        if ((user.resetCodeAttempts || 0) >= RESET_MAX_ATTEMPTS) {
            user.resetCodeHash = null;
            user.resetCodeExpires = null;
            user.resetCodeAttempts = 0;
            await user.save();
            return res.status(429).json({ message: 'Too many attempts. Request a new code.' });
        }

        if (hashResetCode(code) !== user.resetCodeHash) {
            user.resetCodeAttempts = (user.resetCodeAttempts || 0) + 1;
            await user.save();
            return res.status(400).json({ message: 'Invalid code.' });
        }

        const resetToken = jwt.sign(
            { id: user._id, purpose: 'password-reset' },
            JWT_SECRET,
            { expiresIn: RESET_TOKEN_TTL }
        );

        return res.status(200).json({ message: 'Code verified.', resetToken });
    } catch (err) {
        console.error('verifyPasswordResetCode error:', err.message);
        return res.status(500).json({ message: 'Server error' });
    }
};

// POST /api/users/password/reset
// Consumes the short-lived reset token and sets the new password.
exports.resetPassword = async (req, res) => {
    try {
        const { resetToken, newPassword } = req.body || {};
        if (!resetToken || typeof newPassword !== 'string' || newPassword.length < 6) {
            return res.status(400).json({ message: 'Reset token and new password (min 6 chars) are required.' });
        }

        let payload;
        try {
            payload = jwt.verify(resetToken, JWT_SECRET);
        } catch (e) {
            return res.status(400).json({ message: 'Reset session expired. Start again.' });
        }
        if (payload.purpose !== 'password-reset') {
            return res.status(400).json({ message: 'Invalid reset token.' });
        }

        const user = await User.findById(payload.id);
        if (!user) {
            return res.status(400).json({ message: 'Account not found.' });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        user.resetCodeHash = null;
        user.resetCodeExpires = null;
        user.resetCodeAttempts = 0;
        await user.save();

        return res.status(200).json({ message: 'Password updated. You can now log in.' });
    } catch (err) {
        console.error('resetPassword error:', err.message);
        return res.status(500).json({ message: 'Server error' });
    }
};

exports.sendUserLocationAlert = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (!user.isActive || !user.alertsEnabled || !user.phone) {
            return res.status(200).json({
                success: true,
                sent: false,
                message: 'User is inactive, alerts are disabled, or no phone number is saved.',
                twilioActive: isTwilioConfigured()
            });
        }

        const { location, riskLevel, rainfall, floodProbability } = req.body;
        const alertLevels = ['Critical', 'High', 'Moderate'];

        if (!alertLevels.includes(riskLevel)) {
            return res.status(200).json({
                success: true,
                sent: false,
                message: 'Risk level does not require an SMS alert.',
                twilioActive: isTwilioConfigured()
            });
        }

        if (!sameLocation(user.zone, location)) {
            return res.status(200).json({
                success: true,
                sent: false,
                message: `Prediction location "${location}" does not match registered zone "${user.zone}".`,
                twilioActive: isTwilioConfigured()
            });
        }

        const phoneSuffix = String(user.phone).replace(/[^\d]/g, '').slice(-9);
        const recentAlert = await SMSLog.findOne({
            phoneNumber: { $regex: `${phoneSuffix}$` },
            zone: user.zone,
            riskLevel,
            sentAt: { $gte: new Date(Date.now() - 30 * 60 * 1000) }
        }).lean();

        if (recentAlert) {
            return res.status(200).json({
                success: true,
                sent: false,
                message: 'A recent alert was already sent for this zone and risk level.',
                twilioActive: isTwilioConfigured()
            });
        }

        const message = locationRiskMessage({
            zone: user.zone,
            location,
            riskLevel,
            rainfall,
            floodProbability
        });

        const result = await sendSMS(user.phone, message, {
            zone: user.zone,
            riskLevel,
            sentBy: 'prediction-page',
            alertTitle: `${riskLevel} Flood Alert - ${user.zone}`
        });

        res.json({
            success: true,
            sent: result.success,
            simulated: Boolean(result.simulated),
            message: result.simulated
                ? 'SMS alert simulated. Configure Twilio credentials for real delivery.'
                : 'SMS alert sent.',
            twilioActive: isTwilioConfigured()
        });
    } catch (err) {
        console.error('sendUserLocationAlert error:', err.message);
        res.status(500).json({ success: false, message: err.message });
    }
};

