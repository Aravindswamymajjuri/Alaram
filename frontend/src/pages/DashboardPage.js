import React, { useContext, useEffect, useState, useRef } from 'react';
import { TaskContext } from '../context/TaskContext';
import { AuthContext } from '../context/AuthContext';
import { TaskForm } from '../components/TaskForm';
import { TaskList } from '../components/TaskList';
import { NotificationPanel } from '../components/NotificationPanel';
import { connectSocket, onTaskCompleted, onNotificationReceived, disconnectSocket } from '../services/socket';
import '../styles/dashboard.css';

export const DashboardPage = () => {
  const { tasks, getTasks, loading } = useContext(TaskContext);
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('pending');
  const [showForm, setShowForm] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const socketInitializedRef = useRef(false);
  const userIdRef = useRef(null);

  // Load tasks when user is available or tab changes
  useEffect(() => {
    if (user) {
      getTasks(activeTab, true); // Force refresh on tab change
    }
  }, [user, activeTab]);

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

      onTaskCompleted(handleTaskCompleted);
      onNotificationReceived(handleNotification);
    }

    // Cleanup on unmount only
    return () => {
      disconnectSocket();
      socketInitializedRef.current = false;
      userIdRef.current = null;
    };
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
