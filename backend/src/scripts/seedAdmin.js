const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const DEFAULT_EMAIL = process.env.ADMIN_EMAIL || 'admin@floodguard.lk';
const DEFAULT_PASSWORD = process.env.ADMIN_PASSWORD;
if (!DEFAULT_PASSWORD) {
    console.error('❌ ADMIN_PASSWORD is not set in .env. Aborting seed.');
    process.exit(1);
}

const seedAdmin = async () => {
    try {
        const resetPassword = process.argv.includes('--reset');

        // Connect to Database
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected...');

        const email = DEFAULT_EMAIL;
        const existingAdmin = await Admin.findOne({ email });

        if (existingAdmin && resetPassword) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, salt);
            existingAdmin.password = hashedPassword;
            existingAdmin.isActive = true;
            await existingAdmin.save();
            console.log('✅ Admin password reset successfully.');
            console.log('------------------------------------------------');
            console.log(`   Email:    ${email}`);
            console.log(`   Password: ${DEFAULT_PASSWORD}`);
            console.log('------------------------------------------------');
            process.exit();
        }

        if (existingAdmin) {
            console.log('⚠️  Admin account already exists.');
            console.log(`   Email: ${email}`);
            console.log('   (Password unchanged.) To reset to default, run: node src/scripts/seedAdmin.js --reset');
            process.exit();
        }

        // Create new admin
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, salt);

        const newAdmin = new Admin({
            name: 'FloodGuard Admin',
            email: email,
            password: hashedPassword,
            role: 'floodguard_admin',
            department: 'DMC',
            permissions: ['manage_users', 'manage_alerts', 'view_analytics', 'system_settings'],
            isActive: true
        });

        await newAdmin.save();

        console.log('✅ Default Admin Account Created Successfully!');
        console.log('------------------------------------------------');
        console.log(`   Email:    ${email}`);
        console.log(`   Password: ${DEFAULT_PASSWORD}`);
        console.log('------------------------------------------------');
        
        process.exit();
    } catch (err) {
        console.error('❌ Error seeding admin:', err);
        process.exit(1);
    }
};

seedAdmin();
