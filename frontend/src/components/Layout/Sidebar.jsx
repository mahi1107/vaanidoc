import React from 'react';
import {
  LayoutDashboard,
  Radio,
  ClipboardList,
  UserCheck,
  Bell,
  CalendarClock,
  BarChart3,
  BookOpen,
  Hospital,
  Settings,
  PhoneCall,
  HeartPulse,
  Phone,
  ListChecks
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar({ activeTab, setActiveTab }) {
  const { t } = useLanguage();
  const { user, isAdmin, isAsha } = useAuth();

  const adminNavItems = [
    { id: 'overview',   label: 'Overview',              icon: LayoutDashboard },
    { id: 'cases',      label: 'Case Management',       icon: ClipboardList },
    { id: 'live-calls', label: 'Live Consultations',    icon: Radio },
    { id: 'asha',       label: 'ASHA Workers',          icon: Bell },
    { id: 'followups',  label: 'Follow-ups Due',        icon: CalendarClock },
    { id: 'analytics',  label: 'Analytics & Trends',    icon: BarChart3 },
    { id: 'protocols',  label: 'Clinical Protocols',    icon: BookOpen },
    { id: 'settings',   label: 'System Settings',       icon: Settings },
  ];

  const ashaNavItems = [
    { id: 'my-work',    label: t('nav_my_work'),        icon: UserCheck },
    { id: 'cases',      label: 'Case Management',       icon: ClipboardList },
    { id: 'followups',  label: 'Follow-ups Due',        icon: CalendarClock },
    { id: 'protocols',  label: 'Clinical Protocols',    icon: BookOpen },
  ];

  const navItems = isAsha ? ashaNavItems : adminNavItems;

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand-header">
        <div className="brand-logo-badge">
          <HeartPulse size={20} color="#fff" />
        </div>
        <div>
          <div className="brand-name">
            Vaani<span className="brand-highlight">Doc</span>
          </div>
          <div className="brand-subtext">
            {isAsha ? 'ASHA Care Portal' : 'Health Operations'}
          </div>
        </div>
      </div>

      {/* Main Nav */}
      <nav className="sidebar-nav-list">
        <div className="section-heading-clean">
          {isAsha ? 'Care Operations' : 'Health Operations'}
        </div>

        <div className="flex flex-col gap-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={16} className="nav-icon" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Development Simulator Tools */}
        {isAdmin && (
          <div className="sidebar-dev-section">
            <div className="section-heading-clean">Developer Tools</div>
            <button
              id="nav-simulator"
              onClick={() => setActiveTab('simulator')}
              className={`sidebar-nav-item sidebar-nav-item-secondary ${activeTab === 'simulator' ? 'active' : ''}`}
            >
              <PhoneCall size={15} className="nav-icon" />
              <span>Speech Simulator</span>
              <span className="badge-dev-tag">Dev</span>
            </button>
          </div>
        )}
      </nav>

      {/* Emergency Helplines Footer */}
      <div className="sidebar-emergency-footer">
        <div className="emergency-notice-pill">
          <div className="emergency-notice-header">
            <Phone size={12} />
            <span>Emergency Helplines</span>
          </div>
          <div className="emergency-notice-text">
            Ambulance: <strong>108</strong> • Medical: <strong>104</strong>
          </div>
        </div>
      </div>
    </aside>
  );
}
