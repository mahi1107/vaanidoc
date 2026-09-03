import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, AlertCircle, LogOut, User, ChevronDown, Globe, ArrowLeft, Shield } from 'lucide-react';
import { fetchHealth } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';

function getStatusStyle(status) {
  if (status === 'healthy') return { color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' };
  if (status === 'degraded') return { color: '#d97706', bg: '#fffbeb', border: '#fde68a' };
  return { color: '#6b7280', bg: '#f3f4f6', border: '#e5e7eb' };
}

export default function Navbar({ onLogout, onSwitchToPatient }) {
  const { lang, toggleLanguage, t } = useLanguage();
  const { user, setPortalMode, logout: authLogout } = useAuth();
  const [istTime, setIstTime] = useState('');
  const [health, setHealth] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      setIstTime(new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: true, day: '2-digit', month: 'short'
      }).format(new Date()));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const checkHealth = async () => {
      try { 
        setHealth(await fetchHealth()); 
      } catch { 
        setHealth({ status: 'unreachable' }); 
      }
    };
    checkHealth();
    const timer = setInterval(checkHealth, 30000);
    return () => clearInterval(timer);
  }, []);

  const statusStyle = getStatusStyle(health?.status);

  const handleLogout = () => {
    setShowUserMenu(false);
    authLogout();
    if (onLogout) onLogout();
  };

  return (
    <header className="top-navbar">
      {/* Left: Switch to Patient + Live Clock + System Status */}
      <div className="navbar-left-group">
        {/* Switch to Patient Portal Button */}
        <button
          className="patient-portal-switch-btn"
          onClick={() => {
            setPortalMode('patient');
            if (onSwitchToPatient) onSwitchToPatient();
          }}
          title="Return to Patient Portal"
          id="switch-to-patient-btn"
        >
          <ArrowLeft size={14} />
          <span>{t('patient_portal')}</span>
        </button>

        <div className="nav-divider" />

        {/* Live IST Clock */}
        <div className="navbar-clock-badge">
          <Clock size={14} className="text-teal-400" />
          <span>{istTime} IST</span>
        </div>

        {/* System Status Pill */}
        {health && (
          <div 
            className="status-indicator-pill"
            style={{
              backgroundColor: statusStyle.bg,
              borderColor: statusStyle.border,
              color: statusStyle.color
            }}
          >
            {health.status === 'healthy' ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
            <span>{health.status === 'healthy' ? t('live_status') : 'Degraded'}</span>
          </div>
        )}
      </div>

      {/* Right: Language Selector + User Menu */}
      <div className="navbar-right-group">
        {/* Bilingual Language Selector */}
        <button
          className="lang-selector-btn"
          onClick={toggleLanguage}
          title="Switch Portal Interface Language (English / हिंदी)"
          id="staff-language-btn"
        >
          <Globe size={14} className="text-teal-400" />
          <span>{lang === 'en' ? 'English (EN)' : 'हिंदी (HI)'}</span>
        </button>

        {/* User Account Menu */}
        <div className="navbar-user-dropdown-wrapper">
          <button
            onClick={() => setShowUserMenu(v => !v)}
            className="user-profile-menu-btn"
            id="staff-profile-menu-btn"
            aria-expanded={showUserMenu}
          >
            <div className="user-avatar-circle">
              <User size={14} className="text-teal-400" />
            </div>
            <span className="user-name-text">{user?.full_name || user?.username || 'Staff'}</span>
            <ChevronDown size={13} className={`menu-chevron-icon ${showUserMenu ? 'rotated' : ''}`} />
          </button>

          {showUserMenu && (
            <>
              <div className="navbar-dropdown-backdrop" onClick={() => setShowUserMenu(false)} />
              <div className="user-dropdown-popover">
                <div className="popover-user-info">
                  <div className="popover-user-name">
                    {user?.full_name || user?.username}
                  </div>
                  <div className="popover-user-role">
                    {user?.role === 'admin' ? 'System Administrator' : (user?.role === 'asha_worker' ? 'ASHA Community Worker' : user?.role)}
                  </div>
                  {user?.district && (
                    <div className="popover-user-district">
                      📍 {user?.district} (UP)
                    </div>
                  )}
                </div>

                <div className="popover-menu-list">
                  <div className="popover-menu-item-static">
                    <User size={14} className="text-teal-400" />
                    <span>Account / Profile</span>
                  </div>

                  <button 
                    onClick={handleLogout} 
                    className="popover-logout-btn"
                    id="staff-logout-btn"
                  >
                    <LogOut size={14} />
                    <span>Log out</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
