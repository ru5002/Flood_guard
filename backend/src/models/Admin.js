const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['super_admin', 'admin', 'viewer'],
        default: 'admin'
    },
    department: {
        type: String,
        enum: ['DMC', 'Irrigation', 'Meteorology', 'Other'],
        default: 'DMC'
    },
    permissions: [{
        type: String,
        enum: ['manage_users', 'manage_alerts', 'view_analytics', 'system_settings']
    }],
    lastLogin: {
        type: Date
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Admin', adminSchema);
