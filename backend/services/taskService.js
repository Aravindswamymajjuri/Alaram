const Task = require('../models/Task');
const User = require('../models/User');
const notificationService = require('./notificationService');

class TaskService {
  async createTask(taskData, createdById) {
    try {
      // Capture timezone offset from frontend (in minutes)
      // For IST (UTC+5:30): offset = -330
      // For EST (UTC-5:00): offset = 300
      const timezoneOffset = taskData.timezoneOffset || 0;
      
      console.log(`📋 Creating task with timezone offset: ${timezoneOffset} minutes (${-timezoneOffset / 60} hours from UTC)`);
      
      // Parse datetime-local string correctly as local time
      if (taskData.alarmTime && typeof taskData.alarmTime === 'string') {
        // datetime-local gives us a string like "2026-03-16T15:08" in USER's local time
        const alarmString = taskData.alarmTime;
        
        // Store the original local time for reference
        taskData.alarmTimeLocal = alarmString;
        
        // Split date and time
        const [datePart, timePart] = alarmString.split('T');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hour, minute] = (timePart || '00:00').split(':').map(Number);
        
        console.log(`🕐 Input local time: ${alarmString} (${hour}:${String(minute).padStart(2, '0')} in user's timezone)`);
        
        // CORRECT WAY: Create UTC date with the components, then adjust by offset
        // Step 1: Create a Date treating the input as UTC
        const dateAsIfUTC = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
        
        // Step 2: The timezoneOffset tells us how far ahead we are from UTC
        // For IST: offset = -330 (meaning UTC+5:30, so user is 5:30 hours ahead)
        // To convert local time to UTC: subtract the offset
        // UTC_time = local_time - offset
        // Since offset is negative for ahead, we ADD it
        const actualUtcTime = new Date(dateAsIfUTC.getTime() + timezoneOffset * 60000);
        
        taskData.alarmTime = actualUtcTime;
        taskData.creatorTimezoneOffset = timezoneOffset;
        
        // Display what we stored
        console.log(`📊 Conversion details:`);
        console.log(`   Input: ${alarmString} in user's local timezone`);
        console.log(`   UTC stored: ${actualUtcTime.toISOString()}`);
        console.log(`   ✅ Will alarm when scheduler reaches this UTC time`);
      }

      const task = new Task({
        ...taskData,
        createdBy: createdById,
      });

      await task.save();
      console.log('💾 Task saved to database with ID:', task._id);
      
      await task.populate('createdBy', 'name email');
      await task.populate('assignedUsers', 'name email');

      return task;
    } catch (error) {
      console.error('❌ Error saving task to database:', error);
      throw error;
    }
  }

  async getTaskById(taskId) {
    try {
      const task = await Task.findById(taskId)
        .populate('createdBy', 'name email')
        .populate('assignedUsers', 'name email')
        .populate('completedBy.userId', 'name email');

      return task;
    } catch (error) {
      console.error('Error fetching task:', error);
      throw error;
    }
  }

  async getUserTasks(userId) {
    try {
      const tasks = await Task.find({
        $or: [{ createdBy: userId }, { assignedUsers: userId }],
      })
        .sort({ alarmTime: 1 })
        .populate('createdBy', 'name email')
        .populate('assignedUsers', 'name email')
        .populate('completedBy.userId', 'name email');

      return tasks;
    } catch (error) {
      console.error('Error fetching user tasks:', error);
      throw error;
    }
  }

  async getUpcomingTasks(status = 'pending') {
    try {
      const now = new Date();
      const tasks = await Task.find({
        status,
        alarmTime: { $gte: now },
      })
        .sort({ alarmTime: 1 })
        .populate('createdBy', 'name email')
        .populate('assignedUsers', 'name email fcmToken');

      return tasks;
    } catch (error) {
      console.error('Error fetching upcoming tasks:', error);
      throw error;
    }
  }

  async getTasksByStatus(userId, status) {
    try {
      const tasks = await Task.find({
        $or: [{ createdBy: userId }, { assignedUsers: userId }],
        status,
      })
        .sort({ createdAt: -1 })
        .populate('createdBy', 'name email')
        .populate('assignedUsers', 'name email')
        .populate('completedBy.userId', 'name email');

      return tasks;
    } catch (error) {
      console.error('Error fetching tasks by status:', error);
      throw error;
    }
  }

  async markTaskComplete(taskId, userId, reason = null) {
    try {
      const task = await Task.findById(taskId);

      if (!task) {
        throw new Error('Task not found');
      }

      console.log(`📝 Marking task complete - TaskId: ${taskId}, UserId: ${userId}`);
      console.log(`🔍 Reason received (RAW):`, reason);
      console.log(`🔍 Reason type:`, typeof reason);
      console.log(`🔍 Reason length:`, reason ? reason.length : 'null');
      console.log(`🔍 Reason truthy?:`, !!reason);

      // Check if user already completed this task
      const alreadyCompleted = task.completedBy.some((c) => c.userId.toString() === userId.toString());

      if (!alreadyCompleted) {
        const completionData = {
          userId,
          completedAt: new Date(),
        };

        console.log(`🔍 Before adding reason - completionData:`, completionData);

        // Only add reason if provided and non-empty
        if (reason && typeof reason === 'string' && reason.trim().length > 0) {
          completionData.reason = reason.trim();
          console.log(`✅ REASON ADDED - completionData now:`, completionData);
        } else {
          console.log(`⚠️ REASON NOT ADDED`);
          console.log(`   - reason truthy? ${!!reason}`);
          console.log(`   - is string? ${typeof reason === 'string'}`);
          console.log(`   - trim().length > 0? ${reason && reason.trim().length > 0}`);
        }

        task.completedBy.push(completionData);
        console.log(`✅ Pushed to array. completedBy array length:`, task.completedBy.length);
        console.log(`✅ completedBy[0] before save:`, task.completedBy[0]);
      } else {
        console.log('⚠️ User already marked this task as complete');
      }

      // Mark task as completed if:
      // 1. Creator marks it complete, OR
      // 2. All assigned users have completed it
      if (task.createdBy.toString() === userId.toString()) {
        // Creator marked as complete - task is fully completed
        task.status = 'completed';
      } else if (task.completedBy.length === task.assignedUsers.length && task.assignedUsers.length > 0) {
        // All assigned users completed - task is fully completed
        task.status = 'completed';
      } else {
        // Only some assigned users completed - mark as in progress
        task.status = 'in_progress';
      }

      console.log(`💾 About to save task...`);
      await task.save();
      console.log(`💾 Task saved. Checking database state...`);
      console.log(`💾 completedBy[0] after save (raw):`, task.completedBy[0]);
      
      await task.populate('createdBy', 'name email');
      await task.populate('assignedUsers', 'name email');
      await task.populate('completedBy.userId', 'name email');

      console.log(`✅ After populate - completedBy[0]:`, task.completedBy[0]);
      console.log(`📤 FINAL - reason field exists?:`, task.completedBy[0]?.reason);
      console.log(`📤 FINAL TASK BEING RETURNED:`, JSON.stringify({
        _id: task._id,
        title: task.title,
        completedBy: task.completedBy,
      }, null, 2));

      return task;
    } catch (error) {
      console.error('❌ Error marking task complete:', error);
      throw error;
    }
  }

  async updateTask(taskId, updateData) {
    try {
      const task = await Task.findByIdAndUpdate(taskId, updateData, {
        new: true,
        runValidators: true,
      })
        .populate('createdBy', 'name email')
        .populate('assignedUsers', 'name email')
        .populate('completedBy.userId', 'name email');

      return task;
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }

  async deleteTask(taskId) {
    try {
      const task = await Task.findByIdAndDelete(taskId);
      return task;
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  }

  async searchTasks(userId, searchQuery) {
    try {
      const tasks = await Task.find({
        $or: [{ createdBy: userId }, { assignedUsers: userId }],
        $or: [
          { title: { $regex: searchQuery, $options: 'i' } },
          { description: { $regex: searchQuery, $options: 'i' } },
          { category: { $regex: searchQuery, $options: 'i' } },
        ],
      })
        .populate('createdBy', 'name email')
        .populate('assignedUsers', 'name email');

      return tasks;
    } catch (error) {
      console.error('Error searching tasks:', error);
      throw error;
    }
  }

  async getTasksForReminder(minutesBefore) {
    try {
      const now = new Date();
      const reminderTime = new Date(now.getTime() + minutesBefore * 60000);
      const endTime = new Date(reminderTime.getTime() + 60000); // 1 minute window

      const tasks = await Task.find({
        status: 'pending',
        alarmTime: {
          $gte: reminderTime,
          $lt: endTime,
        },
      })
        .populate('assignedUsers', 'name email fcmToken fcmTokens');

      return tasks;
    } catch (error) {
      console.error('Error fetching tasks for reminder:', error);
      throw error;
    }
  }

  async recordNotificationSent(taskId, type, minutesBefore = null) {
    try {
      const task = await Task.findById(taskId);

      if (!task) {
        throw new Error('Task not found');
      }

      if (type === 'reminder') {
        task.notificationsSent.reminderNotifications.push({
          minutesBefore,
          sentAt: new Date(),
          successful: true,
        });
      } else if (type === 'alarm') {
        task.notificationsSent.alarmNotification = {
          sentAt: new Date(),
          successful: true,
        };
      }

      await task.save();
      return task;
    } catch (error) {
      console.error('Error recording notification sent:', error);
      throw error;
    }
  }
}

module.exports = new TaskService();
