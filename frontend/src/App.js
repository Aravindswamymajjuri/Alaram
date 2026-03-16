import React, { useContext, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext, AuthProvider } from './context/AuthContext';
import { TaskProvider } from './context/TaskContext';
import { requestFCMToken, onMessageListener } from './firebase/firebase';
import { Header } from './components/Header';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import './styles/auth.css';
import './styles/dashboard.css';
import './styles/components.css';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useContext(AuthContext);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>Loading...</div>;
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
}

function AppContent() {
  const { user, updateFCMToken, loading } = useContext(AuthContext);
  const notificationsInitializedRef = useRef(false);
  const fcmRefreshIntervalRef = useRef(null);

  useEffect(() => {
    // Request notification permission and get FCM token
    const setupNotifications = async () => {
      if (user && 'serviceWorker' in navigator && 'Notification' in window) {
        try {
          // Check notification permission status first
          if (Notification.permission === 'denied') {
            console.warn('⚠️ Notifications are blocked. User must reset permission in browser settings.');
            return;
          }

          // Register service worker and wait for it to be active
          const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
          console.log('✓ Service Worker registered');

          // Wait for service worker to become active
          let activeWorker = registration.active;
          if (!activeWorker) {
            // Wait for the service worker to become active
            activeWorker = await new Promise((resolve) => {
              const checkActive = () => {
                if (registration.active) {
                  resolve(registration.active);
                } else {
                  setTimeout(checkActive, 100);
                }
              };
              checkActive();
            });
          }

          console.log('✓ Service Worker is now active');

          // Now that service worker is active, request FCM token
          if (Notification.permission === 'granted' || Notification.permission === 'default') {
            const token = await requestFCMToken();
            if (token && user) {
              await updateFCMToken(token, 'Web Browser');
              console.log('✓ FCM token updated');
            }

            // Listen for foreground messages
            onMessageListener().then((payload) => {
              console.log('📬 Foreground notification received:', payload);
            });

            // Setup periodic FCM token refresh every 55 minutes
            // (tokens can expire, so we refresh before expiration)
            if (fcmRefreshIntervalRef.current) {
              clearInterval(fcmRefreshIntervalRef.current);
            }

            fcmRefreshIntervalRef.current = setInterval(async () => {
              console.log('🔄 Refreshing FCM token to prevent expiration...');
              try {
                const newToken = await requestFCMToken();
                if (newToken) {
                  await updateFCMToken(newToken, 'Web Browser');
                  console.log('✓ FCM token refreshed successfully');
                }
              } catch (err) {
                console.warn('⚠️ Failed to refresh FCM token:', err.message);
              }
            }, 55 * 60 * 1000); // Every 55 minutes
          }
        } catch (error) {
          // Silently catch permission denied errors
          if (error?.toString().includes('Permission')) {
            console.warn('⚠️ User denied notification permission');
          } else {
            console.error('Error setting up notifications:', error);
          }
        }
      }
    };

    // Only setup notifications once per user
    if (user && !notificationsInitializedRef.current) {
      notificationsInitializedRef.current = true;
      setupNotifications();
    }

    // Reset flag and clear interval when user logs out
    return () => {
      if (!user) {
        notificationsInitializedRef.current = false;
        if (fcmRefreshIntervalRef.current) {
          clearInterval(fcmRefreshIntervalRef.current);
          fcmRefreshIntervalRef.current = null;
        }
      }
    };
  }, [user?.id]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>Loading...</div>;
  }

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Header />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <TaskProvider>
                <DashboardPage />
              </TaskProvider>
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Router>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
