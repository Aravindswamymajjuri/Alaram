const notificationService = require('../services/notificationService');

class NotificationController {
  async getUserNotifications(req, res, next) {
    try {
      const userId = req.userId;
      const { limit = 50, skip = 0, excludePastAlarms = true } = req.query;

      const result = await notificationService.getUserNotifications(
        userId,
        parseInt(limit),
        parseInt(skip),
        excludePastAlarms === 'true' || excludePastAlarms === true
      );

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  async markAsRead(req, res, next) {
    try {
      const { notificationId } = req.params;

      const notification = await notificationService.markNotificationAsRead(notificationId);

      res.status(200).json({
        success: true,
        message: 'Notification marked as read',
        notification,
      });
    } catch (error) {
      next(error);
    }
  }

  async markAllAsRead(req, res, next) {
    try {
      const userId = req.userId;
      const Notification = require('../models/Notification');

      await Notification.updateMany({ userId, read: false }, { read: true, readAt: new Date() });

      res.status(200).json({
        success: true,
        message: 'All notifications marked as read',
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new NotificationController();
