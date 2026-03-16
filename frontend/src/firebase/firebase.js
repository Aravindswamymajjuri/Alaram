import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging
const messaging = getMessaging(app);

// Request permission and get FCM token
export const requestFCMToken = async () => {
  try {
    // Check current permission status
    const currentPermission = Notification.permission;
    
    // If already denied, don't try to request again
    if (currentPermission === 'denied') {
      console.warn('Notifications are denied. User can reset in browser settings.');
      return null;
    }

    // If already granted, just get the token
    if (currentPermission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: process.env.REACT_APP_FIREBASE_VAPID_KEY,
      });
      console.log('✓ FCM Token obtained');
      return token;
    }

    // Request permission (only if status is 'default')
    const permission = await Notification.requestPermission();

    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: process.env.REACT_APP_FIREBASE_VAPID_KEY,
      });
      console.log('✓ FCM Token obtained');
      return token;
    } else {
      console.warn('Notification permission denied by user');
      return null;
    }
  } catch (error) {
    // Silently handle permission errors
    if (error?.toString().includes('Permission')) {
      console.warn('Notification permission issue:', error.message);
      return null;
    }
    console.error('Error getting FCM token:', error);
    return null;
  }
};

// Listen for foreground messages
export const onMessageListener = () => {
  return new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      console.log('Message received in foreground:', payload);
      resolve(payload);
    });
  });
};

export { messaging, app };
