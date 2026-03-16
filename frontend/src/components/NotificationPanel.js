import React, { useState, useEffect, useRef } from 'react';
import { notificationApi } from '../services/api';
import alarmSoundService from '../services/alarmSound';
import { onAlarmRinging, onAlarmStopped, emitAlarmStopped, getSocket } from '../services/socket';
import { formatTimeOnly12Hour, formatAlarmTimeIST12Hour } from '../utils/dateFormatter';
import '../styles/components.css';

export const NotificationPanel = ({ notifications: realtimeNotifications }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showStopButton, setShowStopButton] = useState(false);
  const [activeAlarmTaskId, setActiveAlarmTaskId] = useState(null);
  const alarmTimerRef = useRef(null);

  useEffect(() => {
    fetchNotifications();
    
    // Request notification permission and initialize audio on mount
    const initializeAudio = async () => {
      console.log('🎵 Initializing audio system...');
      await alarmSoundService.constructor.requestNotificationPermission();
      
      // Initialize audio contexts early to work around browser autoplay policies
      alarmSoundService.initializeAudio();
      alarmSoundService.initializeAudioContext();
    };
    
    initializeAudio();

    // Add click handler to wake up audio context for browser autoplay policies
    const wakeUpAudio = () => {
      console.log('👆 User interaction detected - waking up audio context...');
      try {
        alarmSoundService.initializeAudioContext();
        if (alarmSoundService.audioContext && alarmSoundService.audioContext.state === 'suspended') {
          alarmSoundService.audioContext.resume().then(() => {
            console.log('✅ Audio context resumed via user interaction');
          });
        }
      } catch (err) {
        console.log('ℹ️ Audio context wake-up attempt (non-critical):', err.message);
      }
    };
    
    document.addEventListener('click', wakeUpAudio);
    document.addEventListener('touchend', wakeUpAudio);

    // Listen for real-time alarm ringing events from socket
    const handleAlarmRinging = (alarmData) => {
      console.log('🔴 REAL-TIME ALARM TRIGGERED!', alarmData);
      console.log('📊 Alarm Data:', {
        taskId: alarmData.taskId,
        taskTitle: alarmData.taskTitle,
        createdBy: alarmData.createdBy,
        hasNotification: !!alarmData.notification,
      });
      
      if (alarmData.notification) {
        // Add notification to the list
        setNotifications((prev) => [alarmData.notification, ...prev]);
        setUnreadCount((prev) => prev + 1);
      }

      // Play alarm sound immediately - with detailed logging
      console.log('🔊 Attempting to play alarm sound...');
      try {
        console.log('State before playAlarm:', {
          alarmSoundService: !!alarmSoundService,
          playAlarmMethod: typeof alarmSoundService?.playAlarm,
        });
        
        alarmSoundService.playAlarm('siren');
        
        console.log('✅ playAlarm(siren) called successfully');
        setShowStopButton(true);
        setActiveAlarmTaskId(alarmData.taskId);
      } catch (error) {
        console.error('❌ Error playing alarm sound:', error);
        console.error('Error details:', error.message, error.stack);
        
        // Try fallback
        try {
          console.log('🔄 Trying fallback: playAlarm(default)');
          alarmSoundService.playAlarm('default');
        } catch (fallbackError) {
          console.error('❌ Fallback alarm also failed:', fallbackError);
        }
      }

      // Create browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(`🔔 Alarm: ${alarmData.taskTitle}`, {
            body: 'Start the assigned task now!',
            icon: '/logo.png',
            tag: 'alarm-notification',
            requireInteraction: true,
          });
          console.log('✅ Browser notification created');
        } catch (notifError) {
          console.error('Error creating notification:', notifError);
        }
      }

      // Clear existing timer if any
      if (alarmTimerRef.current) {
        clearTimeout(alarmTimerRef.current);
      }

      // Auto-stop alarm after 70 seconds (1 minute + 10 seconds) if not manually stopped
      // This matches the Web Audio API loop duration
      alarmTimerRef.current = setTimeout(() => {
        console.log('⏹️ Auto-stopping alarm after 70 seconds (1+ minute)');
        handleStopAlarm();
      }, 70000); // 70 seconds
    };

    console.log('📌 Setting up alarm:ringing listener in NotificationPanel...');
    onAlarmRinging(handleAlarmRinging);
    console.log('✅ Alarm:ringing listener setup complete');

    // Listen for alarm stopped events (when another user stops the alarm)
    const handleAlarmStopped = (alarmData) => {
      console.log('🛑 Alarm stopped by another user:', alarmData);
      alarmSoundService.stopAlarm();
      setShowStopButton(false);
      setActiveAlarmTaskId(null);
      
      if (alarmTimerRef.current) {
        clearTimeout(alarmTimerRef.current);
      }
    };

    onAlarmStopped(handleAlarmStopped);

    return () => {
      // Cleanup timer on unmount
      if (alarmTimerRef.current) {
        clearTimeout(alarmTimerRef.current);
      }
      // Cleanup audio wake-up listeners
      document.removeEventListener('click', wakeUpAudio);
      document.removeEventListener('touchend', wakeUpAudio);
      // Listeners are managed by socket module
    };
  }, []);

  useEffect(() => {
    if (realtimeNotifications?.length > 0) {
      const newNotification = realtimeNotifications[0];
      setNotifications((prev) => [newNotification, ...prev]);
      setUnreadCount((prev) => prev + 1);

      // Play sound based on notification type
      if (newNotification.type === 'alarm') {
        console.log('🔴 ALARM triggered!');
        alarmSoundService.playAlarm('siren');
        setShowStopButton(true);
      } else if (newNotification.type === 'reminder') {
        console.log('🟡 Reminder notification');
        alarmSoundService.playNotificationSound();
      } else {
        console.log('📬 Regular notification');
        alarmSoundService.playNotificationSound();
      }
    }
  }, [realtimeNotifications]);

  const handleStopAlarm = () => {
    console.log('🛑 Stopping alarm and notifying other users...');
    alarmSoundService.stopAlarm();
    setShowStopButton(false);
    
    // Notify all other users connected to this alarm
    if (activeAlarmTaskId) {
      console.log(`📢 Broadcasting stop alarm for task: ${activeAlarmTaskId}`);
      emitAlarmStopped({
        taskId: activeAlarmTaskId,
        stoppedBy: 'user', // Can be 'user' for manual stop or 'auto' for auto-stop
      });
    }
    
    setActiveAlarmTaskId(null);
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await notificationApi.getNotifications(10, 0);
      setNotifications(response.data.notifications);
      setUnreadCount(response.data.unread);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationApi.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) =>
          n._id === notificationId ? { ...n, read: true } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  return (
    <div className="notification-panel">
      <div className="notification-header">
        <h3>
          🔔 Notifications
          {unreadCount > 0 && <span className="unread-badge">{unreadCount}</span>}
        </h3>
        <div className="notification-actions">
          {showStopButton && (
            <button
              className="btn-stop-alarm"
              onClick={handleStopAlarm}
              title="Stop alarm sound"
            >
              🔇 Stop Alarm
            </button>
          )}
          {unreadCount > 0 && (
            <button
              className="btn-mark-all-read"
              onClick={handleMarkAllAsRead}
            >
              Mark all as read
            </button>
          )}
        </div>
      </div>

      {loading && <div className="loading">Loading notifications...</div>}

      {notifications.length === 0 ? (
        <div className="empty-state">
          <p>No notifications yet</p>
        </div>
      ) : (
        <div className="notification-list">
          {notifications.map((notification) => (
            <div
              key={notification._id}
              className={`notification-item ${
                notification.read ? 'read' : 'unread'
              }`}
              onClick={() => !notification.read && handleMarkAsRead(notification._id)}
            >
              <div className="notification-type">
                {notification.type === 'alarm' && '🔴'}
                {notification.type === 'reminder' && '🟡'}
                {notification.type === 'task_completed' && '✅'}
                {notification.type === 'task_assigned' && '📍'}
              </div>
              <div className="notification-content">
                <p className="notification-title">{notification.title}</p>
                <p className="notification-body">{notification.body}</p>
                <span className="notification-time">
                  {formatTimeOnly12Hour(notification.createdAt)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
