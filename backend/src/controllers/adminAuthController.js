const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

const JWT_SECRET = process.env.JWT_SECRET || 'floodguard_secret_key_2026';

// Admin login
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const admin = await Admin.findOne({ email: email.toLowerCase() });
        
        if (!admin) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        if (!admin.isActive) {
            return res.status(403).json({ error: 'Account is deactivated' });
        }

        const isMatch = await bcrypt.compare(password, admin.password);
        
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        admin.lastLogin = new Date();
        await admin.save();

        const token = jwt.sign(
            { id: admin._id, email: admin.email, role: admin.role, type: 'admin' },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({
            token,
            admin: {
                id: admin._id,
                email: admin.email,
                name: admin.name,
                role: admin.role,
                department: admin.department,
                permissions: admin.permissions
            }
        });
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ error: 'Server error during login' });
    }
};

// Get admin profile
exports.getProfile = async (req, res) => {
    try {
        const admin = await Admin.findById(req.admin._id).select('-password');
        res.json(admin);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};

// Create default admin (for initial setup)
exports.createDefaultAdmin = async (req, res) => {
    try {
        const existingAdmin = await Admin.findOne({ email: 'admin@floodguard.lk' });
        
        if (existingAdmin) {
            return res.status(400).json({ error: 'Default admin already exists' });
        }

        const hashedPassword = await bcrypt.hash('Admin@123', 10);
        
        const admin = new Admin({
            email: 'admin@floodguard.lk',
            password: hashedPassword,
            name: 'System Administrator',
            role: 'super_admin',
            department: 'DMC',
            permissions: ['manage_users', 'manage_alerts', 'view_analytics', 'system_settings']
        });

        await admin.save();
        
        res.json({ 
            message: 'Default admin created successfully',
            credentials: {
                email: 'admin@floodguard.lk',
                password: 'Admin@123',
                note: 'Please change the password after first login'
            }
        });
    } catch (error) {
        console.error('Create admin error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
