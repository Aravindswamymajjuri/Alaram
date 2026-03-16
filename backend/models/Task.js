const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a task title'],
      trim: true,
      maxlength: [100, 'Title cannot be more than 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot be more than 500 characters'],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    alarmTime: {
      type: Date,
      required: [true, 'Please provide an alarm time'],
    },
    alarmTimeLocal: {
      type: String,
      help: 'ISO string of alarm time in local timezone (before UTC conversion)',
    },
    creatorTimezoneOffset: {
      type: Number,
      default: 0,
      help: 'Timezone offset in minutes from UTC at time of task creation',
    },
    reminderTimes: {
      type: [Number], // in minutes before alarm time (e.g., [30, 15, 5])
      default: [30, 15],
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'cancelled'],
      default: 'pending',
    },
    completedBy: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        completedAt: Date,
      },
    ],
    recurrence: {
      type: {
        type: String,
        enum: ['once', 'daily', 'weekly'],
        default: 'once',
      },
      endDate: Date,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    category: String,
    tags: [String],
    notificationsSent: {
      reminderNotifications: [
        {
          minutesBefore: Number,
          sentAt: Date,
          successful: Boolean,
        },
      ],
      alarmNotification: {
        sentAt: Date,
        successful: Boolean,
      },
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Index for frequently queried fields
taskSchema.index({ createdBy: 1, status: 1 });
taskSchema.index({ assignedUsers: 1, status: 1 });
taskSchema.index({ alarmTime: 1, status: 1 });

module.exports = mongoose.model('Task', taskSchema);
