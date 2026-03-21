import React, { useContext, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { BrandLogo, Eye, EyeOff, AlertTriangle, User, Mail } from '../components/Icons';
import '../styles/auth.css';

export const RegisterPage = () => {
  const { register, loading, error } = useContext(AuthContext);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [localError, setLocalError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Simple email validation
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Password validation
  const validatePassword = (password) => {
    return password.length >= 8;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Real-time email validation
    if (name === 'email' && value) {
      if (!validateEmail(value)) {
        setEmailError('Please enter a valid email address');
      } else {
        setEmailError('');
      }
    }

    // Real-time password validation
    if ((name === 'password' || name === 'confirmPassword') && formData.password && formData.confirmPassword) {
      if (formData.password !== value && name === 'confirmPassword') {
        setPasswordError('Passwords do not match');
      } else if (name === 'confirmPassword' && formData.password === value) {
        setPasswordError('');
      } else if (name === 'password' && formData.confirmPassword && formData.confirmPassword !== value) {
        setPasswordError('Passwords do not match');
      } else if (name === 'password' && !validatePassword(value)) {
        setPasswordError('Password must be at least 8 characters');
      } else {
        setPasswordError('');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    // Validate all fields
    if (!validateEmail(formData.email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    if (!validatePassword(formData.password)) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    try {
      await register(
        formData.name,
        formData.email,
        formData.password,
        formData.confirmPassword
      );
      navigate('/dashboard');
    } catch (err) {
      setLocalError(err.message);
    }
  };

  const handleGoogleSignUp = () => {
    console.log('Google signup clicked');
    setLocalError('Google signup coming soon');
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="card-header">
          {/* <div className="card-icon"><BrandLogo size={28} /></div> */}
          <h1>Join us</h1>
          <p className="subtitle">Create your alarm reminder account</p>
        </div>

        <div className="card-divider"></div>

        <form onSubmit={handleSubmit}>
          {(error || localError) && (
            <div className="error-message" role="alert">
              {error || localError}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <div className="form-group-wrapper">
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Your Name"
                autoComplete="name"
                aria-label="Full name"
              />
              <span className="form-group-icon"><User size={18} /></span>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <div className="form-group-wrapper">
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="your@email.com"
                autoComplete="email"
                className={emailError ? 'field-error' : ''}
                aria-label="Email address"
                aria-invalid={emailError ? 'true' : 'false'}
              />
              <span className="form-group-icon"><Mail size={18} /></span>
            </div>
            {emailError && (
              <div className="field-error-message" role="alert">
                <AlertTriangle size={14} />
                {emailError}
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="form-group-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Min. 8 characters"
                autoComplete="new-password"
                aria-label="Password (at least 8 characters)"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex="0"
              >
                {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className="form-group-wrapper">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                placeholder="Repeat your password"
                autoComplete="new-password"
                className={passwordError ? 'field-error' : ''}
                aria-label="Confirm password"
                aria-invalid={passwordError ? 'true' : 'false'}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                tabIndex="0"
              >
                {showConfirmPassword ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            </div>
            {passwordError && (
              <div className="field-error-message" role="alert">
                <AlertTriangle size={14} />
                {passwordError}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !!emailError || !!passwordError}
            className="btn-primary"
            aria-busy={loading}
          >
            {loading && <span className="btn-spinner"></span>}
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <div className="divider-text">Or continue with</div>

        <button
          type="button"
          className="btn-oauth"
          onClick={handleGoogleSignUp}
          aria-label="Sign up with Google"
        >
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Google
        </button>

        <p className="auth-link">
          Already have an account?{' '}
          <a href="/login" aria-label="Go to login page">
            Login here
          </a>
        </p>
      </div>
    </div>
  );
};
