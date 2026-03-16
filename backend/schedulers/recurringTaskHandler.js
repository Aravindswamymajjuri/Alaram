const cron = require('node-cron');
const Task = require('../models/Task');

/**
 * Recurring Task Handler
 * - Creates new task instances for daily/weekly recurring alarms
 * - Runs once daily at 2 AM
 */
class RecurringTaskHandler {
  static startDailyCheck() {
    // Run every day at 2:00 AM
    cron.schedule('0 2 * * *', async () => {
      console.log('Running recurring task check...');
      await RecurringTaskHandler.processRecurringTasks();
    });
  }

  static async processRecurringTasks() {
    try {
      const tasks = await Task.find({
        'recurrence.type': { $in: ['daily', 'weekly'] },
        status: { $ne: 'cancelled' },
      })
        .populate('createdBy', 'name email')
        .populate('assignedUsers', 'name email');

      for (const task of tasks) {
        if (task.recurrence?.type === 'daily') {
          await RecurringTaskHandler.createNextInstance(task, 'daily');
        } else if (task.recurrence?.type === 'weekly') {
          await RecurringTaskHandler.createNextInstance(task, 'weekly');
        }
      }

      console.log(`✓ Processed ${tasks.length} recurring tasks`);
    } catch (error) {
      console.error('Error processing recurring tasks:', error);
    }
  }

  static async createNextInstance(task, type) {
    try {
      const lastAlarmTime = task.alarmTime;
      let nextAlarmTime;

      if (type === 'daily') {
        nextAlarmTime = new Date(lastAlarmTime);
        nextAlarmTime.setDate(nextAlarmTime.getDate() + 1);
      } else if (type === 'weekly') {
        nextAlarmTime = new Date(lastAlarmTime);
        nextAlarmTime.setDate(nextAlarmTime.getDate() + 7);
      }

      // Check if we've exceeded end date
      if (task.recurrence?.endDate && nextAlarmTime > new Date(task.recurrence.endDate)) {
        console.log(`Recurrence ended for task: ${task.title}`);
        return;
      }

      // Create new task instance
      const newTask = new Task({
        title: task.title,
        description: task.description,
        createdBy: task.createdBy,
        assignedUsers: task.assignedUsers,
        alarmTime: nextAlarmTime,
        reminderTimes: task.reminderTimes,
        priority: task.priority,
        category: task.category,
        tags: task.tags,
        recurrence: task.recurrence,
      });

      await newTask.save();
      console.log(`✓ Created next instance of recurring task: ${task.title}`);

      return newTask;
    } catch (error) {
      console.error(`Error creating next instance for task ${task._id}:`, error);
    }
  }
}

module.exports = RecurringTaskHandler;
