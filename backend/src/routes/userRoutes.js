const express = require('express');
const router = express.Router();
const {
    registerUser,
    loginUser,
    updateUserProfile,
    sendUserLocationAlert,
    requestPasswordReset,
    verifyPasswordResetCode,
    resetPassword,
} = require('../controllers/userAuthController');

// @route   POST api/users/register
// @desc    Register a user
// @access  Public
router.post('/register', registerUser);

// @route   POST api/users/login
// @desc    Login a user
// @access  Public
router.post('/login', loginUser);

// @route   POST api/users/password/forgot
// @desc    Email a 6-digit reset code (always 200; no email enumeration)
// @access  Public
router.post('/password/forgot', requestPasswordReset);

// @route   POST api/users/password/verify
// @desc    Verify the 6-digit code; returns a short-lived reset token
// @access  Public
router.post('/password/verify', verifyPasswordResetCode);

// @route   POST api/users/password/reset
// @desc    Set new password using the short-lived reset token
// @access  Public
router.post('/password/reset', resetPassword);

// @route   PUT api/users/:id
// @desc    Update user profile
// @access  Public (for demo purposes)
router.put('/:id', updateUserProfile);

// @route   POST api/users/:id/location-alert
// @desc    Send/simulate a location-based flood SMS for the user's registered zone
// @access  Public (demo)
router.post('/:id/location-alert', sendUserLocationAlert);

module.exports = router;

