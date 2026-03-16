const taskService = require('../services/taskService');
const userService = require('../services/userService');
const notificationService = require('../services/notificationService');

class TaskController {
  async createTask(req, res, next) {
    try {
      const userId = req.userId;
      const { title, description, alarmTime, reminderTimes, assignedUsers, priority, category, tags, recurrence, timezoneOffset } = req.body;

      if (!title || !alarmTime) {
        return res.status(400).json({
          success: false,
          message: 'Title and alarm time are required',
        });
      }

      console.log('📝 Creating task:', { title, userId, assignedUsers, timezoneOffset });

      const task = await taskService.createTask(
        {
          title,
          description,
          alarmTime,
          reminderTimes: reminderTimes || [30, 15],
          assignedUsers: assignedUsers || [],
          priority,
          category,
          tags,
          recurrence,
          timezoneOffset: timezoneOffset || 0,
        },
        userId
      );

      console.log('✅ Task created successfully:', task._id);

      res.status(201).json({
        success: true,
        message: 'Task created successfully',
        task,
      });
    } catch (error) {
      console.error('❌ Error creating task:', error);
      next(error);
    }
  }

  async getTask(req, res, next) {
    try {
      const { taskId } = req.params;

      const task = await taskService.getTaskById(taskId);

      if (!task) {
        return res.status(404).json({
          success: false,
          message: 'Task not found',
        });
      }

      res.status(200).json({
        success: true,
        task,
      });
    } catch (error) {
      next(error);
    }
  }

  async getUserTasks(req, res, next) {
    try {
      const userId = req.userId;
      const { status } = req.query;

      console.log('🔍 Fetching tasks for user:', userId, 'Status:', status);

      let tasks;
      if (status) {
        tasks = await taskService.getTasksByStatus(userId, status);
      } else {
        tasks = await taskService.getUserTasks(userId);
      }

      console.log('📦 Found tasks:', tasks.length);

      res.status(200).json({
        success: true,
        count: tasks.length,
        tasks,
      });
    } catch (error) {
      console.error('❌ Error fetching tasks:', error);
      next(error);
    }
  }

  async updateTask(req, res, next) {
    try {
      const { taskId } = req.params;
      const updateData = req.body;

      const task = await taskService.updateTask(taskId, updateData);

      if (!task) {
        return res.status(404).json({
          success: false,
          message: 'Task not found',
        });
      }

      res.status(200).json({
        success: true,
        message: 'Task updated successfully',
        task,
      });
    } catch (error) {
      next(error);
    }
  }

  async markTaskComplete(req, res, next) {
    try {
      const taskId = req.params.taskId;
      const userId = req.userId;

      const task = await taskService.markTaskComplete(taskId, userId);

      // Emit real-time update via Socket.io to creator and assigned users
      if (global.io) {
        const completionEvent = {
          taskId: task._id,
          status: task.status,
          completedBy: task.completedBy,
          assignedUsers: task.assignedUsers?.map((u) => u._id || u),
          createdBy: task.createdBy._id || task.createdBy,
        };

        // Broadcast to all assigned users
        if (task.assignedUsers) {
          task.assignedUsers.forEach((user) => {
            const userId = user._id || user;
            global.io.to(`user:${userId}`).emit('task:completed', completionEvent);
          });
        }

        // Broadcast to creator
        if (task.createdBy) {
          const creatorId = task.createdBy._id || task.createdBy;
          global.io.to(`user:${creatorId}`).emit('task:completed', completionEvent);
        }

        console.log(`✅ Task completion broadcast to creator and ${task.assignedUsers?.length || 0} assigned users`);
      }

      res.status(200).json({
        success: true,
        message: 'Task marked as complete',
        task,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteTask(req, res, next) {
    try {
      const { taskId } = req.params;
      const userId = req.userId;

      console.log('🔍 Attempting to delete task:', taskId);
      console.log('📝 User ID from token:', userId);

      const task = await taskService.getTaskById(taskId);

      if (!task) {
        return res.status(404).json({
          success: false,
          message: 'Task not found'
          ,
        });
      }

      console.log('🔐 Delete Authorization Check:');
      console.log('  Task Creator ID:', task.createdBy._id);
      console.log('  Task Creator ID (string):', task.createdBy._id.toString());
      console.log('  Current User ID:', userId);
      console.log('  Current User ID Type:', typeof userId);
      console.log('  Are they equal?', task.createdBy._id.equals(userId));

      if (!task.createdBy._id.equals(userId)) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to delete this task',
        });
      }

      await taskService.deleteTask(taskId);

      res.status(200).json({
        success: true,
        message: 'Task deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async searchTasks(req, res, next) {
    try {
      const userId = req.userId;
      const { query } = req.query;

      if (!query) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required',
        });
      }

      const tasks = await taskService.searchTasks(userId, query);

      res.status(200).json({
        success: true,
        count: tasks.length,
        tasks,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TaskController();
