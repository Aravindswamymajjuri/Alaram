import React, { createContext, useState, useCallback, useEffect } from 'react';
import { authApi } from '../services/api';
import { requestFCMToken } from '../firebase/firebase';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(!!localStorage.getItem('token'));
  const [error, setError] = useState(null);

  // Restore user session from token on app load
  useEffect(() => {
    const restoreSession = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          const response = await authApi.getProfile();
          setUser(response.data.user);
          setToken(storedToken);
          
          // Try to request FCM token on session restore
          const fcmToken = await requestFCMToken();
          if (fcmToken) {
            try {
              await authApi.updateFCMToken({
                fcmToken,
                deviceName: `Web - ${navigator.userAgent.substring(0, 50)}`,
              });
              console.log('📱 FCM token updated on session restore');
            } catch (fcmErr) {
              console.warn('Failed to update FCM token:', fcmErr.message);
            }
          }
        } catch (err) {
          console.error('Failed to restore session:', err);
          // Clear invalid token
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    restoreSession();
  }, []);

  const register = useCallback(async (name, email, password, confirmPassword) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authApi.register({
        name,
        email,
        password,
        confirmPassword,
      });
      setUser(response.data.user);
      setToken(response.data.token);
      localStorage.setItem('token', response.data.token);
      
      // Request and send FCM token after successful registration
      const fcmToken = await requestFCMToken();
      if (fcmToken) {
        try {
          await authApi.updateFCMToken({
            fcmToken,
            deviceName: `Web - ${navigator.userAgent.substring(0, 50)}`,
          });
          console.log('📱 FCM token registered successfully');
        } catch (fcmErr) {
          console.warn('Failed to update FCM token:', fcmErr.message);
        }
      }
      
      return response.data;
    } catch (err) {
      const message = err.response?.data?.message || 'Registration failed';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authApi.login({ email, password });
      setUser(response.data.user);
      setToken(response.data.token);
      localStorage.setItem('token', response.data.token);
      
      // Request and send FCM token after successful login
      const fcmToken = await requestFCMToken();
      if (fcmToken) {
        try {
          await authApi.updateFCMToken({
            fcmToken,
            deviceName: `Web - ${navigator.userAgent.substring(0, 50)}`,
          });
          console.log('📱 FCM token registered successfully');
        } catch (fcmErr) {
          console.warn('Failed to update FCM token:', fcmErr.message);
        }
      }
      
      return response.data;
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
  }, []);

  const getProfile = useCallback(async () => {
    setLoading(true);
    try {
      const response = await authApi.getProfile();
      setUser(response.data.user);
      return response.data.user;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch profile');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProfile = useCallback(async (data) => {
    setLoading(true);
    try {
      const response = await authApi.updateProfile(data);
      setUser(response.data.user);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateFCMToken = useCallback(async (fcmToken, deviceName) => {
    try {
      const response = await authApi.updateFCMToken({
        fcmToken,
        deviceName,
      });
      setUser(response.data.user);
      return response.data;
    } catch (err) {
      console.error('Failed to update FCM token:', err);
    }
  }, []);

  const value = {
    user,
    token,
    loading,
    error,
    register,
    login,
    logout,
    getProfile,
    updateProfile,
    updateFCMToken,
    isAuthenticated: !!token,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
