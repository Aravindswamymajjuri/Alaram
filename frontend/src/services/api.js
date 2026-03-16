import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Authentication API
export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  updateFCMToken: (data) => api.post('/auth/fcm-token', data),
};

// Task API
export const taskApi = {
  createTask: (data) => api.post('/tasks', data),
  getTasks: (status) => api.get('/tasks', { params: { status } }),
  getTask: (taskId) => api.get(`/tasks/${taskId}`),
  updateTask: (taskId, data) => api.put(`/tasks/${taskId}`, data),
  markComplete: (taskId) => api.patch(`/tasks/${taskId}/complete`),
  deleteTask: (taskId) => api.delete(`/tasks/${taskId}`),
  searchTasks: (query) => api.get('/tasks/search', { params: { query } }),
};

// User API
export const userApi = {
  getAllUsers: () => api.get('/users'),
  searchUsers: (query) => api.get('/users/search', { params: { query } }),
  updateNotificationPreferences: (data) => api.put('/users/preferences/notifications', data),
};

// Notification API
export const notificationApi = {
  getNotifications: (limit, skip, excludePastAlarms = true) => 
    api.get('/notifications', { params: { limit, skip, excludePastAlarms } }),
  markAsRead: (notificationId) => api.patch(`/notifications/${notificationId}/read`),
  markAllAsRead: () => api.patch('/notifications/read/all'),
};

export default api;
