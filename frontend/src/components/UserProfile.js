import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { userApi } from '../services/api';
import { User, Bell, Check } from './Icons';
import '../styles/components.css';

export const UserProfile = () => {
  const { user, updateProfile } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    notificationPreferences: user?.notificationPreferences || {
      emailNotifications: true,
      pushNotifications: true,
      soundEnabled: true,
    },
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name.startsWith('pref_')) {
      const prefName = name.replace('pref_', '');
      setFormData((prev) => ({
        ...prev,
        notificationPreferences: {
          ...prev.notificationPreferences,
          [prefName]: checked,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      await updateProfile(formData);
      setMessage('Profile updated successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-container">
      <div className="profile-card">
        <h2><User size={20} /> My Profile</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={user?.email}
              disabled
            />
          </div>

          <div className="form-group">
            <h3><Bell size={16} /> Notification Preferences</h3>

            <label className="preference-checkbox">
              <input
                type="checkbox"
                name="pref_pushNotifications"
                checked={formData.notificationPreferences.pushNotifications}
                onChange={handleChange}
              />
              <span>Enable push notifications</span>
            </label>

            <label className="preference-checkbox">
              <input
                type="checkbox"
                name="pref_emailNotifications"
                checked={formData.notificationPreferences.emailNotifications}
                onChange={handleChange}
              />
              <span>Enable email notifications</span>
            </label>

            <label className="preference-checkbox">
              <input
                type="checkbox"
                name="pref_soundEnabled"
                checked={formData.notificationPreferences.soundEnabled}
                onChange={handleChange}
              />
              <span>Enable notification sound</span>
            </label>
          </div>

          {message && (
            <div className={message.includes('Error') ? 'error-message' : 'success-message'}>
              {message}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Saving...' : <>
              <Check size={16} /> Save Changes
            </>}
          </button>
        </form>
      </div>
    </div>
  );
};
