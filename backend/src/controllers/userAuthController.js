const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Register a new user
exports.registerUser = async (req, res) => {
    try {
        const { name, email, phone, password, zone } = req.body;

       
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Create new user instance
        user = new User({
            name,
            email,
            phone,
            password,
            zone: zone || 'Default Zone', 
            isActive: true,
            alertsEnabled: true
        });

     
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

       
        await user.save();

        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// Login user
exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check if user exists
        let user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Validate password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Return user data (in a real app, generate JWT token here)
        // For simplicity now, just returning success and role
        res.status(200).json({
            message: 'Login successful',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: 'user'
            }
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

