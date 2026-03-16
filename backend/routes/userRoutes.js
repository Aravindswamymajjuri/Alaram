const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authenticateUser = require('../middleware/auth');

// All user routes require authentication
router.use(authenticateUser);

// Get all users
router.get('/', userController.getAllUsers);

// Search users
router.get('/search', userController.searchUsers);

// Update notification preferences
router.put('/preferences/notifications', userController.updateNotificationPreferences);

// ✅ NEW: FCM Token endpoints
router.post('/validate-fcm-token', userController.validateFCMToken);
router.get('/fcm-token-status', userController.getFCMTokenStatus);
router.post('/cleanup-fcm-tokens', userController.cleanupFCMTokens);

module.exports = router;
