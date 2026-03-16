// Firebase Cloud Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// Initialize Firebase with correct config
// These values are automatically populated at build time
const firebaseConfig = {
  apiKey: 'AIzaSyAfDzoLt-7C-GEutTViNHT7IAdEy2Ar410',
  authDomain: 'alaram-3b961.firebaseapp.com',
  projectId: 'alaram-3b961',
  storageBucket: 'alaram-3b961.firebasestorage.app',
  messagingSenderId: '555545097348',
  appId: '1:555545097348:web:29fb159186fec7b6ecbed1',
};

firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('📬 Background message received:', payload);

  const notificationTitle = payload.notification?.title || 'Alarm Reminder';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: payload.data?.taskId || 'alarm-notification',
    data: payload.data || {},
    requireInteraction: true,
  };

  // Show notification
  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification clicked:', event.notification);

  event.notification.close();

  // Handle click action
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Check if there's already a window/tab open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      // If no window is found, open a new one
      if (clients.openWindow) {
        return clients.openWindow('/dashboard');
      }
    })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('[firebase-messaging-sw.js] Notification closed:', event.notification);
});
