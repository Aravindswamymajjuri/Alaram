import React, { useEffect, useState } from 'react';
import { Smartphone, Bell, AlertTriangle, Check, X } from './Icons';

export const NotificationDiagnostics = () => {
  const [status, setStatus] = useState({
    serviceWorker: 'checking',
    notification: 'checking',
    fcmToken: 'checking',
    isMobile: false,
    isIOS: false,
    isAndroid: false,
    isPWA: false,
    displayMode: 'unknown',
    isStandalone: false,
  });
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      // Mobile detection
      const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
        navigator.userAgent.toLowerCase()
      );
      const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const isAndroid = /android/i.test(navigator.userAgent);

      // Multiple PWA detection methods
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
      const isStandaloneNav = window.navigator.standalone === true;
      const isFullscreenMode = window.matchMedia('(display-mode: fullscreen)').matches;
      const isPWA = isStandaloneMode || isStandaloneNav || isFullscreenMode;

      // Determine display mode
      let displayMode = 'browser';
      if (window.matchMedia('(display-mode: standalone)').matches) displayMode = 'standalone';
      else if (window.matchMedia('(display-mode: fullscreen)').matches) displayMode = 'fullscreen';
      else if (window.matchMedia('(display-mode: minimal-ui)').matches) displayMode = 'minimal-ui';

      // Service Worker
      let swStatus = 'not-supported';
      if ('serviceWorker' in navigator) {
        try {
          const regs = await navigator.serviceWorker.getRegistrations();
          swStatus = regs.length > 0 ? 'registered' : 'not-registered';
        } catch (err) {
          swStatus = 'error';
        }
      }

      // Notification permission
      let notifStatus = 'not-supported';
      if ('Notification' in window) {
        notifStatus = Notification.permission;
      }

      // FCM Token (check localStorage for now)
      const fcmToken = localStorage.getItem('fcmToken');
      let fcmStatus = fcmToken ? 'stored' : 'not-stored';

      setStatus({
        serviceWorker: swStatus,
        notification: notifStatus,
        fcmToken: fcmStatus,
        isMobile,
        isIOS,
        isAndroid,
        isPWA,
        displayMode,
        isStandalone: isStandaloneMode || isStandaloneNav,
      });

      console.log('PWA Diagnostics:', { isPWA, displayMode, isStandalone: isStandaloneMode || isStandaloneNav });
    };

    checkStatus();

    // Listen for display mode changes
    const mediaQueryList = window.matchMedia('(display-mode: standalone)');
    mediaQueryList.addEventListener('change', checkStatus);

    return () => {
      mediaQueryList.removeEventListener('change', checkStatus);
    };
  }, []);

  // Only show for mobile devices in development
  if (!status.isMobile) return null;

  const getStatusColor = (value) => {
    if (value === 'granted' || value === 'registered' || value === 'stored') return '#10B981';
    if (value === 'denied' || value === 'error' || value === 'not-registered') return '#EF4444';
    return '#F26B35';
  };

  const getStatusIcon = (value) => {
    if (value === 'granted' || value === 'registered' || value === 'stored') return <Check size={12} />;
    if (value === 'denied' || value === 'error' || value === 'not-registered') return <X size={12} />;
    return <AlertTriangle size={12} />;
  };

  const getStatusText = (value) => {
    if (value === 'granted') return 'Granted';
    if (value === 'registered') return 'Registered';
    if (value === 'stored') return 'Stored';
    if (value === 'denied') return 'Denied';
    if (value === 'default') return 'Default (not requested)';
    if (value === 'not-registered') return 'Not Registered';
    if (value === 'not-stored') return 'Not Stored';
    return value;
  };

  return (
    <>
      {/* Toggle Button - Always visible */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          backgroundColor: '#F26B35',
          border: 'none',
          color: 'white',
          fontSize: '24px',
          cursor: 'pointer',
          zIndex: 9998,
          boxShadow: '0 4px 12px rgba(242, 107, 53, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s ease',
          ...(isOpen && { opacity: 0, pointerEvents: 'none' })
        }}
        title="Toggle notification status"
      >
        <Bell size={22} />
      </button>

      {/* Status Panel - Shows when open */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          maxWidth: '320px',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E3DE',
          borderRadius: '16px',
          padding: '16px',
          fontSize: '13px',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          zIndex: 9999,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          animation: 'slideIn 0.3s ease',
        }}>
          {/* Close Button */}
          <button
            onClick={() => setIsOpen(false)}
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              backgroundColor: '#F5F4F1',
              border: 'none',
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6B6860',
              transition: 'all 0.2s',
            }}
            title="Close status"
          >
            <X size={16} />
          </button>

          <div style={{ fontWeight: 700, marginBottom: '12px', color: '#1C1B18', paddingRight: '30px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Smartphone size={18} /> App Status
          </div>

          <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#9B9890' }}>Device</span>
            <span style={{ fontWeight: 600 }}>{status.isAndroid ? 'Android' : status.isIOS ? 'iOS' : 'Unknown'}</span>
          </div>

          <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#9B9890' }}>Display Mode</span>
            <span style={{ color: status.isStandalone ? '#10B981' : '#F26B35', fontWeight: 600 }}>
              {status.displayMode.toUpperCase()}
            </span>
          </div>

          <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#9B9890' }}>PWA Mode</span>
            <span style={{ color: status.isPWA ? '#10B981' : '#F26B35', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              {status.isPWA ? <><Check size={14} /> YES</> : <><X size={14} /> NO</>}
            </span>
          </div>

          <hr style={{ margin: '10px 0', border: 'none', borderTop: '1px solid #EEECEA' }} />

          <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#9B9890' }}>Service Worker</span>
            <span style={{ color: getStatusColor(status.serviceWorker), fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              {getStatusIcon(status.serviceWorker)} {getStatusText(status.serviceWorker)}
            </span>
          </div>

          <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#9B9890' }}>Notifications</span>
            <span style={{ color: getStatusColor(status.notification), fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              {getStatusIcon(status.notification)} {getStatusText(status.notification)}
            </span>
          </div>

          <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#9B9890' }}>FCM Token</span>
            <span style={{ color: getStatusColor(status.fcmToken), fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              {getStatusIcon(status.fcmToken)} {getStatusText(status.fcmToken)}
            </span>
          </div>

          {status.isIOS && (
            <div style={{ marginTop: '10px', padding: '10px 12px', backgroundColor: '#FFF7ED', borderRadius: '10px', color: '#C2410C', fontSize: '12px', display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
              <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
              <span><strong>iOS:</strong> Background notifications require native app or PWA on home screen.</span>
            </div>
          )}

          {status.isMobile && !status.isPWA && status.displayMode === 'browser' && (
            <div style={{ marginTop: '10px', padding: '10px 12px', backgroundColor: '#EFF6FF', borderRadius: '10px', color: '#1E40AF', fontSize: '12px', display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
              <Smartphone size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
              <span><strong>Install:</strong> Add to home screen or use "Install" option in menu for PWA mode.</span>
            </div>
          )}

          {status.isPWA && status.notification !== 'granted' && (
            <div style={{ marginTop: '10px', padding: '10px 12px', backgroundColor: '#FFF1F2', borderRadius: '10px', color: '#BE123C', fontSize: '12px', display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
              <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
              <span><strong>Enable notifications</strong> to receive background alarms.</span>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </>
  );
};
