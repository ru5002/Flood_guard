const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const seedAdmin = async () => {
    try {
        // Connect to Database
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected...');

        // Check if admin already exists
        const email = 'admin@floodguard.lk';
        const existingAdmin = await Admin.findOne({ email });

        if (existingAdmin) {
            console.log('⚠️  Admin account already exists.');
            console.log(`   Email: ${email}`);
            console.log('   (Password is unchanged from when you first created it)');
            process.exit();
        }

        // Create new admin
        const salt = await bcrypt.genSalt(10);
        const password = 'admin123'; // Default password
        const hashedPassword = await bcrypt.hash(password, salt);

        const newAdmin = new Admin({
            name: 'Super Admin',
            email: email,
            password: hashedPassword,
            role: 'super_admin',
            department: 'DMC',
            permissions: ['manage_users', 'manage_alerts', 'view_analytics', 'system_settings'],
            isActive: true
        });

        await newAdmin.save();

        console.log('✅ Default Admin Account Created Successfully!');
        console.log('------------------------------------------------');
        console.log(`   Email:    ${email}`);
        console.log(`   Password: ${password}`);
        console.log('------------------------------------------------');
        
        process.exit();
    } catch (err) {
        console.error('❌ Error seeding admin:', err);
        process.exit(1);
    }
};

seedAdmin();
