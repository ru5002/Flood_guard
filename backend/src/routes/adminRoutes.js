const express = require('express');
const router = express.Router();
const adminAuthController = require('../controllers/adminAuthController');
const userManagementController = require('../controllers/userManagementController');
const { adminAuth, checkPermission } = require('../middleware/adminAuth');

// Admin authentication routes
router.post('/auth/login', adminAuthController.login);
router.get('/auth/profile', adminAuth, adminAuthController.getProfile);
router.get('/auth/setup', adminAuthController.createDefaultAdmin);
router.post('/auth/setup', adminAuthController.createDefaultAdmin);

// User management routes
router.get('/users', adminAuth, checkPermission('manage_users'), userManagementController.getAllUsers);
router.get('/users/stats', adminAuth, userManagementController.getUserStats);
router.get('/users/zones', adminAuth, userManagementController.getZones);
router.get('/users/:id', adminAuth, checkPermission('manage_users'), userManagementController.getUserById);
router.post('/users', adminAuth, checkPermission('manage_users'), userManagementController.createUser);
router.put('/users/:id', adminAuth, checkPermission('manage_users'), userManagementController.updateUser);
router.delete('/users/:id', adminAuth, checkPermission('manage_users'), userManagementController.deleteUser);

module.exports = router;
