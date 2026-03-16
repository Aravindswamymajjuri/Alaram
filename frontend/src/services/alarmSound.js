// Alarm Sound Service with Web Audio API Fallback
class AlarmSoundService {
  constructor() {
    this.audioElement = null;
    this.isPlaying = false;
    this.audioContext = null;
    this.oscillators = [];
    this.isStopping = false;  // Flag to prevent new oscillators after stop
  }

  // Initialize audio element
  initializeAudio() {
    if (!this.audioElement) {
      this.audioElement = new Audio();
      this.audioElement.loop = true;
      this.audioElement.volume = 0.8; // 80% volume
    }
  }

  // Initialize Web Audio API context
  initializeAudioContext() {
    if (!this.audioContext) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      try {
        this.audioContext = new AudioContext();
        console.log('✅ [AUDIO] AudioContext initialized, state:', this.audioContext.state);
        
        // If context is suspended, try to resume it
        if (this.audioContext.state === 'suspended') {
          console.log('🔓 [AUDIO] AudioContext is suspended, attempting to resume...');
          this.audioContext.resume().then(() => {
            console.log('✅ [AUDIO] AudioContext resumed successfully');
          }).catch(err => {
            console.warn('⚠️ [AUDIO] Could not resume AudioContext:', err);
          });
        }
      } catch (e) {
        console.error('Web Audio API not supported:', e);
      }
    }
  }

  // Generate siren sound using Web Audio API (fallback)
  generateSirenSound() {
    this.initializeAudioContext();
    if (!this.audioContext) return false;

    try {
      const now = this.audioContext.currentTime;

      for (let i = 0; i < 3; i++) {
        const startTime = now + i * 1;

        // Create oscillator
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.frequency.setValueAtTime(800 + i * 400, startTime);
        oscillator.frequency.exponentialRampToValueAtTime(600, startTime + 0.5);

        gainNode.gain.setValueAtTime(0.3, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.1, startTime + 0.5);

        oscillator.start(startTime);
        oscillator.stop(startTime + 0.5);

        this.oscillators.push(oscillator);
      }

      return true;
    } catch (error) {
      console.error('Error generating siren sound:', error);
      return false;
    }
  }

  // Generate notification beep
  generateNotificationBeep() {
    this.initializeAudioContext();
    if (!this.audioContext) return false;

    try {
      const now = this.audioContext.currentTime;
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.frequency.setValueAtTime(800, now);
      gainNode.gain.setValueAtTime(0.3, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

      oscillator.start(now);
      oscillator.stop(now + 0.2);

      this.oscillators.push(oscillator);
      return true;
    } catch (error) {
      console.error('Error generating notification beep:', error);
      return false;
    }
  }

  // Play alarm sound
  playAlarm(soundType = 'default') {
    try {
      console.log(`🔔 PlayAlarm called with type: ${soundType}`);
      
      // Reset stopping flag so new oscillators can be created
      this.isStopping = false;
      
      // Stop any currently playing sound first
      if (this.isPlaying) {
        this.stopAlarm();
      }

      // Try to play using Web Audio API first (more reliable)
      const playedWithWebAudio = this.playWithWebAudioLoop(soundType);
      
      if (playedWithWebAudio) {
        this.isPlaying = true;
        console.log(`✅ Alarm sound playing via Web Audio API (looping): ${soundType}`);
        return;
      }

      // Fallback to HTML5 Audio element if files exist
      this.initializeAudio();
      const soundSources = {
        default: '/sounds/alarm-ring.mp3',
        bell: '/sounds/alarm-bell.mp3',
        siren: '/sounds/alarm-siren.mp3',
        notification: '/sounds/notification.mp3',
      };

      const soundSource = soundSources[soundType] || soundSources.default;
      console.log(`🔔 Sound source: ${soundSource}`);

      if (this.audioElement.src !== soundSource) {
        this.audioElement.src = soundSource;
      }

      this.audioElement.volume = 0.8;
      this.audioElement.currentTime = 0;
      this.audioElement.loop = true;
      
      const playPromise = this.audioElement.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            this.isPlaying = true;
            console.log(`✅ Alarm sound playing from file: ${soundType}`);
          })
          .catch((error) => {
            console.error('⚠️ Error playing alarm sound from file:', error.message);
            // Visual alert as final fallback
            this.visualAlert();
          });
      }
    } catch (error) {
      console.error('❌ Error in playAlarm:', error);
      this.visualAlert();
    }
  }

  // Play sound using Web Audio API with 1+ minute loop (more reliable across browsers)
  playWithWebAudioLoop(soundType = 'siren') {
    console.log('🔊 [AUDIO] Attempting to play with Web Audio API (looping for 1+ min):', soundType);
    
    // Prevent oscillators from being created if stop was called
    if (this.isStopping) {
      console.log('⏹️ [AUDIO] Stop was called, aborting new oscillators');
      return false;
    }
    
    this.initializeAudioContext();
    if (!this.audioContext) {
      console.error('❌ [AUDIO] AudioContext not available');
      return false;
    }

    try {
      // Resume context if suspended (for browser autoplay policies)
      if (this.audioContext.state === 'suspended') {
        console.log('🔓 [AUDIO] Resuming suspended AudioContext...');
        this.audioContext.resume().then(() => {
          console.log('✅ [AUDIO] AudioContext resumed');
        });
      }

      const now = this.audioContext.currentTime;
      console.log('🎵 [AUDIO] AudioContext current time:', now, 'State:', this.audioContext.state);
      
      // Duration for continuous loop: 70 seconds (1 minute + 10 seconds buffer)
      const loopDuration = 70;
      
      // Generate repeating siren patterns for 70 seconds
      console.log(`🚨 [AUDIO] Generating ${loopDuration}s repeating ${soundType} pattern...`);
      
      // Create multiple cycles of the alarm pattern
      for (let cycle = 0; cycle < loopDuration; cycle += 3) {
        // Check again inside loop to prevent partial creation
        if (this.isStopping) {
          console.log('⏹️ [AUDIO] Stop called during oscillator creation, halting...');
          break;
        }
        
        if (soundType === 'siren') {
          // Generate siren-like sound pattern
          for (let i = 0; i < 2; i++) {
            const startTime = now + cycle + i * 0.5;
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            // Vary frequency for siren effect
            oscillator.frequency.setValueAtTime(800 + i * 400, startTime);
            oscillator.frequency.exponentialRampToValueAtTime(600, startTime + 0.4);

            gainNode.gain.setValueAtTime(0.4, startTime);
            gainNode.gain.exponentialRampToValueAtTime(0.1, startTime + 0.4);

            oscillator.start(startTime);
            oscillator.stop(startTime + 0.4);

            this.oscillators.push(oscillator);
          }
        } else {
          // Default beep pattern repeated
          for (let i = 0; i < 3; i++) {
            const startTime = now + cycle + i * 0.3;
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.frequency.setValueAtTime(1000, startTime);
            gainNode.gain.setValueAtTime(0.3, startTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2);

            oscillator.start(startTime);
            oscillator.stop(startTime + 0.2);

            this.oscillators.push(oscillator);
          }
        }
      }
      console.log(`✅ [AUDIO] ${soundType} pattern generated, oscillators: ${this.oscillators.length}, duration: ${loopDuration}s`);
      
      return true;
    } catch (error) {
      console.error('❌ [AUDIO] Error with Web Audio API:', error);
      console.error('Error details:', error.message, error.stack);
      return false;
    }
  }

  // Stop alarm sound
  stopAlarm() {
    try {
      console.log('🛑 [ALARM] Stopping all alarm sounds...');
      
      // Set flag to prevent new oscillators from being created
      this.isStopping = true;
      
      // Stop HTML5 audio element
      if (this.audioElement) {
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
        console.log('✅ [ALARM] HTML5 audio stopped');
      }
      
      // Stop all Web Audio API oscillators immediately
      if (this.oscillators && this.oscillators.length > 0) {
        console.log(`🛑 [ALARM] Stopping ${this.oscillators.length} oscillators...`);
        this.oscillators.forEach((osc, index) => {
          try {
            // Try to stop the oscillator
            if (osc && typeof osc.stop === 'function') {
              osc.stop();
              console.log(`✅ [ALARM] Oscillator ${index} stopped`);
            }
          } catch (e) {
            console.log(`ℹ️ [ALARM] Oscillator ${index} already stopped or error:`, e.message);
          }
        });
        // Clear the oscillators array
        this.oscillators = [];
      }
      
      // Close audio context if it's running
      if (this.audioContext && this.audioContext.state !== 'closed') {
        try {
          // Don't close the context, just pause oscillators
          console.log('✅ [ALARM] Audio context preserved');
        } catch (e) {
          console.warn('[ALARM] Error handling audio context:', e);
        }
      }
      
      this.isPlaying = false;
      console.log('✅ [ALARM] Alarm completely stopped');
    } catch (error) {
      console.error('❌ [ALARM] Error stopping alarm sound:', error);
    }
  }

  // Play notification sound (single beep)
  playNotificationSound() {
    try {
      this.initializeAudio();
      this.audioElement.src = '/sounds/notification.mp3';
      this.audioElement.loop = false;
      this.audioElement.currentTime = 0;
      this.audioElement
        .play()
        .catch((error) => {
          console.error('Error playing notification sound from file:', error);
          // Fallback to Web Audio API
          this.generateNotificationBeep();
        });
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }

  // Visual alert fallback
  visualAlert() {
    console.warn('⚠️ Audio playback not available, displaying visual alert');
    // Trigger visual notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Alarm Reminder', {
        body: 'Your alarm is ringing!',
        icon: '/logo.png',
        tag: 'alarm-notification',
        requireInteraction: true,
      });
    }
  }

  // Request notification permission
  static async requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      } catch (error) {
        console.error('Error requesting notification permission:', error);
        return false;
      }
    }
    return Notification.permission === 'granted';
  }

  // Set volume (0-1)
  setVolume(volume) {
    this.initializeAudio();
    this.audioElement.volume = Math.max(0, Math.min(1, volume));
  }

  // Get current state
  getState() {
    return {
      isPlaying: this.isPlaying,
      volume: this.audioElement ? this.audioElement.volume : 0.8,
    };
  }
}

// Create singleton instance
const alarmSoundService = new AlarmSoundService();

export default alarmSoundService;
