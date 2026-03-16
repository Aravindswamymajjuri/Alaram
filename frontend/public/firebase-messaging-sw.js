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

console.log('[SERVICE WORKER] Firebase Cloud Messaging Service Worker initialized');

// Helper to play alarm sound via Web Audio API in service worker
const playAlarmSound = async () => {
  try {
    // Get all clients to trigger sound (including hidden ones)
    const clients = await self.clients.matchAll({ 
      type: 'window', 
      includeUncontrolled: true 
    });
    
    console.log(`🔊 [SERVICE WORKER] Found ${clients.length} clients to notify`);
    
    for (const client of clients) {
      client.postMessage({
        type: 'PLAY_ALARM_SOUND',
        timestamp: new Date().toISOString(),
      });
    }
    
    if (clients.length === 0) {
      console.warn('⚠️ [SERVICE WORKER] No clients available to trigger sound');
    } else {
      console.log('✅ [SERVICE WORKER] Alarm sound trigger sent to', clients.length, 'client(s)');
    }
  } catch (error) {
    console.error('❌ [SERVICE WORKER] Error triggering alarm sound:', error);
  }
};

// Handle background messages
function handleBackgroundMessage(payload) {
  console.log('📬 [SERVICE WORKER] Background message received:', payload);

  const notificationTitle = payload.notification?.title || 'Alarm Reminder';
  const notificationBody = payload.notification?.body || 'You have a new notification';
  const taskId = payload.data?.taskId || 'alarm-notification';
  
  // Enhanced notification options for mobile with high priority
  const notificationOptions = {
    body: notificationBody,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: taskId,
    data: payload.data || {},
    requireInteraction: true,  // CRITICAL: Keep notification visible until user interacts
    priority: 'high',  // High priority for mobile notification delivery
    vibrate: [200, 100, 200],  // Vibration pattern for mobile
    actions: [
      {
        action: 'open',
        title: 'Open Task',
        icon: '/favicon.ico',
      },
      {
        action: 'close',
        title: 'Dismiss',
        icon: '/favicon.ico',
      },
    ],
  };

  console.log('🔔 [SERVICE WORKER] Showing notification with options:', notificationOptions);

  // Show notification and trigger alarm sound
  const notificationPromise = self.registration.showNotification(notificationTitle, notificationOptions);

  notificationPromise
    .then(async () => {
      console.log('✅ [SERVICE WORKER] Notification shown successfully:', notificationTitle);
      // Give user a moment to see notification before playing sound
      await new Promise(resolve => setTimeout(resolve, 500));
      await playAlarmSound();
    })
    .catch((error) => {
      console.error('❌ [SERVICE WORKER] Error showing notification:', error);
    });

  return notificationPromise;
}

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  return handleBackgroundMessage(payload);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SERVICE WORKER] Notification clicked:', event.notification, 'Action:', event.action);

  event.notification.close();

  // Handle different actions
  if (event.action === 'close') {
    return;
  }

  // Handle click action or default click
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      console.log(`[SERVICE WORKER] Found ${clientList.length} windows`);
      
      // Check if there's already a window/tab open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        console.log(`[SERVICE WORKER] Checking window: ${client.url}`);
        if (client.url.includes('dashboard') || client.url.includes('localhost') || client.url.includes('vercel.app')) {
          console.log('[SERVICE WORKER] Focusing existing window');
          return client.focus();
        }
      }
      
      // If no window is found, open a new one
      console.log('[SERVICE WORKER] Opening new dashboard window');
      if (clients.openWindow) {
        return clients.openWindow('/dashboard');
      }
    })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('[SERVICE WORKER] Notification closed:', event.notification);
});

// Respond to messages from clients
self.addEventListener('message', (event) => {
  console.log('[SERVICE WORKER] Message received from client:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
