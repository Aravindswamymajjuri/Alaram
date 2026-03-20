const express = require('express');
const router = express.Router();
const { getAnalytics } = require('../controllers/analyticsController');
const authenticateUser = require('../middleware/auth');

// All analytics routes require authentication
router.use(authenticateUser);

// Get user analytics (tasks assigned to others)
router.get('/', getAnalytics);

module.exports = router;
