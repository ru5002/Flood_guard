const express = require('express');
const router = express.Router();
const { registerUser, loginUser, updateUserProfile, sendUserLocationAlert } = require('../controllers/userAuthController');

// @route   POST api/users/register
// @desc    Register a user
// @access  Public
router.post('/register', registerUser);

// @route   POST api/users/login
// @desc    Login a user
// @access  Public
router.post('/login', loginUser);

// @route   PUT api/users/:id
// @desc    Update user profile
// @access  Public (for demo purposes)
router.put('/:id', updateUserProfile);

// @route   POST api/users/:id/location-alert
// @desc    Send/simulate a location-based flood SMS for the user's registered zone
// @access  Public (demo)
router.post('/:id/location-alert', sendUserLocationAlert);

module.exports = router;

