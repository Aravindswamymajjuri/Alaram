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
      // Store token in localStorage for diagnostics
      localStorage.setItem('fcmToken', token);
      return token;
    }

    // Request permission (only if status is 'default')
    const permission = await Notification.requestPermission();

    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: process.env.REACT_APP_FIREBASE_VAPID_KEY,
      });
      console.log('✓ FCM Token obtained');
      // Store token in localStorage for diagnostics
      localStorage.setItem('fcmToken', token);
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

// Request notification permission on app load (for mobile + desktop)
export const requestNotificationPermissionOnAppLoad = async () => {
  try {
    // Detect mobile
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent.toLowerCase());
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    
    // iOS Safari doesn't support Web Push API
    if (isIOS) {
      console.warn('[FCM] iOS detected - Web Push API not supported in Safari. Foreground notifications only.');
      return false;
    }
    
    // Skip if notifications not supported
    if (!('Notification' in window)) {
      console.warn('[FCM] Notifications not supported');
      return false;
    }

    const permission = Notification.permission;
    console.log('[FCM] Current permission:', permission, '| Mobile:', isMobile);
    
    if (permission === 'denied') {
      console.warn('[FCM] Notifications are permanently denied');
      return false;
    }

    if (permission === 'granted') {
      console.log('✓ Notifications already permitted');
      return true;
    }

    // Request permission (status is 'default')
    console.log('[FCM] Requesting notification permission...');
    const result = await Notification.requestPermission();
    console.log('[FCM] Permission result:', result);
    return result === 'granted';
  } catch (error) {
    console.warn('[FCM] Error requesting permission:', error);
    return false;
  }
};

// Listen for foreground messages and handle sound + notifications
export const setupForegroundMessageHandler = () => {
  try {
    onMessage(messaging, (payload) => {
      console.log('📱 [FIREBASE] Foreground message received:', payload);
      
      const title = payload.notification?.title || 'Alarm Reminder';
      const body = payload.notification?.body || 'You have a new notification';
      const data = payload.data || {};

      // Show notification with sound
      if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification(title, {
          body: body,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: data.taskId || 'alarm-notification',
          requireInteraction: true,
          sound: '/sounds/notification.mp3',
          data: data,
        });

        // Play sound immediately
        playNotificationSound();

        notification.onclick = () => {
          window.focus();
          notification.close();
          // Navigate to dashboard if needed
          if (data.taskId) {
            window.location.href = '/dashboard';
          }
        };

        console.log('✅ [FIREBASE] Foreground notification shown with sound:', title);
      }

      return payload;
    });

    console.log('✅ [FIREBASE] Foreground message handler registered');
  } catch (error) {
    console.warn('⚠️ [FIREBASE] Error setting up foreground handler:', error.message);
  }
};

// Play notification sound using multiple methods
const playNotificationSound = () => {
  try {
    // Method 1: Try to play from file
    const audio = new Audio('/sounds/notification.mp3');
    audio.volume = 0.8;
    
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          console.log('🔊 [FIREBASE] Notification sound playing from file');
        })
        .catch((err) => {
          console.warn('⚠️ Could not play from file:', err.message);
          // Fallback to Web Audio API siren
          playSirenSound();
        });
    }
  } catch (error) {
    console.warn('⚠️ Error playing sound file, using fallback:', error.message);
    playSirenSound();
  }
};

// Generate and play siren sound using Web Audio API
const playSirenSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioContext();

    // Create two frequency sweeps for alarm effect
    for (let cycle = 0; cycle < 3; cycle++) {
      const startTime = audioContext.currentTime + cycle * 1;

      // High frequency tone
      const osc1 = audioContext.createOscillator();
      const gain1 = audioContext.createGain();

      osc1.connect(gain1);
      gain1.connect(audioContext.destination);

      osc1.frequency.setValueAtTime(800, startTime);
      osc1.frequency.exponentialRampToValueAtTime(600, startTime + 0.4);

      gain1.gain.setValueAtTime(0.3, startTime);
      gain1.gain.exponentialRampToValueAtTime(0.05, startTime + 0.4);

      osc1.start(startTime);
      osc1.stop(startTime + 0.4);

      // Low frequency tone for richness
      const osc2 = audioContext.createOscillator();
      const gain2 = audioContext.createGain();

      osc2.connect(gain2);
      gain2.connect(audioContext.destination);

      osc2.frequency.setValueAtTime(400, startTime);
      osc2.frequency.exponentialRampToValueAtTime(300, startTime + 0.4);

      gain2.gain.setValueAtTime(0.2, startTime);
      gain2.gain.exponentialRampToValueAtTime(0.03, startTime + 0.4);

      osc2.start(startTime);
      osc2.stop(startTime + 0.4);
    }

    console.log('🔊 [FIREBASE] Alarm siren sound generated via Web Audio API');
  } catch (error) {
    console.warn('⚠️ Could not generate siren sound:', error.message);
  }
};

export { messaging, app };
