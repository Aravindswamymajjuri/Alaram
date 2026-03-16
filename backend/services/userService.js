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

      // Step 1: Remove old token if it exists (avoid duplicates)
      await User.updateOne(
        { _id: userId },
        { $pull: { fcmTokens: { token: fcmToken } } }
      );

      // Step 2: Add new token and update metadata using findByIdAndUpdate
      const user = await User.findByIdAndUpdate(
        userId,
        {
          $set: {
            fcmToken: fcmToken,
            fcmTokenMetadata: {
              status: 'verified',
              lastValidation: new Date(),
              deviceInfo: deviceInfo,
            },
          },
          $push: {
            fcmTokens: {
              $each: [{
                token: fcmToken,
                deviceName,
                isValid: true,
                createdAt: new Date(),
                lastUsed: new Date(),
              }],
              $slice: -10, // Keep only last 10 tokens
            },
          },
        },
        { new: true, runValidators: true }
      );

      if (!user) {
        throw new Error('User not found');
      }

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
