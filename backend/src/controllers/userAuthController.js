const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const SMSLog = require('../models/SMSLog');
const { sendSMS, isTwilioConfigured } = require('../services/smsService');

const JWT_SECRET = process.env.JWT_SECRET || 'floodguard_secret_key_2026';

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

