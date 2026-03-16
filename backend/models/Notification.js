const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
    },
    type: {
      type: String,
      enum: ['reminder', 'alarm', 'task_completed', 'task_assigned'],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    body: {
      type: String,
      required: true,
    },
    data: {
      taskId: String,
      taskTitle: String,
      reminderMinutes: Number,
      completedBy: String,
    },
    fcmToken: String,
    sent: {
      type: Boolean,
      default: false,
    },
    sentAt: Date,
    read: {
      type: Boolean,
      default: false,
    },
    readAt: Date,
    deliveryStatus: {
      type: String,
      enum: ['pending', 'sent', 'failed', 'bounced'],
      default: 'pending',
    },
    errorMessage: String,
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 2592000, // Auto-delete after 30 days
    },
  },
  { timestamps: true }
);

// Index for user notifications
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ taskId: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
