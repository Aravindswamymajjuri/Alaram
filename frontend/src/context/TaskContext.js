import React, { createContext, useState, useCallback, useRef } from 'react';
import { taskApi } from '../services/api';

export const TaskContext = createContext();

export const TaskProvider = ({ children }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const loadedStatusesRef = useRef(new Set());

  const getTasks = useCallback(async (status, forceRefresh = false) => {
    // Prevent duplicate calls for the same status, unless forcing refresh
    if (!forceRefresh && loadedStatusesRef.current.has(status)) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await taskApi.getTasks(status);
      setTasks(response.data.tasks);
      loadedStatusesRef.current.add(status);
      return response.data.tasks;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch tasks');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createTask = useCallback(async (taskData) => {
    setLoading(true);
    try {
      const response = await taskApi.createTask(taskData);
      // Reset cache so getTasks will fetch fresh data
      loadedStatusesRef.current.clear();
      setTasks((prev) => [...prev, response.data.task]);
      return response.data.task;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create task');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateTask = useCallback(async (taskId, updateData) => {
    try {
      const response = await taskApi.updateTask(taskId, updateData);
      loadedStatusesRef.current.clear();
      setTasks((prev) =>
        prev.map((task) => (task._id === taskId ? response.data.task : task))
      );
      return response.data.task;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update task');
      throw err;
    }
  }, []);

  const markComplete = useCallback(async (taskId, reason = null) => {
    try {
      console.log('🔵 markComplete called with:', { taskId, reason });
      const response = await taskApi.markComplete(taskId, reason);
      console.log('🟢 Full response received:', response);
      console.log('🟢 Task data:', response.data.task);
      console.log('🟢 CompletedBy array:', response.data.task.completedBy);
      console.log('🟢 CompletedBy[0]:', response.data.task.completedBy?.[0]);
      
      // CRITICAL: Check if reason is in the response
      if (response.data.task.completedBy?.[0]?.reason) {
        console.log('✅ REASON FOUND IN RESPONSE:', response.data.task.completedBy[0].reason);
      } else {
        console.log('❌ WARNING: REASON IS MISSING FROM RESPONSE!');
        console.log('   CompletedBy[0] fields:', Object.keys(response.data.task.completedBy[0]));
      }
      
      loadedStatusesRef.current.clear();
      setTasks((prev) => {
        const updated = prev.map((task) => (task._id === taskId ? response.data.task : task));
        console.log('🟢 Tasks updated in state:', updated.find(t => t._id === taskId));
        return updated;
      });
      return response.data.task;
    } catch (err) {
      console.error('🔴 Error marking task complete:', err);
      setError(err.response?.data?.message || 'Failed to mark task complete');
      throw err;
    }
  }, []);

  const deleteTask = useCallback(async (taskId) => {
    try {
      await taskApi.deleteTask(taskId);
      loadedStatusesRef.current.clear();
      setTasks((prev) => prev.filter((task) => task._id !== taskId));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete task');
      throw err;
    }
  }, []);

  const searchTasks = useCallback(async (query) => {
    try {
      const response = await taskApi.searchTasks(query);
      return response.data.tasks;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to search tasks');
      throw err;
    }
  }, []);

  const value = {
    tasks,
    loading,
    error,
    getTasks,
    createTask,
    updateTask,
    markComplete,
    deleteTask,
    searchTasks,
  };

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
};
