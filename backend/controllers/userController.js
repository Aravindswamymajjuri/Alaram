const userService = require('../services/userService');

class UserController {
  async getAllUsers(req, res, next) {
    try {
      const users = await userService.getAllUsers();

      res.status(200).json({
        success: true,
        count: users.length,
        users,
      });
    } catch (error) {
      next(error);
    }
  }

  async searchUsers(req, res, next) {
    try {
      const { query } = req.query;

      if (!query) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required',
        });
      }

      const users = await userService.searchUsers(query);

      res.status(200).json({
        success: true,
        count: users.length,
        users,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateNotificationPreferences(req, res, next) {
    try {
      const userId = req.userId;
      const preferences = req.body;

      const user = await userService.updateNotificationPreferences(userId, preferences);

      res.status(200).json({
        success: true,
        message: 'Notification preferences updated',
        user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * ✅ NEW: Validate and update FCM token from frontend
   */
  async validateFCMToken(req, res, next) {
    try {
      const userId = req.userId;
      const { token, deviceInfo } = req.body;

      if (!token || token.length < 100) {
        return res.status(400).json({
          success: false,
          message: 'Invalid FCM token format',
        });
      }

      const user = await userService.updateFCMToken(userId, token, 'Web Browser', deviceInfo);

      res.status(200).json({
        success: true,
        message: 'FCM token validated and updated',
        tokenPreview: token.substring(0, 30) + '...',
        status: user.fcmTokenMetadata?.status || 'verified',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * ✅ NEW: Get FCM token status for user
   */
  async getFCMTokenStatus(req, res, next) {
    try {
      const userId = req.userId;
      const user = await userService.getUserById(userId);

      res.status(200).json({
        success: true,
        tokens: {
          primaryToken: user.fcmToken ? user.fcmToken.substring(0, 30) + '...' : null,
          tokenCount: user.fcmTokens?.length || 0,
          metadata: user.fcmTokenMetadata,
          devices: user.fcmTokens?.map(t => ({
            preview: t.token.substring(0, 30) + '...',
            device: t.deviceName,
            created: t.createdAt,
            lastUsed: t.lastUsed,
            status: t.isValid ? 'valid' : 'invalid',
          })) || [],
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * ✅ NEW: Clean up invalid tokens for user
   */
  async cleanupFCMTokens(req, res, next) {
    try {
      const userId = req.userId;
      const notificationService = require('../services/notificationService');

      const result = await notificationService.cleanupUserTokens(userId);

      res.status(200).json({
        success: true,
        message: 'FCM tokens cleaned up',
        result,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UserController();
