const bcrypt = require('bcryptjs');
const Admin = require('../../src/models/Admin');

const TEST_ADMIN_EMAIL = 'admin@test.floodguard.lk';
const TEST_ADMIN_PASSWORD = 'AdminTest#123';

async function seedTestAdmin() {
  const hashed = await bcrypt.hash(TEST_ADMIN_PASSWORD, 10);
  await Admin.create({
    email: TEST_ADMIN_EMAIL,
    password: hashed,
    name: 'Jest Test Admin',
    role: 'super_admin',
    department: 'DMC',
    permissions: ['manage_users', 'manage_alerts', 'view_analytics', 'system_settings'],
    isActive: true,
  });
  return { email: TEST_ADMIN_EMAIL, password: TEST_ADMIN_PASSWORD };
}

module.exports = { seedTestAdmin, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD };
