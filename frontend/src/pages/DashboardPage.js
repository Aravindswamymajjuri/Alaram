import React, { useContext, useEffect, useState, useRef } from 'react';
import { TaskContext } from '../context/TaskContext';
import { AuthContext } from '../context/AuthContext';
import { TaskForm } from '../components/TaskForm';
import { TaskList } from '../components/TaskList';
import { UserAnalytics } from '../components/UserAnalytics';
import { NotificationPanel } from '../components/NotificationPanel';
import { NotificationDiagnostics } from '../components/NotificationDiagnostics';
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
  const [pendingCount, setPendingCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const socketInitializedRef = useRef(false);
  const userIdRef = useRef(null);
  const fcmRefreshedRef = useRef(false);
  const countsInitializedRef = useRef(false);

  // Load counts for both tabs on initial mount
  useEffect(() => {
    if (user && !countsInitializedRef.current) {
      countsInitializedRef.current = true;
      
      const loadCounts = async () => {
        try {
          // Load pending count
          const pendingTasks = await getTasks('pending', true);
          setPendingCount(pendingTasks?.length || 0);
          
          // Load completed count
          const completedTasks = await getTasks('completed', true);
          setCompletedCount(completedTasks?.length || 0);
          
          // Default to pending tab
          await getTasks('pending', true);
        } catch (err) {
          console.error('Error loading task counts:', err);
        }
      };
      
      loadCounts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Load tasks when tab changes and update counts
  useEffect(() => {
    if (user) {
      const loadTabData = async () => {
        try {
          const tabTasks = await getTasks(activeTab, true);
          
          // Update the count for the active tab
          if (activeTab === 'pending') {
            setPendingCount(tabTasks?.length || 0);
          } else {
            setCompletedCount(tabTasks?.length || 0);
          }
        } catch (err) {
          console.error('Error loading tab data:', err);
        }
      };
      
      loadTabData();
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
                📋 Pending ({pendingCount})
              </button>
              <button
                className={`tab ${activeTab === 'completed' ? 'active' : ''}`}
                onClick={() => setActiveTab('completed')}
              >
                ✅ Completed ({completedCount})
              </button>
              <button
                className={`tab ${activeTab === 'analytics' ? 'active' : ''}`}
                onClick={() => setActiveTab('analytics')}
              >
                📊 Analytics
              </button>
            </div>

            {loading && activeTab !== 'analytics' ? (
              <div className="loading">Loading tasks...</div>
            ) : activeTab === 'analytics' ? (
              <UserAnalytics />
            ) : (
              <TaskList
                tasks={
                  activeTab === 'pending' ? pendingTasks : completedTasks
                }
                onTasksUpdated={async () => {
                  console.log('🔄 onTasksUpdated called - refreshing all task data');
                  try {
                    // Refresh both pending and completed to update counts
                    const pending = await getTasks('pending', true);
                    const completed = await getTasks('completed', true);
                    setPendingCount(pending?.length || 0);
                    setCompletedCount(completed?.length || 0);
                    // Also reload the active tab to show the updated data
                    console.log('✅ All task data refreshed. Pending:', pending?.length, 'Completed:', completed?.length);
                  } catch (err) {
                    console.error('❌ Error refreshing tasks:', err);
                  }
                }}
              />
            )}
          </div>

          <NotificationPanel notifications={notifications} />
        </div>
        <NotificationDiagnostics />
      </div>
    </div>
  );
};
