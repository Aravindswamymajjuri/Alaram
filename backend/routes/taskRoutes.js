const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const authenticateUser = require('../middleware/auth');

// All task routes require authentication
router.use(authenticateUser);

// Create a new task
router.post('/', taskController.createTask);

// Get all user tasks
router.get('/', taskController.getUserTasks);

// Search tasks
router.get('/search', taskController.searchTasks);

// Get a specific task
router.get('/:taskId', taskController.getTask);

// Update a task
router.put('/:taskId', taskController.updateTask);

// Mark task as complete
router.patch('/:taskId/complete', taskController.markTaskComplete);

// Delete a task
router.delete('/:taskId', taskController.deleteTask);

module.exports = router;
