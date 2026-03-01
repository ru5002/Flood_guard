const express = require('express');
const router = express.Router();
const { registerUser, loginUser } = require('../controllers/userAuthController');

// @route   POST api/users/register
// @desc    Register a user
// @access  Public
router.post('/register', registerUser);

// @route   POST api/users/login
// @desc    Login a user
// @access  Public
router.post('/login', loginUser);

module.exports = router;

