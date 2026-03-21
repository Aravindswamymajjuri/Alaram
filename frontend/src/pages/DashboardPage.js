import React, { useContext, useEffect, useState, useRef, useCallback } from 'react';
import { TaskContext } from '../context/TaskContext';
import { AuthContext } from '../context/AuthContext';
import { TaskForm } from '../components/TaskForm';
import { TaskList } from '../components/TaskList';
import { UserAnalytics } from '../components/UserAnalytics';
import { NotificationPanel, NotificationBell } from '../components/NotificationPanel';
import { NotificationDiagnostics } from '../components/NotificationDiagnostics';
import { connectSocket, onTaskCompleted, onNotificationReceived, onAlarmRinging, disconnectSocket } from '../services/socket';
import { requestFCMToken } from '../firebase/firebase';
import alarmSoundService from '../services/alarmSound';
import { Plus, X, Clipboard, CheckCircle, BarChart3 } from '../components/Icons';
import '../styles/dashboard.css';

export const DashboardPage = ({ setNotificationSlot }) => {
  const { tasks, getTasks, loading } = useContext(TaskContext);
  const { user, updateFCMToken } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('pending');
  const [showForm, setShowForm] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const socketInitializedRef = useRef(false);
  const userIdRef = useRef(null);
  const fcmRefreshedRef = useRef(false);
  const countsInitializedRef = useRef(false);

  const handleUnreadCountChange = useCallback((count) => {
    setUnreadCount(count);
  }, []);

  // Push bell icon into header via prop
  useEffect(() => {
    if (setNotificationSlot) {
      setNotificationSlot(
        <NotificationBell
          unreadCount={unreadCount}
          onClick={() => setShowNotifications((prev) => !prev)}
        />
      );
    }
    return () => {
      if (setNotificationSlot) setNotificationSlot(null);
    };
  }, [setNotificationSlot, unreadCount]);

  // Load counts for both tabs on initial mount
  useEffect(() => {
    if (user && !countsInitializedRef.current) {
      countsInitializedRef.current = true;
      const loadCounts = async () => {
        try {
          const pendingTasks = await getTasks('pending', true);
          setPendingCount(pendingTasks?.length || 0);
          const completedTasks = await getTasks('completed', true);
          setCompletedCount(completedTasks?.length || 0);
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
    if (!socketInitializedRef.current || userIdRef.current !== user._id) {
      socketInitializedRef.current = true;
      userIdRef.current = user._id;
      connectSocket(user._id);

      const handleTaskCompleted = () => {
        getTasks(activeTab);
      };

      const handleNotification = (notification) => {
        setNotifications((prev) => [notification, ...prev]);
      };

      const handleAlarmRinging = (alarmData) => {
        console.log('[DASHBOARD] Alarm ringing:', alarmData);
        setNotifications((prev) => [{
          _id: `alarm-${alarmData.taskId}-${Date.now()}`,
          taskId: alarmData.taskId,
          title: alarmData.taskTitle,
          description: alarmData.taskDescription,
          type: 'alarm',
          read: false,
          createdAt: new Date(),
        }, ...prev]);
        alarmSoundService.initializeAudio();
        alarmSoundService.playNotificationSound();
      };

      onTaskCompleted(handleTaskCompleted);
      onNotificationReceived(handleNotification);
      onAlarmRinging(handleAlarmRinging);
    }

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
    <div className="dashboard">
      <div className="dash-toolbar">
        <div className="dash-tabs">
          <button className={`dash-tab ${activeTab === 'pending' ? 'active' : ''}`} onClick={() => setActiveTab('pending')}>
            <Clipboard size={14} />
            <span className="dash-tab-label">Pending</span>
            <span className="dash-tab-badge">{pendingCount}</span>
          </button>
          <button className={`dash-tab ${activeTab === 'completed' ? 'active' : ''}`} onClick={() => setActiveTab('completed')}>
            <CheckCircle size={14} />
            <span className="dash-tab-label">Completed</span>
            <span className="dash-tab-badge">{completedCount}</span>
          </button>
          <button className={`dash-tab ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>
            <BarChart3 size={14} />
            <span className="dash-tab-label">Analytics</span>
          </button>
        </div>
        <button className="dash-create-btn" onClick={() => setShowForm(!showForm)}>
          {showForm ? <X size={14} /> : <Plus size={14} />}
          <span>{showForm ? 'Close' : 'New Task'}</span>
        </button>
      </div>

      {showForm && (
        <TaskForm
          onSuccess={() => {
            setShowForm(false);
            getTasks(activeTab);
          }}
        />
      )}

      <div className="dash-panel">
        {loading && activeTab !== 'analytics' ? (
          <div className="loading">Loading tasks...</div>
        ) : activeTab === 'analytics' ? (
          <UserAnalytics />
        ) : (
          <TaskList
            tasks={activeTab === 'pending' ? pendingTasks : completedTasks}
            onTasksUpdated={async () => {
              try {
                const pending = await getTasks('pending', true);
                const completed = await getTasks('completed', true);
                setPendingCount(pending?.length || 0);
                setCompletedCount(completed?.length || 0);
              } catch (err) {
                console.error('Error refreshing tasks:', err);
              }
            }}
          />
        )}
      </div>

      <NotificationPanel
        notifications={notifications}
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        onUnreadCountChange={handleUnreadCountChange}
      />

      <NotificationDiagnostics />
    </div>
  );
};
