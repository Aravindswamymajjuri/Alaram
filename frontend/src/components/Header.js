import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { getCurrentTime12Hour, getSystemTimezone } from '../utils/dateFormatter';
import '../styles/header.css';

export const Header = () => {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useContext(AuthContext);
  const [currentTime, setCurrentTime] = useState(getCurrentTime12Hour());

  useEffect(() => {
    // Update time every second
    const timer = setInterval(() => {
      setCurrentTime(getCurrentTime12Hour());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const timezone = getSystemTimezone();

  return (
    <header className="app-header">
      <div className="header-container">
        <div className="header-left">
          <h1 className="app-title">🔔 Alarm Reminder</h1>
          <span className="timezone-info">🕐 {currentTime} | 🌍 {timezone}</span>
        </div>

        <nav className="header-nav">
          {isAuthenticated ? (
            <div className="auth-section logged-in">
              <span className="user-name">Welcome, {user?.name}</span>
              <button className="btn-logout" onClick={handleLogout}>
                Logout
              </button>
            </div>
          ) : (
            <div className="auth-section logged-out">
              <button
                className="btn-login"
                onClick={() => navigate('/login')}
              >
                Login
              </button>
              <button
                className="btn-signup"
                onClick={() => navigate('/register')}
              >
                Sign Up
              </button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};
