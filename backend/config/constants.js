module.exports = {
  TASK_STATUS: {
    PENDING: 'pending',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
  },

  REMINDER_TYPES: {
    MINUTES_30: 30,
    MINUTES_15: 15,
    MINUTES_5: 5,
    AT_TIME: 0,
  },

  NOTIFICATION_TYPES: {
    REMINDER: 'reminder',
    ALARM: 'alarm',
    TASK_COMPLETED: 'task_completed',
    TASK_ASSIGNED: 'task_assigned',
  },

  RECURRENCE_TYPES: {
    ONCE: 'once',
    DAILY: 'daily',
    WEEKLY: 'weekly',
  },

  SOCKET_EVENTS: {
    TASK_CREATED: 'task:created',
    TASK_UPDATED: 'task:updated',
    TASK_COMPLETED: 'task:completed',
    NOTIFICATION_SENT: 'notification:sent',
    ALARM_RINGING: 'alarm:ringing',
  },
};
