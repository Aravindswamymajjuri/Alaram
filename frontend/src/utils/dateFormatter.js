/**
 * Get current system time in 12-hour format (e.g., "2:19 PM")
 */
export const getCurrentTime12Hour = () => {
  const date = new Date();
  const options = {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  };
  return new Intl.DateTimeFormat('en-US', options).format(date);
};

/**
 * Get system timezone name (e.g., "IST", "EST", "PST")
 */
export const getSystemTimezone = () => {
  const date = new Date();
  const timeZoneName = new Intl.DateTimeFormat('en-US', {
    timeZoneName: 'short',
  })
    .formatToParts(date)
    .find((part) => part.type === 'timeZoneName');
  return timeZoneName ? timeZoneName.value : 'UTC';
};

/**
 * Get timezone offset in readable format (e.g., "UTC+5:30")
 */
export const getTimezoneOffset = () => {
  const date = new Date();
  const offset = -date.getTimezoneOffset();
  const hours = Math.floor(Math.abs(offset) / 60);
  const minutes = Math.abs(offset) % 60;
  const sign = offset >= 0 ? '+' : '-';
  return `UTC${sign}${hours}:${minutes.toString().padStart(2, '0')}`;
};

/**
 * Format UTC datetime to user's local timezone
 * @param {string|Date} utcDate - UTC date from server
 * @returns {string} Formatted date string in user's local timezone (e.g., "16/3/2026, 1:53 PM")
 */
export const formatAlarmTime = (utcDate) => {
  if (!utcDate) return '';
  
  const date = new Date(utcDate);
  
  // Format options for local timezone (omit timeZone to use browser's local timezone)
  const options = {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  };
  
  return new Intl.DateTimeFormat('en-US', options).format(date);
};

/**
 * Format UTC datetime to short time format (e.g., "1:53 PM")
 */
export const formatTimeOnly = (utcDate) => {
  if (!utcDate) return '';
  
  const date = new Date(utcDate);
  
  const options = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  };
  
  return new Intl.DateTimeFormat('en-US', options).format(date);
};

/**
 * Format UTC datetime to date and time separately
 */
export const formatAlarmTimeSeparate = (utcDate) => {
  if (!utcDate) return { date: '', time: '' };
  
  const date = new Date(utcDate);
  
  const dateOptions = {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  };
  
  const timeOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  };
  
  return {
    date: new Intl.DateTimeFormat('en-US', dateOptions).format(date),
    time: new Intl.DateTimeFormat('en-US', timeOptions).format(date),
  };
};

/**
 * Format UTC datetime to IST (Asia/Kolkata) 12-hour format
 * ALWAYS displays in IST regardless of browser timezone
 * Used for displaying alarm times consistently
 */
export const formatAlarmTimeIST12Hour = (utcDate) => {
  if (!utcDate) return '';
  
  const date = new Date(utcDate);
  
  // Use Intl API with explicit timezone to ensure IST display
  const formatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata', // Always show IST
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  
  return formatter.format(date);
};

/**
 * Format UTC datetime to 12-hour format for alarm display (e.g., "2:19 PM")
 * Used for alarm notifications and alarm time selector
 */
export const formatAlarmTime12Hour = (utcDate) => {
  if (!utcDate) return '';
  
  const date = new Date(utcDate);
  
  const options = {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  };
  
  return new Intl.DateTimeFormat('en-US', options).format(date);
};

/**
 * Format UTC datetime to short 12-hour time format (e.g., "2:19 PM")
 */
export const formatTimeOnly12Hour = (utcDate) => {
  if (!utcDate) return '';
  
  const date = new Date(utcDate);
  
  const options = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  };
  
  return new Intl.DateTimeFormat('en-US', options).format(date);
};
