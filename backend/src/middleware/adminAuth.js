const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

const adminAuth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ error: 'Access denied. No token provided.' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'floodguard_secret_key_2026');
        
        if (decoded.type !== 'admin') {
            return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
        }

        const admin = await Admin.findById(decoded.id);
        
        if (!admin || !admin.isActive) {
            return res.status(401).json({ error: 'Invalid authentication token.' });
        }

        req.admin = admin;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid authentication token.' });
    }
};

const checkPermission = (permission) => {
    return (req, res, next) => {
        if (req.admin.role === 'super_admin' || req.admin.permissions.includes(permission)) {
            next();
        } else {
            res.status(403).json({ error: 'Insufficient permissions.' });
        }
    };
};

module.exports = { adminAuth, checkPermission };
