import React, { useState } from 'react';
import { HeartPulse, Eye, EyeOff, AlertCircle, Loader, ArrowLeft } from 'lucide-react';
import { login } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function LoginPage({ onLoginSuccess, onReturnToPatient }) {
  const { loginSuccess, setPortalMode } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const data = await login(username.trim(), password);
      loginSuccess(data.user, data.access_token);
      if (onLoginSuccess) onLoginSuccess(data.user);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReturn = () => {
    if (onReturnToPatient) {
      onReturnToPatient();
    } else {
      setPortalMode('patient');
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Brand Logo & Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '12px',
            background: 'linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-accent) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px',
            boxShadow: '0 4px 14px rgba(15, 118, 110, 0.25)'
          }}>
            <HeartPulse size={26} color="#fff" />
          </div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
            Vaani<span style={{ color: 'var(--brand-primary-light)' }}>Doc</span>
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 500 }}>
            Staff & Health Operations Login
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              className="form-input"
              placeholder="e.g. admin, asha_varanasi"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <div className="password-input-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={isLoading}
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(v => !v)}
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: 'var(--color-danger-bg, #fef2f2)', border: '1px solid var(--color-danger-border, #fecaca)',
              borderRadius: '8px', padding: '10px 12px',
              marginBottom: '16px', fontSize: '0.82rem', color: 'var(--color-danger, #991b1b)'
            }}>
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader size={16} className="spin" />
                <span>Signing in...</span>
              </>
            ) : (
              'Sign in to Staff Portal'
            )}
          </button>
        </form>

        {/* Return to Patient Portal */}
        <div className="login-return-section">
          <button 
            type="button"
            onClick={handleReturn}
            className="login-return-btn"
          >
            <ArrowLeft size={14} />
            <span>Return to Patient Portal</span>
          </button>
        </div>

        {/* Access Disclaimer */}
        <div className="login-disclaimer">
          Access restricted to authorized administrators and health workers.
          <br />
          For technical access, contact your VaaniDoc system administrator.
        </div>
      </div>
    </div>
  );
}
