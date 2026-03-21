import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bell } from './Icons';
import '../styles/navbar.css';

export const Navbar = ({ isAuthenticated, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // Hide navbar on login and register pages
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
  if (isAuthPage) return null;

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <div className="navbar-logo-icon"><Bell size={18} /></div>
        <div className="navbar-brand">Alarm Reminder</div>
      </div>

      <div className="navbar-center">
        <div className="navbar-clock">
          <span className="navbar-clock-dot"></span>
          <span>{formatTime(currentTime)} GMT+5:30</span>
        </div>
      </div>

      <div className="navbar-right">
        {!isAuthenticated ? (
          <>
            <button
              className="btn-outline"
              onClick={() => navigate('/login')}
              aria-label="Go to login page"
            >
              Login
            </button>
            <button
              className="btn-primary"
              onClick={() => navigate('/register')}
              aria-label="Go to sign up page"
            >
              Sign Up
            </button>
          </>
        ) : (
          <button
            className="btn-outline"
            onClick={onLogout}
            aria-label="Logout from account"
          >
            Logout
          </button>
        )}
      </div>
    </nav>
  );
};
