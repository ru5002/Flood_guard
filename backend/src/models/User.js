const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    phone: {
        type: String,
        required: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    zone: {
        type: String,
        required: true
    },
    address: {
        type: String
    },
    isActive: {
        type: Boolean,
        default: true
    },
    alertsEnabled: {
        type: Boolean,
        default: true
    },
    lastAlertReceived: {
        type: Date
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('User', userSchema);
