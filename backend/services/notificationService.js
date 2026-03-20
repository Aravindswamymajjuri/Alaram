const admin = require('../config/firebase');
const Notification = require('../models/Notification');
const User = require('../models/User');

class NotificationService {
  /**
   * ✅ NEW: Remove invalid FCM tokens from database
   * Called when Firebase returns "registration-token-not-registered" or "invalid-registration-token"
   */
  async removeInvalidTokens(tokenList) {
    try {
      if (!tokenList || tokenList.length === 0) return;

      console.log(`\n🗑️ CLEANUP: Removing ${tokenList.length} invalid FCM token(s) from database`);
      console.log('━'.repeat(50));

      // Remove from fcmTokens array
      const updateResult = await User.updateMany(
        { 'fcmTokens.token': { $in: tokenList } },
        {
          $pull: {
            fcmTokens: { token: { $in: tokenList } },
          },
        }
      );

      // Also update primary token if invalid
      const primaryResult = await User.updateMany(
        { fcmToken: { $in: tokenList } },
        {
          $set: {
            fcmToken: null,
            fcmTokenMetadata: {
              status: 'invalid',
              invalidatedAt: new Date(),
              reason: 'Invalid registration token from Firebase',
            },
          },
        }
      );

      console.log(`✅ Cleanup successful:`);
      console.log(`   Token arrays modified: ${updateResult.modifiedCount} user(s)`);
      console.log(`   Primary tokens cleared: ${primaryResult.modifiedCount} user(s)`);
      console.log(`   ℹ️  Users should re-login to get fresh tokens`);
      console.log('━'.repeat(50) + '\n');

      return {
        removedCount: tokenList.length,
        usersModified: updateResult.modifiedCount + primaryResult.modifiedCount,
      };
    } catch (error) {
      console.error('❌ Error removing invalid tokens:', error.message);
    }
  }

  /**
   * ✅ NEW: Validate token with Firebase (test send)
   * Returns true if token is valid, false if invalid
   */
  async validateTokenWithFirebase(token) {
    try {
      if (!token || token.length < 100) {
        console.warn(`⚠️ Token too short to validate: ${token?.length} chars`);
        return false;
      }

      console.log(`🔍 Validating FCM token: ${token.substring(0, 30)}...`);

      // Send a silent test message
      const testMessage = {
        notification: {
          title: 'Token Validation',
          body: 'Background verification',
        },
        data: {
          type: 'validation',
          timestamp: new Date().toISOString(),
        },
        token,
        webpush: {
          fcmOptions: {
            link: 'https://example.com',
          },
        },
      };

      await admin.messaging().send(testMessage);
      console.log(`✅ Token validation successful: ${token.substring(0, 30)}...`);
      return true;
    } catch (error) {
      // Expected errors for invalid tokens
      if (error.code === 'messaging/registration-token-not-registered' ||
          error.code === 'messaging/invalid-registration-token') {
        console.warn(`⚠️ Token invalid with Firebase: ${error.message}`);
        await this.removeInvalidTokens([token]);
        return false;
      }

      // Log but don't fail for other errors (transient network issues, etc.)
      console.warn(`⚠️ Token validation inconclusive: ${error.code} - ${error.message}`);
      return false;
    }
  }

  /**
   * ✅ NEW: Retry failed sends with exponential backoff
   */
  async retryFailedSends(failedTokens, message, maxRetries = 3) {
    try {
      if (!failedTokens || failedTokens.length === 0) return;

      console.log(`\n🔄 RETRY: Attempting ${failedTokens.length} failed token(s) with backoff...`);
      console.log('━'.repeat(50));

      const messagingClient = admin.messaging();
      let retryCount = 0;
      let successCount = 0;

      for (const tokenData of failedTokens) {
        const { token, attempt = 1 } = tokenData;

        // Calculate exponential backoff: 1s, 2s, 4s, 8s
        const backoffMs = Math.pow(2, attempt - 1) * 1000;
        await new Promise((resolve) => setTimeout(resolve, backoffMs));

        if (attempt > maxRetries) {
          console.warn(`⏭️ Max retries reached for token: ${token.substring(0, 30)}...`);
          continue;
        }

        try {
          retryCount++;
          console.log(`  [${retryCount}/${failedTokens.length}] Attempt ${attempt}: ${token.substring(0, 30)}...`);

          await messagingClient.send(message);

          successCount++;
          console.log(`  ✅ Retry successful`);
        } catch (error) {
          if (error.code === 'messaging/registration-token-not-registered' ||
              error.code === 'messaging/invalid-registration-token') {
            console.error(`  ❌ Token invalid - removing from database`);
            await this.removeInvalidTokens([token]);
          } else if (attempt < maxRetries) {
            console.warn(`  ⚠️ Will retry (attempt ${attempt + 1}/${maxRetries})`);
            failedTokens.push({ token, attempt: attempt + 1 });
          } else {
            console.error(`  ❌ Retry failed after ${maxRetries} attempts`);
          }
        }
      }

      console.log(`✅ Retry complete: ${successCount} succeeded`);
      console.log('━'.repeat(50) + '\n');
    } catch (error) {
      console.error('Error in retry logic:', error);
    }
  }

  async sendPushNotification(userId, fcmToken, title, body, data = {}) {
    try {
      if (!fcmToken) {
        console.warn(`⚠️ No FCM token for user ${userId}`);
        return null;
      }

      console.log(`📤 Sending push notification to user ${userId}...`);

      const message = {
        notification: {
          title,
          body,
        },
        data,
        token: fcmToken,
        webpush: {
          notification: {
            title,
            body,
            icon: '/logo.png',
            badge: '/badge.png',
          },
          data,
        },
      };

      try {
        const response = await admin.messaging().send(message);
        console.log(`✅ Notification sent to user ${userId}: ${response}`);
        return response;
      } catch (firebaseError) {
        console.error(`❌ Firebase error sending to user ${userId}:`, {
          code: firebaseError.code,
          message: firebaseError.message,
        });

        // ✅ NEW: Handle invalid tokens automatically
        if (firebaseError.code === 'messaging/registration-token-not-registered' ||
            firebaseError.code === 'messaging/invalid-registration-token') {
          console.error(`   → Removing invalid token from database`);
          await this.removeInvalidTokens([fcmToken]);
        }

        // Log helpful debugging info
        if (firebaseError.code === 'messaging/unknown-error') {
          console.error('⚠️ Firebase credentials may be invalid or Cloud Messaging API is not enabled');
        }
        
        // Return graceful failure instead of throwing
        return null;
      }
    } catch (error) {
      console.error(`Error in sendPushNotification for user ${userId}:`, error);
      return null;
    }
  }

  async sendMulticastNotification(fcmTokens, title, body, data = {}) {
    try {
      // Validate FCM tokens
      if (!fcmTokens || fcmTokens.length === 0) {
        console.warn('⚠️ No FCM tokens provided for multicast notification');
        return { successCount: 0, failureCount: 0 };
      }

      console.log(`\n${'='.repeat(60)}`);
      console.log('📢 FIREBASE MULTICAST NOTIFICATION');
      console.log(`${'='.repeat(60)}`);
      console.log(`📱 Recipients: ${fcmTokens.length} devices`);
      console.log(`📝 Title: "${title}"`);
      console.log(`💬 Body: "${body}"`);
      console.log(`📦 Data Keys:`, Object.keys(data).join(', ') || 'none');
      console.log(`${'='.repeat(60)}`);

      const validTokens = fcmTokens.filter((token) => token && typeof token === 'string');
      
      if (validTokens.length === 0) {
        console.warn('⚠️ No valid FCM tokens found');
        return { successCount: 0, failureCount: 0 };
      }

      console.log(`📤 Sending multicast notification to ${validTokens.length} devices...`);

      const message = {
        notification: {
          title,
          body,
        },
        data,
        webpush: {
          notification: {
            title,
            body,
            icon: '/logo.png',
            badge: '/badge.png',
          },
          data,
        },
      };

      try {
        // Use sendAll if sendMulticast is not available (newer firebase-admin versions)
        const messagingClient = admin.messaging();
        
        let response;
        
        // Try sendMulticast first (firebase-admin 11+)
        if (typeof messagingClient.sendMulticast === 'function') {
          console.log('\n🔵 METHOD ATTEMPT 1: sendMulticast (firebase-admin 11+)');
          console.log('━'.repeat(50));
          response = await messagingClient.sendMulticast({
            ...message,
            tokens: validTokens,
          });
          console.log(`✅ sendMulticast succeeded: ${response.successCount} succeeded, ${response.failureCount} failed`);
        } 
        // Fallback to sendAll (firebase-admin 9.6.0+)
        else if (typeof messagingClient.sendAll === 'function') {
          console.log('\n🟡 METHOD ATTEMPT 2: sendAll (firebase-admin 9.6.0+, sendMulticast unavailable)');
          console.log('━'.repeat(50));
          const messages = validTokens.map(token => ({
            ...message,
            token,
          }));
          response = await messagingClient.sendAll(messages);
          console.log(`✅ sendAll succeeded: ${response.successCount} succeeded, ${response.failureCount} failed`);
        }
        // Final fallback: send individually with detailed error tracking
        else {
          console.log('\n🔴 METHOD ATTEMPT 3: Individual send (sendMulticast and sendAll unavailable)');
          console.log('━'.repeat(50));
          let successCount = 0;
          let failureCount = 0;
          const responses = [];
          const invalidTokens = [];

          for (const token of validTokens) {
            try {
              console.log(`\n📤 Attempting to send Firebase message to token: ${token.substring(0, 30)}...`);
              console.log(`   Message title: "${message.notification?.title}"`);
              console.log(`   Message body: "${message.notification?.body}"`);
              console.log(`   Data keys: ${Object.keys(message.data || {}).join(', ') || 'none'}`);
              
              await messagingClient.send({
                ...message,
                token,
              });
              successCount++;
              responses.push({ success: true });
              console.log(`   ✅ SUCCESS: Message sent to token: ${token.substring(0, 30)}...`);
            } catch (err) {
              failureCount++;
              responses.push({ success: false, error: err });
              
              console.error(`\n   ❌ FIREBASE ERROR for token ${token.substring(0, 30)}...`);
              console.error(`   Error Code: ${err.code}`);
              console.error(`   Error Message: ${err.message}`);
              console.error(`   Error Type: ${err.constructor?.name}`);
              console.error(`   Full Error:`, {
                code: err.code,
                message: err.message,
                errorInfo: err.errorInfo,
                codePrefix: err.codePrefix,
                stack: err.stack?.split('\n').slice(0, 3).join('\n'), // First 3 stack lines
              });

              // ✅ NEW: Categorize errors and cleanup invalid tokens
              if (err.code === 'messaging/registration-token-not-registered' ||
                  err.code === 'messaging/invalid-registration-token') {
                console.error(`   🔍 ANALYSIS: Token is invalid or expired`);
                console.error(`   💡 SOLUTION: Token will be removed from database`);
                invalidTokens.push(token);
              } else if (err.message?.includes('not found')) {
                console.error(`   🔍 ANALYSIS: Token appears to be invalid or expired`);
                console.error(`   💡 SOLUTION: User needs to logout/login to get a fresh token`);
                invalidTokens.push(token);
              } else if (err.message?.includes('invalid')) {
                console.error(`   🔍 ANALYSIS: Token format is invalid`);
                console.error(`   💡 SOLUTION: Token may be corrupted, regenerate on frontend`);
                invalidTokens.push(token);
              } else if (err.message?.includes('authentication') || err.message?.includes('credentials')) {
                console.error(`   🔍 ANALYSIS: Firebase authentication/credentials issue`);
                console.error(`   💡 SOLUTION: Check Firebase project ID and private key in .env`);
              } else if (err.message?.includes('permission')) {
                console.error(`   🔍 ANALYSIS: Firebase permissions issue`);
                console.error(`   💡 SOLUTION: Check Cloud Messaging API is enabled in Firebase Console`);
              }
              
              console.log(`   Token length: ${token.length}`);
              console.log(`   Token preview: ${token.substring(0, 50)}...`);
            }
          }

          response = {
            successCount,
            failureCount,
            responses,
            invalidTokens,
          };

          // ✅ NEW: Cleanup invalid tokens after all attempts
          if (invalidTokens.length > 0) {
            await this.removeInvalidTokens(invalidTokens);
          }
        }

        console.log(`✅ Multicast notification processed: ${response.successCount} succeeded, ${response.failureCount} failed`);
        
        // ✅ NEW: Handle failures and cleanup invalid tokens
        if (response.failureCount > 0 && response.responses) {
          const invalidTokens = [];

          response.responses.forEach((resp, idx) => {
            if (!resp.success) {
              const token = validTokens[idx];
              const errorCode = resp.error?.code;
              const errorMsg = resp.error?.message || 'Unknown error';

              console.warn(`   Failed for token ${idx} (${token?.substring(0, 20)}...): ${errorMsg}`);
              
              // ✅ NEW: Identify and mark invalid tokens for cleanup
              if (errorCode === 'messaging/registration-token-not-registered' ||
                  errorCode === 'messaging/invalid-registration-token' ||
                  errorMsg.includes('not found') || errorMsg.includes('invalid')) {
                invalidTokens.push(token);
                console.error(`   → Token marked as invalid for removal`);
              }
            }
          });

          // ✅ NEW: Remove all invalid tokens in bulk
          if (invalidTokens.length > 0) {
            await this.removeInvalidTokens(invalidTokens);
          }
        }
        
        return response;
      } catch (firebaseError) {
        console.error('\n❌ FIREBASE MESSAGING ERROR (SENDMULTICAST/SENDALL):');
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('Error Code:', firebaseError.code);
        console.error('Error Message:', firebaseError.message);
        console.error('Error Type:', firebaseError.constructor?.name);
        console.error('Full Error Details:', {
          code: firebaseError.code,
          message: firebaseError.message,
          errorInfo: firebaseError.errorInfo,
          codePrefix: firebaseError.codePrefix,
        });
        console.error('Stack Trace:', firebaseError.stack?.split('\n').slice(0, 5).join('\n'));
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        // Detailed analytics
        if (firebaseError.code === 'messaging/unknown-error' || firebaseError.message.includes('not a function')) {
          console.error('⚠️ Firebase method not available.');
          console.error('Make sure: 1. firebase-admin version is 9.6.0 or higher');
          console.error('           2. Messaging API is properly initialized');
          console.error('           3. Try fallback: send messages individually...');
          
          // Try fallback: send messages individually
          try {
            console.log('\n🔄 Attempting fallback: sending messages individually...');
            const messagingClient = admin.messaging();
            let successCount = 0;
            let failureCount = 0;
            const invalidTokensFromFallback = [];

            for (const token of fcmTokens) {
              try {
                console.log(`📤 Fallback: Sending to token ${token.substring(0, 30)}...`);
                await messagingClient.send({
                  notification: {
                    title,
                    body,
                  },
                  data,
                  token,
                });
                successCount++;
                console.log(`   ✅ Fallback: Message sent`);
              } catch (err) {
                failureCount++;
                console.error(`   ❌ Fallback failed: ${err.message}`);

                // ✅ NEW: Remove invalid tokens in fallback too
                if (err.code === 'messaging/registration-token-not-registered' ||
                    err.code === 'messaging/invalid-registration-token') {
                  invalidTokensFromFallback.push(token);
                }
              }
            }

            // ✅ NEW: Cleanup invalid tokens after fallback
            if (invalidTokensFromFallback.length > 0) {
              await this.removeInvalidTokens(invalidTokensFromFallback);
            }

            console.log(`✅ Fallback completed: ${successCount} succeeded, ${failureCount} failed`);
            return {
              successCount,
              failureCount,
              responses: fcmTokens.map(() => ({ success: successCount > 0 })),
            };
          } catch (fallbackError) {
            console.error('❌ Fallback also failed:', fallbackError.message);
          }
        }

        // Return partial success instead of throwing
        return {
          successCount: 0,
          failureCount: validTokens.length,
          responses: validTokens.map(() => ({ success: false, error: firebaseError })),
        };
      }
    } catch (error) {
      console.error('Error in sendMulticastNotification:', error);
      // Return graceful failure instead of throwing
      return { successCount: 0, failureCount: fcmTokens?.length || 0 };
    }
  }

  async saveNotification(userId, taskId, type, title, body, fcmToken, data = {}) {
    try {
      const notification = new Notification({
        userId,
        taskId,
        type,
        title,
        body,
        fcmToken,
        data,
        deliveryStatus: 'pending',
      });

      await notification.save();
      return notification;
    } catch (error) {
      console.error('Error saving notification:', error);
      throw error;
    }
  }

  async updateNotificationStatus(notificationId, status, sent = true) {
    try {
      const notification = await Notification.findByIdAndUpdate(
        notificationId,
        {
          sent,
          sentAt: new Date(),
          deliveryStatus: status,
        },
        { new: true }
      );

      return notification;
    } catch (error) {
      console.error('Error updating notification status:', error);
      throw error;
    }
  }

  async markNotificationAsRead(notificationId) {
    try {
      const notification = await Notification.findByIdAndUpdate(
        notificationId,
        {
          read: true,
          readAt: new Date(),
        },
        { new: true }
      );

      return notification;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  async getUserNotifications(userId, limit = 50, skip = 0, excludePastAlarms = true) {
    try {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1 day in milliseconds
      
      let query = { 
        userId,
        createdAt: { $gte: oneDayAgo } // Only show notifications created in the last 24 hours
      };

      // If excludePastAlarms is true, only show alarms where task's alarmTime >= now
      if (excludePastAlarms) {
        const Task = require('../models/Task');
        const pastTasks = await Task.find({
          alarmTime: { $lt: now },
        }).select('_id');
        
        const pastTaskIds = pastTasks.map(task => task._id);
        
        query = {
          ...query,
          $or: [
            { type: { $ne: 'alarm' } }, // Show non-alarm notifications
            { type: 'alarm', taskId: { $nin: pastTaskIds } } // Show alarms for future tasks only
          ]
        };
      }

      const notifications = await Notification.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .populate('taskId', 'title description alarmTime');

      const total = await Notification.countDocuments(query);

      return {
        notifications,
        total,
        unread: await Notification.countDocuments({ userId, read: false, ...query }),
      };
    } catch (error) {
      console.error('Error fetching user notifications:', error);
      throw error;
    }
  }

  /**
   * ✅ NEW: Get all valid tokens for a user  
   * Used before sending multicast for batch operations
   */
  async getValidTokensForUser(userId) {
    try {
      const user = await User.findById(userId).select('fcmToken fcmTokens');
      
      if (!user) {
        console.warn(`⚠️ User not found: ${userId}`);
        return [];
      }

      // Collect all valid tokens
      const tokens = [];

      // Include primary token if exists
      if (user.fcmToken && user.fcmToken.length > 100) {
        tokens.push(user.fcmToken);
      }

      // Include secondary tokens if they're not already included
      if (user.fcmTokens && Array.isArray(user.fcmTokens)) {
        user.fcmTokens.forEach(tokenEntry => {
          if (tokenEntry.token && 
              tokenEntry.token.length > 100 && 
              !tokens.includes(tokenEntry.token)) {
            tokens.push(tokenEntry.token);
          }
        });
      }

      console.log(`📱 Valid tokens for user ${userId}: ${tokens.length} token(s)`);
      return tokens;
    } catch (error) {
      console.error('Error getting valid tokens:', error);
      return [];
    }
  }

  /**
   * ✅ NEW: Clean up all invalid tokens for a user
   * Called periodically or after batch operations
   */
  async cleanupUserTokens(userId) {
    try {
      console.log(`\n🧹 Cleaning up tokens for user ${userId}...`);

      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      const validTokens = [];
      let validCount = 0;
      let invalidCount = 0;

      // Validate each token
      if (user.fcmTokens && Array.isArray(user.fcmTokens)) {
        for (const tokenEntry of user.fcmTokens) {
          const isValid = await this.validateTokenWithFirebase(tokenEntry.token);
          
          if (isValid) {
            validTokens.push(tokenEntry);
            validCount++;
          } else {
            invalidCount++;
          }
        }

        // Update user with valid tokens only
        user.fcmTokens = validTokens;

        // If primary token is invalid, set to null
        if (user.fcmToken && !validTokens.some(t => t.token === user.fcmToken)) {
          console.log(`   ⚠️ Primary token was invalid, clearing...`);
          user.fcmToken = null;
        }

        await user.save();
      }

      console.log(`✅ Cleanup complete: ${validCount} valid, ${invalidCount} removed`);
      return { validCount, invalidCount };
    } catch (error) {
      console.error('❌ Error cleaning user tokens:', error);
      throw error;
    }
  }
}

module.exports = new NotificationService();
