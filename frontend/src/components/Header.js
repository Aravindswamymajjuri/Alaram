import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { BrandLogo, LogOut, LogIn, UserPlus } from './Icons';
import '../styles/header.css';

export const Header = ({ notificationSlot }) => {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useContext(AuthContext);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const formatTime = (date) => {
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const hoursStr = String(hours).padStart(2, '0');
    return `${hoursStr}:${minutes}:${seconds} ${ampm}`;
  };

  return (
    <header className="app-header">
      <div className="header-left">
        <div className="header-logo-icon">
          <BrandLogo size={22} />
        </div>
        <h1 className="app-title">Alarm Reminder</h1>
      </div>

      <div className="header-center">
        <div className="header-clock">
          <span className="header-clock-dot"></span>
          <span>{formatTime(currentTime)} GMT+5:30</span>
        </div>
      </div>

      <nav className="header-nav">
        {isAuthenticated ? (
          <div className="auth-section logged-in">
            <span className="user-name">{user?.name}</span>
            {notificationSlot}
            <button className="btn-logout" onClick={handleLogout} title="Logout">
              <LogOut size={15} />
              <span className="btn-text">Logout</span>
            </button>
          </div>
        ) : (
          <div className="auth-section logged-out">
            <button
              className="btn-login"
              onClick={() => navigate('/login')}
              aria-label="Go to login page"
              title="Login"
            >
              <LogIn size={15} />
              <span className="btn-text">Login</span>
            </button>
            <button
              className="btn-signup"
              onClick={() => navigate('/register')}
              aria-label="Go to sign up page"
              title="Sign Up"
            >
              <UserPlus size={15} />
              <span className="btn-text">Sign Up</span>
            </button>
          </div>
        )}
      </nav>
    </header>
  );
};
