const cron = require('node-cron');
const taskService = require('../services/taskService');
const notificationService = require('../services/notificationService');
const User = require('../models/User');

class AlarmScheduler {
  constructor(io) {
    this.io = io;
    this.jobs = [];
  }

  start() {
    console.log('🕐 Alarm Scheduler started');

    // Check for reminders every minute
    this.reminderJob = cron.schedule('* * * * *', async () => {
      await this.checkForReminders();
    });

    // Check for alarms every minute
    this.alarmJob = cron.schedule('* * * * *', async () => {
      await this.checkForAlarms();
    });

    this.jobs.push(this.reminderJob, this.alarmJob);
  }

  async checkForReminders() {
    try {
      // Check for 30-minute reminders
      await this.sendReminderNotifications(30);

      // Check for 15-minute reminders
      await this.sendReminderNotifications(15);

      // Check for 5-minute reminders
      await this.sendReminderNotifications(5);
    } catch (error) {
      console.error('Error checking for reminders:', error);
    }
  }

  async sendReminderNotifications(minutesBefore) {
    try {
      const tasks = await taskService.getTasksForReminder(minutesBefore);

      for (const task of tasks) {
        // Check if reminder already sent
        const alreadySent = task.notificationsSent.reminderNotifications.some(
          (n) => n.minutesBefore === minutesBefore
        );

        if (alreadySent) continue;

        // Send notifications to all assigned users
        const fcmTokens = [];
        const userNotifications = [];

        for (const assignedUser of task.assignedUsers) {
          const user = await User.findById(assignedUser);

          if (!user || !user.fcmToken) continue;

          if (!user.notificationPreferences.pushNotifications) continue;

          fcmTokens.push(user.fcmToken);

          // Create notification record
          const notification = await notificationService.saveNotification(
            assignedUser,
            task._id,
            'reminder',
            `Reminder: ${task.title}`,
            `Task starts in ${minutesBefore} minutes`,
            user.fcmToken,
            {
              taskId: task._id.toString(),
              taskTitle: task.title,
              reminderMinutes: minutesBefore,
            }
          );

          userNotifications.push({ userId: assignedUser, notification });
        }

        // Send multicast notification
        if (fcmTokens.length > 0) {
          try {
            await notificationService.sendMulticastNotification(
              fcmTokens,
              `Reminder: ${task.title}`,
              `Task starts in ${minutesBefore} minutes`,
              {
                taskId: task._id.toString(),
                taskTitle: task.title,
                reminderMinutes: minutesBefore,
              }
            );

            // Record notification sent
            await taskService.recordNotificationSent(task._id, 'reminder', minutesBefore);

            // Emit real-time update
            userNotifications.forEach(({ userId, notification }) => {
              this.io.to(`user:${userId}`).emit('notification:new', notification);
            });

            console.log(`✉️  Reminder notifications sent for task: ${task.title} (${minutesBefore} minutes before)`);
          } catch (error) {
            console.error(`Error sending reminder notifications for task ${task._id}:`, error);
          }
        }
      }
    } catch (error) {
      console.error(`Error sending ${minutesBefore}-minute reminders:`, error);
    }
  }

  async checkForAlarms() {
    try {
      const now = new Date();
      // Check alarms in a TIGHT time window: 30 seconds PAST to 30 SECONDS in FUTURE
      // This prevents false triggers and only catches alarms at the right time
      const alarmWindowStart = new Date(now.getTime() - 30000); // 30 seconds ago (catch if we miss by small amount)
      const alarmWindowEnd = new Date(now.getTime() + 30000); // 30 seconds in future (only nearby alarms)

      // Helper function: Convert UTC Date to IST string WITHOUT timezone confusion
      const formatAsIST = (utcDate) => {
        // Use Intl API with explicit timezone to avoid server timezone interference
        const formatter = new Intl.DateTimeFormat('en-IN', {
          timeZone: 'Asia/Kolkata',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        });
        return formatter.format(utcDate);
      };

      const istNow = formatAsIST(now);
      const istWindowStart = formatAsIST(alarmWindowStart);
      const istWindowEnd = formatAsIST(alarmWindowEnd);

      console.log(`⏰ Checking for alarms (TIGHT WINDOW: ±30 seconds)`);
      console.log(`   UTC window: ${alarmWindowStart.toISOString()} to ${alarmWindowEnd.toISOString()}`);
      console.log(`   IST window: ${istWindowStart} to ${istWindowEnd}`);

      const Task = require('../models/Task');
      const tasks = await Task.find({
        status: 'pending',
        alarmTime: {
          $gte: alarmWindowStart,
          $lte: alarmWindowEnd,
        },
      })
        .populate('assignedUsers', 'name email fcmToken fcmTokens notificationPreferences')
        .populate('createdBy', 'name email fcmToken fcmTokens notificationPreferences');

      if (tasks.length === 0) {
        console.log(`🔔 Found ${tasks.length} task(s) to alarm for`);
        // Debug: Show all pending tasks to check what's in DB
        const allTasks = await Task.find({ status: 'pending' }).select('title alarmTime creatorTimezoneOffset');
        if (allTasks.length > 0) {
          console.log(`📋 All pending tasks in DB:`);
          allTasks.forEach(t => {
            const istTime = formatAsIST(t.alarmTime);
            console.log(`   - ${t.title}: UTC ${t.alarmTime.toISOString()} | IST ${istTime}`);
          });
        }
        return;
      }

      console.log(`✅ Found ${tasks.length} task(s) to alarm for`);

      for (const task of tasks) {
        const taskAlarmIST = formatAsIST(task.alarmTime);
        
        console.log(`Processing alarm for task: ${task.title}`);
        console.log(`  UTC: ${task.alarmTime.toISOString()}`);
        console.log(`  IST: ${taskAlarmIST}`);
        
        // Check if alarm already sent
        if (task.notificationsSent.alarmNotification?.sentAt) {
          console.log(`⏭️  Alarm already sent for task: ${task.title}`);
          continue;
        }

        const fcmTokens = [];
        const userNotifications = [];

        // Debug: Check creator data
        console.log(`\n🔍 DEBUG - Creator Info:`);
        console.log(`   - Creator ID: ${task.createdBy?._id}`);
        console.log(`   - Creator Name: ${task.createdBy?.name}`);
        console.log(`   - Has FCM Token: ${!!task.createdBy?.fcmToken}`);
        console.log(`   - FCM Token Length: ${task.createdBy?.fcmToken?.length || 0}`);
        console.log(`   - Has NotifPrefs: ${!!task.createdBy?.notificationPreferences}`);
        console.log(`   - Push Notifs Enabled: ${task.createdBy?.notificationPreferences?.pushNotifications}`);

        // Add alarm notification for creator
        if (task.createdBy?.fcmToken && task.createdBy?.notificationPreferences?.pushNotifications) {
          fcmTokens.push(task.createdBy.fcmToken);

          const creatorNotification = await notificationService.saveNotification(
            task.createdBy._id,
            task._id,
            'alarm',
            `🔔 Alarm: ${task.title}`,
            `Task alarm is ringing!`,
            task.createdBy.fcmToken,
            {
              taskId: task._id.toString(),
              taskTitle: task.title,
            }
          );

          userNotifications.push({ userId: task.createdBy._id, notification: creatorNotification });
          console.log(`   ✅ Creator will receive Firebase notification`);
        } else {
          console.log(`   ⚠️ Creator cannot receive Firebase notification`);
          if (!task.createdBy?.fcmToken) {
            console.log(`      → No FCM token. Tell creator to re-login to get fresh token`);
          }
          if (!task.createdBy?.notificationPreferences?.pushNotifications) {
            console.log(`      → Push notifications are disabled in settings`);
          }
          // Still emit Socket.io alarm to creator even without FCM token
          if (task.createdBy) {
            userNotifications.push({ userId: task.createdBy._id, notification: null });
            console.log(`      → Will try Socket.io alarm if creator is connected`);
          }
        }

        // Add alarm notifications for all assigned users
        console.log(`\n🔍 DEBUG - Assigned Users Info:`);
        console.log(`   - Total Assigned: ${task.assignedUsers?.length || 0}`);
        
        for (const assignedUser of task.assignedUsers) {
          console.log(`   - User: ${assignedUser?.name || 'Unknown'}`);
          console.log(`     * Has FCM Token: ${!!assignedUser.fcmToken}`);
          console.log(`     * FCM Token Length: ${assignedUser.fcmToken?.length || 0}`);
          console.log(`     * Push Notifs Enabled: ${assignedUser.notificationPreferences?.pushNotifications}`);
          
          if (assignedUser.fcmToken && assignedUser.notificationPreferences?.pushNotifications) {
            fcmTokens.push(assignedUser.fcmToken);

            // Create notification record
            const notification = await notificationService.saveNotification(
              assignedUser._id,
              task._id,
              'alarm',
              `🔔 Alarm: ${task.title}`,
              `Start the assigned task now!`,
              assignedUser.fcmToken,
              {
                taskId: task._id.toString(),
                taskTitle: task.title,
              }
            );

            userNotifications.push({ userId: assignedUser._id, notification });
            console.log(`     ✅ Will receive Firebase notification`);
          } else {
            console.log(`     ⚠️ Cannot receive Firebase notification`);
            if (!assignedUser.fcmToken) {
              console.log(`        → No FCM token. Tell user to re-login to get fresh token`);
            }
            if (!assignedUser.notificationPreferences?.pushNotifications) {
              console.log(`        → Push notifications are disabled in settings`);
            }
            // Still emit Socket.io alarm to user even without FCM token
            userNotifications.push({ userId: assignedUser._id, notification: null });
            console.log(`        → Will try Socket.io alarm if connected`);
          }
        }

        // Emit real-time alarm event to all users (creator + assigned users)
        try {
          let socketDeliveryCount = 0;
          
          userNotifications.forEach(({ userId, notification }) => {
            this.io.to(`user:${userId}`).emit('alarm:ringing', {
              taskId: task._id,
              taskTitle: task.title,
              task: task.title,
              notification,
              createdBy: task.createdBy?.name || 'Unknown',
            });
            socketDeliveryCount++;
          });

          // Broadcast alarm ringing event to all connected users
          this.io.emit('alarm:ringing', {
            taskId: task._id,
            taskTitle: task.title,
            createdBy: task.createdBy?.name || 'Unknown',
          });

          console.log(`\n✅ ALARM NOTIFICATION CHANNELS:`);
          console.log(`   🔔 Socket.io: Attempted delivery to ${socketDeliveryCount} users`);
          console.log(`   📱 Firebase: Ready to send to ${fcmTokens.length} devices with valid tokens`);
          
          if (fcmTokens.length === 0 && socketDeliveryCount > 0) {
            console.log(`   ℹ️  No Firebase tokens - users will only receive Socket.io alarm`);
            console.log(`   💡 FIX: Have users re-login to refresh FCM tokens for push notifications`);
          }
        } catch (socketError) {
          console.error(`Error emitting alarm via socket for task ${task._id}:`, socketError);
        }

        // Send Firebase multicast notification (non-blocking - can fail silently)
        if (fcmTokens.length > 0) {
          try {
            console.log(`\n📱 Sending Firebase push notifications for task: ${task.title}...`);
            const firebaseResponse = await notificationService.sendMulticastNotification(
              fcmTokens,
              `🔔 Alarm: ${task.title}`,
              `Start the assigned task now!`,
              {
                taskId: task._id.toString(),
                taskTitle: task.title,
              }
            );

            if (firebaseResponse.successCount > 0) {
              console.log(`✅ Firebase: ${firebaseResponse.successCount} notification(s) sent successfully`);
            } else {
              console.warn(`⚠️ Firebase: All ${fcmTokens.length} notifications failed. Alarm will still trigger via Socket.io if users are connected.`);
            }
          } catch (firebaseError) {
            console.error(`⚠️ Firebase error for task ${task._id} (alarm still triggered):`, firebaseError.message);
            // Continue - don't let Firebase errors block alarm
          }
        } else {
          console.log(`\n📱 Firebase: Skipped (no valid FCM tokens)`);
          console.log(`   ℹ️  Users must re-login to get fresh FCM tokens for push notifications`);
        }

        // Record alarm notification sent
        try {
          await taskService.recordNotificationSent(task._id, 'alarm');
          console.log(`\n${'═'.repeat(60)}`);
          console.log(`✅ ALARM SENT FOR TASK: ${task.title}`);
          console.log(`${'═'.repeat(60)}`);
        } catch (recordError) {
          console.error(`Error recording notification sent for task ${task._id}:`, recordError);
        }
      }
    } catch (error) {
      console.error('Error checking for alarms:', error);
    }
  }

  stop() {
    console.log('Stopping Alarm Scheduler');
    this.jobs.forEach((job) => job.stop());
  }
}

module.exports = AlarmScheduler;
