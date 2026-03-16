const User = require('../models/User');

class UserService {
  async getUserById(userId) {
    try {
      const user = await User.findById(userId).select('-password');
      return user;
    } catch (error) {
      console.error('Error fetching user:', error);
      throw error;
    }
  }

  async getUserByEmail(email) {
    try {
      const user = await User.findOne({ email });
      return user;
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw error;
    }
  }

  async updateFCMToken(userId, fcmToken, deviceName = 'Web', deviceInfo = {}) {
    try {
      if (!fcmToken || fcmToken.length < 100) {
        throw new Error('Invalid FCM token format');
      }

      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Update primary token
      user.fcmToken = fcmToken;

      // Update metadata
      user.fcmTokenMetadata = {
        status: 'verified',
        lastValidation: new Date(),
        deviceInfo: deviceInfo,
      };

      // Remove duplicate token from array if exists
      user.fcmTokens = user.fcmTokens.filter((t) => t.token !== fcmToken);

      // Add new token entry
      user.fcmTokens.push({
        token: fcmToken,
        deviceName,
        isValid: true,
        createdAt: new Date(),
        lastUsed: new Date(),
      });

      // Keep only last 10 tokens (for multi-device support)
      if (user.fcmTokens.length > 10) {
        user.fcmTokens = user.fcmTokens.slice(-10);
      }

      await user.save();

      console.log(`✅ FCM token updated for user ${userId}:`, {
        preview: fcmToken.substring(0, 30) + '...',
        device: deviceName,
        totalTokens: user.fcmTokens.length,
      });

      return user;
    } catch (error) {
      console.error('Error updating FCM token:', error);
      throw error;
    }
  }

  /**
   * ✅ NEW: Get all valid FCM tokens for a user
   */
  async getValidFCMTokens(userId) {
    try {
      const user = await User.findById(userId).select('fcmToken fcmTokens');

      if (!user) {
        throw new Error('User not found');
      }

      const tokens = [];

      // Add primary token
      if (user.fcmToken && user.fcmToken.length > 50) {
        tokens.push(user.fcmToken);
      }

      // Add other valid tokens
      if (user.fcmTokens && Array.isArray(user.fcmTokens)) {
        user.fcmTokens.forEach((tokenEntry) => {
          if (tokenEntry.token && 
              tokenEntry.token.length > 50 && 
              tokenEntry.isValid !== false &&
              !tokens.includes(tokenEntry.token)) {
            tokens.push(tokenEntry.token);
          }
        });
      }

      return tokens;
    } catch (error) {
      console.error('Error getting FCM tokens:', error);
      return [];
    }
  }

  /**
   * ✅ NEW: Mark token as invalid and remove it
   */
  async markTokenAsInvalid(userId, token) {
    try {
      const user = await User.findById(userId);

      if (!user) {
        throw new Error('User not found');
      }

      // Remove from array
      user.fcmTokens = user.fcmTokens.filter((t) => t.token !== token);

      // Clear if it was primary
      if (user.fcmToken === token) {
        user.fcmToken = null;
        user.fcmTokenMetadata = {
          status: 'invalid',
          invalidatedAt: new Date(),
          reason: 'Token marked as invalid',
        };
      }

      await user.save();

      console.log(`🗑️ Token marked invalid for user ${userId}`);
      return user;
    } catch (error) {
      console.error('Error marking token as invalid:', error);
      throw error;
    }
  }

  async getAllUsers() {
    try {
      const users = await User.find({ isActive: true }).select('-password');
      return users;
    } catch (error) {
      console.error('Error fetching all users:', error);
      throw error;
    }
  }

  async searchUsers(searchQuery) {
    try {
      const users = await User.find({
        isActive: true,
        $or: [
          { name: { $regex: searchQuery, $options: 'i' } },
          { email: { $regex: searchQuery, $options: 'i' } },
        ],
      })
        .select('-password')
        .limit(10);

      return users;
    } catch (error) {
      console.error('Error searching users:', error);
      throw error;
    }
  }

  async updateNotificationPreferences(userId, preferences) {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { notificationPreferences: preferences },
        { new: true, runValidators: true }
      ).select('-password');

      return user;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }
  }

  async updateUser(userId, updateData) {
    try {
      const user = await User.findByIdAndUpdate(userId, updateData, {
        new: true,
        runValidators: true,
      }).select('-password');

      return user;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }
}

module.exports = new UserService();
