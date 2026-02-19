const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Get all users with pagination
exports.getAllUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search || '';
        const zone = req.query.zone || '';
        const status = req.query.status || '';

        const query = {};
        
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } }
            ];
        }
        
        if (zone) {
            query.zone = zone;
        }
        
        if (status === 'active') {
            query.isActive = true;
        } else if (status === 'inactive') {
            query.isActive = false;
        }

        const total = await User.countDocuments(query);
        const users = await User.find(query)
            .select('-password')
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip((page - 1) * limit);

        res.json({
            users,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit),
                limit
            }
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Get user by ID
exports.getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};

// Create new user
exports.createUser = async (req, res) => {
    try {
        const { name, email, phone, password, zone, address } = req.body;

        const existingUser = await User.findOne({ 
            $or: [{ email: email.toLowerCase() }, { phone }] 
        });
        
        if (existingUser) {
            return res.status(400).json({ error: 'User with this email or phone already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        const user = new User({
            name,
            email: email.toLowerCase(),
            phone,
            password: hashedPassword,
            zone,
            address
        });

        await user.save();
        
        const userResponse = user.toObject();
        delete userResponse.password;
        
        res.status(201).json({ message: 'User created successfully', user: userResponse });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Update user
exports.updateUser = async (req, res) => {
    try {
        const { name, email, phone, zone, address, isActive, alertsEnabled } = req.body;
        
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (email && email !== user.email) {
            const emailExists = await User.findOne({ 
                email: email.toLowerCase(),
                _id: { $ne: req.params.id }
            });
            if (emailExists) {
                return res.status(400).json({ error: 'Email already in use' });
            }
        }

        if (phone && phone !== user.phone) {
            const phoneExists = await User.findOne({ 
                phone,
                _id: { $ne: req.params.id }
            });
            if (phoneExists) {
                return res.status(400).json({ error: 'Phone already in use' });
            }
        }

        user.name = name || user.name;
        user.email = email ? email.toLowerCase() : user.email;
        user.phone = phone || user.phone;
        user.zone = zone || user.zone;
        user.address = address !== undefined ? address : user.address;
        user.isActive = isActive !== undefined ? isActive : user.isActive;
        user.alertsEnabled = alertsEnabled !== undefined ? alertsEnabled : user.alertsEnabled;

        await user.save();
        
        const userResponse = user.toObject();
        delete userResponse.password;
        
        res.json({ message: 'User updated successfully', user: userResponse });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Delete user
exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};

// Get user statistics
exports.getUserStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const activeUsers = await User.countDocuments({ isActive: true });
        const inactiveUsers = await User.countDocuments({ isActive: false });
        const alertsEnabledCount = await User.countDocuments({ alertsEnabled: true });
        
        const usersByZone = await User.aggregate([
            { $group: { _id: '$zone', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        const recentRegistrations = await User.countDocuments({
            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        });

        res.json({
            totalUsers,
            activeUsers,
            inactiveUsers,
            alertsEnabledCount,
            usersByZone,
            recentRegistrations
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Get all zones
exports.getZones = async (req, res) => {
    try {
        const zones = await User.distinct('zone');
        res.json(zones.sort());
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};
