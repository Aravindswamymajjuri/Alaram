import React, { useContext, useEffect, useState, useRef } from 'react';
import { TaskContext } from '../context/TaskContext';
import { AuthContext } from '../context/AuthContext';
import { TaskForm } from '../components/TaskForm';
import { TaskList } from '../components/TaskList';
import { NotificationPanel } from '../components/NotificationPanel';
import { connectSocket, onTaskCompleted, onNotificationReceived, onAlarmRinging, disconnectSocket } from '../services/socket';
import { requestFCMToken } from '../firebase/firebase';
import alarmSoundService from '../services/alarmSound';
import '../styles/dashboard.css';

export const DashboardPage = () => {
  const { tasks, getTasks, loading } = useContext(TaskContext);
  const { user, updateFCMToken } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('pending');
  const [showForm, setShowForm] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const socketInitializedRef = useRef(false);
  const userIdRef = useRef(null);
  const fcmRefreshedRef = useRef(false);

  // Load tasks when tab changes
  useEffect(() => {
    if (user) {
      getTasks(activeTab, true); // Force refresh on tab change
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Refresh FCM token ONCE when dashboard component mounts with a user
  useEffect(() => {
    if (user && !fcmRefreshedRef.current) {
      fcmRefreshedRef.current = true;

      const refreshFCMTokenOnDashboardLoad = async () => {
        try {
          const fcmToken = await requestFCMToken();
          if (fcmToken && updateFCMToken) {
            await updateFCMToken(fcmToken, 'Web Browser - Dashboard Load');
            console.log('✓ FCM token refreshed on dashboard load');
          }
        } catch (err) {
          console.warn('Failed to refresh FCM token on dashboard load:', err.message);
        }
      };

      refreshFCMTokenOnDashboardLoad();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Setup websocket listeners - only once per user
  useEffect(() => {
    if (!user) return;

    // Only initialize socket if user changed
    if (!socketInitializedRef.current || userIdRef.current !== user._id) {
      socketInitializedRef.current = true;
      userIdRef.current = user._id;

      // Connect socket
      connectSocket(user._id);

      // Register listeners for real-time updates
      const handleTaskCompleted = () => {
        getTasks(activeTab);
      };

      const handleNotification = (notification) => {
        setNotifications((prev) => [notification, ...prev]);
      };

      const handleAlarmRinging = (alarmData) => {
        console.log('🔴 [DASHBOARD] Alarm ringing:', alarmData);
        
        // Show notification
        setNotifications((prev) => [{
          _id: `alarm-${alarmData.taskId}-${Date.now()}`,
          taskId: alarmData.taskId,
          title: alarmData.taskTitle,
          description: alarmData.taskDescription,
          type: 'alarm',
          read: false,
          createdAt: new Date(),
        }, ...prev]);

        // Play alarm sound using singleton
        alarmSoundService.initializeAudio();
        alarmSoundService.playNotificationSound();
        console.log('🔊 Alarm sound triggered');
      };

      onTaskCompleted(handleTaskCompleted);
      onNotificationReceived(handleNotification);
      onAlarmRinging(handleAlarmRinging);
    }

    // Cleanup on unmount only
    return () => {
      disconnectSocket();
      socketInitializedRef.current = false;
      userIdRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id]);

  const pendingTasks = tasks.filter((t) => t.status === 'pending');
  const completedTasks = tasks.filter((t) => t.status === 'completed');

  return (
    <div className="dashboard-container">
      <div className="dashboard-content">
        <button
          className="btn-create-task"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? '✕ Close' : '+ Create Task'}
        </button>

        {showForm && (
          <TaskForm
            onSuccess={() => {
              setShowForm(false);
              getTasks(activeTab);
            }}
          />
        )}

        <div className="dashboard-grid">
          <div className="main-content">
            <div className="tabs">
              <button
                className={`tab ${activeTab === 'pending' ? 'active' : ''}`}
                onClick={() => setActiveTab('pending')}
              >
                📋 Pending ({pendingTasks.length})
              </button>
              <button
                className={`tab ${activeTab === 'completed' ? 'active' : ''}`}
                onClick={() => setActiveTab('completed')}
              >
                ✅ Completed ({completedTasks.length})
              </button>
            </div>

            {loading ? (
              <div className="loading">Loading tasks...</div>
            ) : (
              <TaskList
                tasks={
                  activeTab === 'pending' ? pendingTasks : completedTasks
                }
                onTasksUpdated={() => getTasks(activeTab)}
              />
            )}
          </div>

          <NotificationPanel notifications={notifications} />
        </div>
      </div>
    </div>
  );
};
