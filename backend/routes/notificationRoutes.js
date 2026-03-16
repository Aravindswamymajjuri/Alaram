const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const authenticateUser = require('../middleware/auth');

// All notification routes require authentication
router.use(authenticateUser);

// Get user notifications
router.get('/', notificationController.getUserNotifications);

// Mark notification as read
router.patch('/:notificationId/read', notificationController.markAsRead);

// Mark all as read
router.patch('/read/all', notificationController.markAllAsRead);

module.exports = router;
