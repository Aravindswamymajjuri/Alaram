import React, { useState, useContext, useRef, useEffect } from 'react';
import { TaskContext } from '../context/TaskContext';
import { AuthContext } from '../context/AuthContext';
import { userApi } from '../services/api';
import { requestFCMToken } from '../firebase/firebase';
import { getSystemTimezone, getTimezoneOffset } from '../utils/dateFormatter';
import '../styles/components.css';

export const TaskForm = ({ onSuccess }) => {
  const { createTask, loading } = useContext(TaskContext);
  const { updateFCMToken } = useContext(AuthContext);
  const dropdownRef = useRef(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    alarmTime: '',
    reminderTimes: [30, 15],
    assignedUsers: [],
    priority: 'medium',
    category: '',
    recurrence: 'once',
  });
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [error, setError] = useState('');

  // Load all users on component mount
  useEffect(() => {
    const loadAllUsers = async () => {
      try {
        const response = await userApi.getAllUsers();
        setUsers(response.data.users);
      } catch (err) {
        console.error('Error loading users:', err);
      }
    };

    loadAllUsers();
  }, []);

  // Handle clicking outside the dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowUserDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    if (name === 'reminder30') {
      setFormData((prev) => ({
        ...prev,
        reminderTimes: checked
          ? [...(prev.reminderTimes || []), 30]
          : (prev.reminderTimes || []).filter((t) => t !== 30),
      }));
    }
    if (name === 'reminder15') {
      setFormData((prev) => ({
        ...prev,
        reminderTimes: checked
          ? [...(prev.reminderTimes || []), 15]
          : (prev.reminderTimes || []).filter((t) => t !== 15),
      }));
    }
    if (name === 'reminder5') {
      setFormData((prev) => ({
        ...prev,
        reminderTimes: checked
          ? [...(prev.reminderTimes || []), 5]
          : (prev.reminderTimes || []).filter((t) => t !== 5),
      }));
    }
  };

  const searchUsers = async (query) => {
    if (query.length < 2) {
      // Show all users if query is cleared
      try {
        const response = await userApi.getAllUsers();
        setUsers(response.data.users);
      } catch (err) {
        console.error('Error loading users:', err);
      }
      return;
    }
    try {
      const response = await userApi.searchUsers(query);
      setUsers(response.data.users);
    } catch (err) {
      console.error('Error searching users:', err);
    }
  };

  const handleUserSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    searchUsers(query);
  };

  const addUserToTask = (userId, userName) => {
    setFormData((prev) => ({
      ...prev,
      assignedUsers: [...(prev.assignedUsers || []), { userId, userName }],
    }));
    setSearchQuery('');
    setShowUserDropdown(false);
  };

  const removeUserFromTask = (userId) => {
    setFormData((prev) => ({
      ...prev,
      assignedUsers: (prev.assignedUsers || []).filter((u) => u.userId !== userId),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      // Capture timezone offset (in minutes)
      const timezoneOffset = new Date().getTimezoneOffset();
      
      // Send datetime-local value as-is (e.g., "2026-03-16T13:53")
      // Backend will parse this as local time and convert to UTC for storage
      await createTask({
        ...formData,
        assignedUsers: formData.assignedUsers?.map((u) => u.userId) || [],
        timezoneOffset: timezoneOffset,
      });

      // Refresh FCM token after task creation to ensure notifications work
      try {
        const fcmToken = await requestFCMToken();
        if (fcmToken && updateFCMToken) {
          await updateFCMToken(fcmToken, 'Web Browser - Task Created');
          console.log('✓ FCM token refreshed after task creation');
        }
      } catch (fcmErr) {
        console.warn('Failed to refresh FCM token after task creation:', fcmErr.message);
      }

      onSuccess();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="task-form-container">
      <h2>Create New Task</h2>
      <form onSubmit={handleSubmit} className="task-form">
        <div className="form-group">
          <label htmlFor="title">Task Title *</label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            placeholder="Enter task title"
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Enter task description"
            rows="3"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="alarmTime">Alarm Time * (12-Hour Format)</label>
            <input
              type="datetime-local"
              id="alarmTime"
              name="alarmTime"
              value={formData.alarmTime}
              onChange={handleChange}
              required
            />
            <small style={{ display: 'block', marginTop: '0.3rem', color: '#666', fontSize: '0.85rem' }}>
              🌍 Your timezone: <strong>{getSystemTimezone()}</strong> ({getTimezoneOffset()})
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="priority">Priority</label>
            <select
              id="priority"
              name="priority"
              value={formData.priority}
              onChange={handleChange}
            >
              <option value="low">🔵 Low</option>
              <option value="medium">🟡 Medium</option>
              <option value="high">🔴 High</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Reminder Times</label>
          <div className="checkboxes">
            <label>
              <input
                type="checkbox"
                name="reminder30"
                checked={(formData.reminderTimes || []).includes(30)}
                onChange={handleCheckboxChange}
              />
              30 minutes before
            </label>
            <label>
              <input
                type="checkbox"
                name="reminder15"
                checked={(formData.reminderTimes || []).includes(15)}
                onChange={handleCheckboxChange}
              />
              15 minutes before
            </label>
            <label>
              <input
                type="checkbox"
                name="reminder5"
                checked={(formData.reminderTimes || []).includes(5)}
                onChange={handleCheckboxChange}
              />
              5 minutes before
            </label>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="category">Category</label>
          <input
            type="text"
            id="category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            placeholder="e.g., Work, Personal"
          />
        </div>

        <div className="form-group">
          <label>Assign to Users</label>
          <div className="user-assignment" ref={dropdownRef}>
            <input
              type="text"
              value={searchQuery}
              onChange={handleUserSearch}
              onFocus={() => setShowUserDropdown(true)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setShowUserDropdown(false);
              }}
              placeholder="Search and add users..."
              className="user-search"
              autoComplete="off"
            />

            {showUserDropdown && users.length > 0 && (
              <div className="user-dropdown">
                {users.map((u) => (
                  <div
                    key={u._id}
                    className="user-option"
                    onClick={() => {
                      addUserToTask(u._id, u.name);
                      setShowUserDropdown(false);
                    }}
                  >
                    <div className="user-option-name">{u.name}</div>
                    <div className="user-option-email">{u.email}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="assigned-users">
              {(formData.assignedUsers || []).map((user) => (
                <div key={user.userId} className="user-tag">
                  <span>{user.userName}</span>
                  <button
                    type="button"
                    className="remove-user"
                    onClick={() => removeUserFromTask(user.userId)}
                    title="Remove user"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Creating...' : 'Create Task'}
        </button>
      </form>
    </div>
  );
};
