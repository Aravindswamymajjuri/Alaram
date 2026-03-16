import io from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

let socket = null;
let listeners = {};

export const connectSocket = (userId) => {
  if (socket && socket.connected) {
    console.log('✅ Socket already connected');
    return socket;
  }

  if (!socket) {
    socket = io(SOCKET_URL, {
      auth: {
        token: localStorage.getItem('token'),
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      console.log('✅ Connected to Socket.io');
      socket.emit('join:user', userId);
      console.log(`📍 Joined user room: ${userId}`);
    });

    socket.on('disconnect', () => {
      console.log('❌ Disconnected from Socket.io');
    });

    socket.on('connect_error', (error) => {
      console.error('⚠️ Socket connection error:', error);
    });
  }

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    listeners = {};
  }
};

export const getSocket = () => socket;

export const onTaskCompleted = (callback) => {
  if (socket) {
    // Remove old listener if exists
    if (listeners.taskCompleted) {
      socket.off('task:completed', listeners.taskCompleted);
    }
    // Register new listener
    listeners.taskCompleted = callback;
    socket.on('task:completed', callback);
  }
};

export const onTaskUpdated = (callback) => {
  if (socket) {
    if (listeners.taskUpdated) {
      socket.off('task:updated', listeners.taskUpdated);
    }
    listeners.taskUpdated = callback;
    socket.on('task:updated', callback);
  }
};

export const onAlarmRinging = (callback) => {
  console.log('🔔 [SOCKET] Registering alarm:ringing listener...');
  if (socket) {
    if (listeners.alarmRinging) {
      console.log('🔔 [SOCKET] Removing old alarm:ringing listener');
      socket.off('alarm:ringing', listeners.alarmRinging);
    }
    listeners.alarmRinging = callback;
    socket.on('alarm:ringing', (data) => {
      console.log('🔴 [SOCKET] alarm:ringing event received:', data);
      callback(data);
    });
    console.log('✅ [SOCKET] alarm:ringing listener registered successfully');
  } else {
    console.error('❌ [SOCKET] Socket not connected, cannot register alarm:ringing listener');
  }
};

export const onAlarmStopped = (callback) => {
  console.log('🛑 [SOCKET] Registering alarm:stopped listener...');
  if (socket) {
    if (listeners.alarmStopped) {
      console.log('🛑 [SOCKET] Removing old alarm:stopped listener');
      socket.off('alarm:stopped', listeners.alarmStopped);
    }
    listeners.alarmStopped = callback;
    socket.on('alarm:stopped', (data) => {
      console.log('🛑 [SOCKET] alarm:stopped event received:', data);
      callback(data);
    });
    console.log('✅ [SOCKET] alarm:stopped listener registered successfully');
  } else {
    console.error('❌ [SOCKET] Socket not connected, cannot register alarm:stopped listener');
  }
};

export const onNotificationReceived = (callback) => {
  if (socket) {
    if (listeners.notificationReceived) {
      socket.off('notification:new', listeners.notificationReceived);
    }
    listeners.notificationReceived = callback;
    socket.on('notification:new', callback);
  }
};

export const emitTaskCompleted = (taskData) => {
  if (socket) {
    socket.emit('task:completed', taskData);
  }
};

export const emitAlarmStopped = (alarmData) => {
  console.log('📢 [SOCKET] Emitting alarm:stopped event:', alarmData);
  if (socket) {
    socket.emit('alarm:stopped', alarmData);
  } else {
    console.error('❌ [SOCKET] Socket not connected, cannot emit alarm:stopped');
  }
};

const socketModule = {
  connectSocket,
  disconnectSocket,
  getSocket,
  onTaskCompleted,
  onTaskUpdated,
  onAlarmRinging,
  onAlarmStopped,
  onNotificationReceived,
  emitTaskCompleted,
  emitAlarmStopped,
};

export default socketModule;
