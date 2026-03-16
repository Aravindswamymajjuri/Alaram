const taskService = require('../services/taskService');
const notificationService = require('../services/notificationService');
const User = require('../models/User');
const { SOCKET_EVENTS } = require('../config/constants');

const initializeSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // User joins a room for personal updates
    socket.on('join:user', (userId) => {
      socket.join(`user:${userId}`);
      console.log(`User ${userId} joined their room`);
    });

    // Leave user room on disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
    });

    // Listen for task updates
    socket.on(SOCKET_EVENTS.TASK_UPDATED, (taskData) => {
      // Broadcast to all users assigned to this task
      if (taskData.assignedUsers) {
        taskData.assignedUsers.forEach((userId) => {
          io.to(`user:${userId}`).emit(SOCKET_EVENTS.TASK_UPDATED, taskData);
        });
      }
      // Broadcast to creator
      if (taskData.createdBy) {
        io.to(`user:${taskData.createdBy}`).emit(SOCKET_EVENTS.TASK_UPDATED, taskData);
      }
    });

    // Listen for task completed events
    socket.on(SOCKET_EVENTS.TASK_COMPLETED, (taskData) => {
      // Broadcast to all assigned users
      if (taskData.assignedUsers) {
        taskData.assignedUsers.forEach((userId) => {
          io.to(`user:${userId}`).emit(SOCKET_EVENTS.TASK_COMPLETED, taskData);
        });
      }
      // Broadcast to creator
      if (taskData.createdBy) {
        io.to(`user:${taskData.createdBy}`).emit(SOCKET_EVENTS.TASK_COMPLETED, taskData);
      }
    });

    // Handle real-time notifications
    socket.on('notification:new', (notificationData) => {
      io.to(`user:${notificationData.userId}`).emit('notification:new', notificationData);
    });

    // Alarm ringing event
    socket.on(SOCKET_EVENTS.ALARM_RINGING, (alarmData) => {
      if (alarmData.assignedUsers) {
        alarmData.assignedUsers.forEach((userId) => {
          io.to(`user:${userId}`).emit(SOCKET_EVENTS.ALARM_RINGING, alarmData);
        });
      }
      // Broadcast to creator
      if (alarmData.createdBy) {
        io.to(`user:${alarmData.createdBy}`).emit(SOCKET_EVENTS.ALARM_RINGING, alarmData);
      }
    });

    // Alarm stopped event - broadcast to all users assigned to the task
    socket.on('alarm:stopped', async (alarmData) => {
      console.log('🛑 [SOCKET] Alarm stopped event received:', alarmData);
      
      try {
        const Task = require('../models/Task');
        const task = await Task.findById(alarmData.taskId)
          .populate('assignedUsers', '_id')
          .populate('createdBy', '_id');

        if (!task) {
          console.warn(`⚠️ Task not found for alarm stop: ${alarmData.taskId}`);
          return;
        }

        // Broadcast to all assigned users
        if (task.assignedUsers) {
          task.assignedUsers.forEach((user) => {
            io.to(`user:${user._id}`).emit('alarm:stopped', alarmData);
            console.log(`📢 Broadcasted alarm:stopped to assigned user: ${user._id}`);
          });
        }

        // Broadcast to creator
        if (task.createdBy) {
          io.to(`user:${task.createdBy._id}`).emit('alarm:stopped', alarmData);
          console.log(`📢 Broadcasted alarm:stopped to creator: ${task.createdBy._id}`);
        }

        console.log(`✅ Alarm stopped event broadcasted for task: ${alarmData.taskId}`);
      } catch (error) {
        console.error('Error handling alarm stop event:', error);
      }
    });
  });

  return io;
};

// Emit task update to all users (used by scheduler)
const emitTaskUpdate = (io, taskId, updateType, taskData) => {
  io.emit(`task:${updateType}`, {
    taskId,
    updateType,
    ...taskData,
  });
};

// Emit notification to specific user (used by scheduler)
const emitNotificationToUser = (io, userId, notification) => {
  io.to(`user:${userId}`).emit('notification:new', notification);
};

module.exports = {
  initializeSocket,
  emitTaskUpdate,
  emitNotificationToUser,
};
