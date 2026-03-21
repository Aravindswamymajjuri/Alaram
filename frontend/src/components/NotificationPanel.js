import React, { useState, useEffect, useRef } from 'react';
import { notificationApi } from '../services/api';
import alarmSoundService from '../services/alarmSound';
import { onAlarmRinging, onAlarmStopped, emitAlarmStopped } from '../services/socket';
import { formatTimeOnly12Hour } from '../utils/dateFormatter';
import { Bell, VolumeX, CircleDot, CheckCircle, MapPin, X } from './Icons';
import '../styles/notifications.css';

export const NotificationBell = ({ unreadCount, onClick }) => {
  return (
    <button className="notif-bell-btn" onClick={onClick} title="Notifications" aria-label="Notifications">
      <Bell size={20} />
      {unreadCount > 0 && <span className="notif-bell-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
    </button>
  );
};

export const NotificationPanel = ({ notifications: realtimeNotifications, isOpen, onClose, onUnreadCountChange }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showStopButton, setShowStopButton] = useState(false);
  const [activeAlarmTaskId, setActiveAlarmTaskId] = useState(null);
  const alarmTimerRef = useRef(null);
  const panelRef = useRef(null);

  // Notify parent of unread count changes
  useEffect(() => {
    if (onUnreadCountChange) {
      onUnreadCountChange(unreadCount);
    }
  }, [unreadCount, onUnreadCountChange]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen && panelRef.current && !panelRef.current.contains(event.target)) {
        // Check if the click was on the bell button itself
        if (event.target.closest('.notif-bell-btn')) return;
        onClose?.();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  useEffect(() => {
    fetchNotifications();

    const initializeAudio = async () => {
      console.log('Initializing audio system...');
      await alarmSoundService.constructor.requestNotificationPermission();
      alarmSoundService.initializeAudio();
      alarmSoundService.initializeAudioContext();
    };

    initializeAudio();

    const wakeUpAudio = () => {
      try {
        alarmSoundService.initializeAudioContext();
        if (alarmSoundService.audioContext && alarmSoundService.audioContext.state === 'suspended') {
          alarmSoundService.audioContext.resume();
        }
      } catch (err) {
        // non-critical
      }
    };

    document.addEventListener('click', wakeUpAudio);
    document.addEventListener('touchend', wakeUpAudio);

    const handleAlarmRinging = (alarmData) => {
      console.log('REAL-TIME ALARM TRIGGERED!', alarmData);

      if (alarmData.notification) {
        setNotifications((prev) => [alarmData.notification, ...prev]);
        setUnreadCount((prev) => prev + 1);
      }

      try {
        alarmSoundService.playAlarm('siren');
        setShowStopButton(true);
        setActiveAlarmTaskId(alarmData.taskId);
      } catch (error) {
        console.error('Error playing alarm sound:', error);
        try {
          alarmSoundService.playAlarm('default');
        } catch (fallbackError) {
          console.error('Fallback alarm also failed:', fallbackError);
        }
      }

      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(`Alarm: ${alarmData.taskTitle}`, {
            body: 'Start the assigned task now!',
            icon: '/logo.png',
            tag: 'alarm-notification',
            requireInteraction: true,
          });
        } catch (notifError) {
          console.error('Error creating notification:', notifError);
        }
      }

      if (alarmTimerRef.current) {
        clearTimeout(alarmTimerRef.current);
      }

      alarmTimerRef.current = setTimeout(() => {
        handleStopAlarm();
      }, 70000);
    };

    onAlarmRinging(handleAlarmRinging);

    const handleAlarmStopped = (alarmData) => {
      console.log('Alarm stopped by another user:', alarmData);
      alarmSoundService.stopAlarm();
      if (window.stopAlarmSound) {
        window.stopAlarmSound();
      }
      setShowStopButton(false);
      setActiveAlarmTaskId(null);
      if (alarmTimerRef.current) {
        clearTimeout(alarmTimerRef.current);
      }
    };

    onAlarmStopped(handleAlarmStopped);

    return () => {
      if (alarmTimerRef.current) {
        clearTimeout(alarmTimerRef.current);
      }
      document.removeEventListener('click', wakeUpAudio);
      document.removeEventListener('touchend', wakeUpAudio);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (realtimeNotifications?.length > 0) {
      const newNotification = realtimeNotifications[0];
      setNotifications((prev) => [newNotification, ...prev]);
      setUnreadCount((prev) => prev + 1);

      if (newNotification.type === 'alarm') {
        alarmSoundService.playAlarm('siren');
        setShowStopButton(true);
      } else {
        alarmSoundService.playNotificationSound();
      }
    }
  }, [realtimeNotifications]);

  const handleStopAlarm = () => {
    alarmSoundService.stopAlarm();
    if (window.stopAlarmSound) {
      window.stopAlarmSound();
    }
    setShowStopButton(false);
    if (activeAlarmTaskId) {
      emitAlarmStopped({
        taskId: activeAlarmTaskId,
        stoppedBy: 'user',
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

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'alarm': return <CircleDot color="#EF4444" size={10} />;
      case 'reminder': return <CircleDot color="#F59E0B" size={10} />;
      case 'task_completed': return <CheckCircle size={16} className="notif-icon-complete" />;
      case 'task_assigned': return <MapPin size={16} className="notif-icon-assigned" />;
      default: return <Bell size={16} />;
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="notif-overlay" onClick={onClose} />
      <div className="notif-dropdown" ref={panelRef}>
        <div className="notif-dropdown-header">
          <h3>Notifications</h3>
          <div className="notif-dropdown-actions">
            {showStopButton && (
              <button className="btn-stop-alarm" onClick={handleStopAlarm} title="Stop alarm sound">
                <VolumeX size={14} /> Stop
              </button>
            )}
            {unreadCount > 0 && (
              <button className="btn-mark-all-read" onClick={handleMarkAllAsRead}>
                Mark all read
              </button>
            )}
            <button className="notif-close-btn" onClick={onClose} title="Close">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="notif-dropdown-body">
          {loading && <div className="notif-loading">Loading...</div>}

          {!loading && notifications.length === 0 ? (
            <div className="notif-empty">
              <Bell size={24} />
              <p>No notifications yet</p>
            </div>
          ) : (
            <div className="notif-list">
              {notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`notif-item ${notification.read ? 'read' : 'unread'}`}
                  onClick={() => !notification.read && handleMarkAsRead(notification._id)}
                >
                  <div className="notif-item-icon">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="notif-item-content">
                    <p className="notif-item-title">{notification.title}</p>
                    <p className="notif-item-body">{notification.body}</p>
                    <span className="notif-item-time">
                      {formatTimeOnly12Hour(notification.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
