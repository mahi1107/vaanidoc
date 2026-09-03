import React, { useState, useRef, useEffect } from 'react';
import { User, Settings, ClipboardList, LogOut, ChevronDown, MapPin, Phone } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function PatientAccountMenu({ onNavigateToSettings, onNavigateToCases, onLogout }) {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // Close popover if clicked outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSettingsClick = () => {
    setIsOpen(false);
    if (onNavigateToSettings) onNavigateToSettings();
  };

  const handleCasesClick = () => {
    setIsOpen(false);
    if (onNavigateToCases) onNavigateToCases();
  };

  const handleLogoutClick = () => {
    setIsOpen(false);
    if (onLogout) onLogout();
    else logout();
  };

  if (!user) return null;

  return (
    <div className="patient-account-menu-wrapper" ref={menuRef}>
      <button
        type="button"
        className="patient-account-pill-btn"
        onClick={() => setIsOpen(v => !v)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        id="patient-profile-menu-btn"
      >
        <div className="patient-avatar-circle">
          <User size={15} className="text-teal-700" />
        </div>
        <span className="patient-pill-name">{user.full_name || user.username}</span>
        <ChevronDown size={13} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="patient-account-dropdown-popover">
          {/* Header Info */}
          <div className="patient-dropdown-header">
            <div className="patient-dropdown-name">{user.full_name || 'Patient Account'}</div>
            <div className="patient-dropdown-phone flex items-center gap-1">
              <Phone size={11} className="text-slate-400" />
              <span>{user.phone_number || user.username}</span>
            </div>
            {user.district && (
              <div className="patient-dropdown-district flex items-center gap-1">
                <MapPin size={11} className="text-teal-600" />
                <span>{user.district}</span>
              </div>
            )}
          </div>

          <div className="patient-dropdown-divider" />

          {/* Menu Items */}
          <div className="patient-dropdown-menu-list">
            <button
              type="button"
              className="patient-dropdown-item"
              onClick={handleSettingsClick}
              id="menu-settings-btn"
            >
              <Settings size={15} className="text-teal-600" />
              <span>Profile / Settings</span>
            </button>

            <button
              type="button"
              className="patient-dropdown-item"
              onClick={handleCasesClick}
              id="menu-my-cases-btn"
            >
              <ClipboardList size={15} className="text-teal-600" />
              <span>My Care Consultations</span>
            </button>
          </div>

          <div className="patient-dropdown-divider" />

          {/* Logout Action */}
          <button
            type="button"
            className="patient-dropdown-logout-btn"
            onClick={handleLogoutClick}
            id="menu-logout-btn"
          >
            <LogOut size={14} />
            <span>Log out</span>
          </button>
        </div>
      )}
    </div>
  );
}
