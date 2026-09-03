import React, { useState, useEffect } from 'react';
import { Mic, Hospital, ClipboardList, HeartPulse, AlertTriangle, Phone, User, ArrowRight, Activity } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { DEFAULT_DISTRICT } from '../../data/districts';
import DistrictCombobox from '../../components/Common/DistrictCombobox';
import PatientAccountMenu from '../../components/Common/PatientAccountMenu';

export default function PatientLandingPage({
  district = DEFAULT_DISTRICT,
  onDistrictChange,
  onNavigate,
  onStartConsultation,
  onOpenAuthModal
}) {
  const { user, isAuthenticated, setPortalMode, logout } = useAuth();
  const [selectedDistrict, setSelectedDistrict] = useState(district || DEFAULT_DISTRICT);

  useEffect(() => {
    if (district && district !== selectedDistrict) {
      setSelectedDistrict(district);
    }
  }, [district]);

  const handleDistrictSelect = (newDistrict) => {
    setSelectedDistrict(newDistrict);
    if (onDistrictChange) {
      onDistrictChange(newDistrict);
    }
  };

  return (
    <div className="patient-portal-landing">
      {/* Patient Portal Header */}
      <header className="patient-header">
        <div className="patient-header-content">
          <div className="brand-logo-area">
            <div className="brand-icon-pill">
              <HeartPulse size={24} className="text-teal-600" />
            </div>
            <div>
              <h1 className="brand-title">VaaniDoc</h1>
              <p className="brand-tagline">AI Health Guidance & Care Coordination</p>
            </div>
          </div>

          <div className="header-action-group">
            {/* Custom Searchable District Combobox */}
            <div className="header-district-selector-wrap">
              <DistrictCombobox
                selectedDistrict={selectedDistrict}
                onSelectDistrict={handleDistrictSelect}
                placeholder="Select District..."
              />
            </div>

            {isAuthenticated ? (
              <PatientAccountMenu
                onNavigateToSettings={() => onNavigate('settings')}
                onNavigateToCases={() => onNavigate('my-cases')}
                onLogout={logout}
              />
            ) : (
              <button className="sign-in-link-btn" onClick={onOpenAuthModal} id="patient-login-btn">
                <User size={16} />
                <span>Patient Login</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="patient-hero-container">
        <div className="hero-content-wrapper">
          <h2 className="hero-main-title">
            Healthcare assistance,<br />
            <span className="text-teal-700">in your language.</span>
          </h2>

          <p className="hero-description">
            Speak naturally about your symptoms in <strong>Hindi</strong>, <strong>English</strong>, or <strong>Hinglish</strong>. 
            Receive immediate protocol-based guidance, find nearby verified government health centres in <strong>{selectedDistrict}</strong>, and connect with your local ASHA worker.
          </p>

          {/* DOMINANT HERO CTA */}
          <div className="dominant-cta-container">
            <button
              className="start-voice-consultation-btn"
              onClick={() => onStartConsultation(selectedDistrict)}
              id="start-voice-btn"
            >
              <div className="mic-circle-pulse">
                <Mic size={36} color="#ffffff" />
              </div>
              <div className="btn-text-content">
                <span className="btn-primary-text">Start Voice Consultation</span>
                <span className="btn-sub-text">बोलकर स्वास्थ्य सलाह लें • Speak Naturally ({selectedDistrict})</span>
              </div>
            </button>
          </div>

          {/* Quick Care Actions Grid */}
          <div className="patient-quick-actions-grid">
            <div 
              className="care-action-card"
              onClick={() => onNavigate('facilities', { district: selectedDistrict })}
            >
              <div className="action-card-icon bg-teal-50 text-teal-700">
                <Hospital size={26} />
              </div>
              <div className="action-card-info">
                <h3>Find Healthcare</h3>
                <p>Verified PHCs, CHCs & District Hospitals in {selectedDistrict}</p>
              </div>
            </div>

            <div 
              className="care-action-card"
              onClick={() => onNavigate('my-cases')}
            >
              <div className="action-card-icon bg-blue-50 text-blue-700">
                <ClipboardList size={26} />
              </div>
              <div className="action-card-info">
                <h3>My Care Journey</h3>
                <p>Track your past consultations, cases & follow-up status</p>
              </div>
            </div>

            <div 
              className="care-action-card"
              onClick={() => onNavigate('facilities', { district: selectedDistrict, type: 'PHC' })}
            >
              <div className="action-card-icon bg-emerald-50 text-emerald-700">
                <Activity size={26} />
              </div>
              <div className="action-card-info">
                <h3>ASHA & PHC Support</h3>
                <p>Community health worker support for maternal & fever care in {selectedDistrict}</p>
              </div>
            </div>

            <div 
              className="care-action-card emergency-card"
              onClick={() => window.open('tel:108', '_self')}
            >
              <div className="action-card-icon bg-red-100 text-red-700">
                <AlertTriangle size={26} />
              </div>
              <div className="action-card-info">
                <h3 className="text-red-700">Emergency Help (108)</h3>
                <p>Direct 24/7 Government Ambulance for critical distress</p>
              </div>
              <Phone size={18} className="text-red-600 ml-auto" />
            </div>
          </div>

          {/* Clean Portal Footer with discrete Staff Login entry */}
          <footer className="patient-portal-footer" style={{ marginTop: '32px', paddingTop: '16px', borderTop: '1px solid rgba(0, 0, 0, 0.08)', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: '12px', fontSize: '0.78rem', color: '#64748b' }}>
            <button
              onClick={() => {
                setPortalMode('operations');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#0d9488',
                cursor: 'pointer',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                borderRadius: '6px'
              }}
              id="staff-login-entry-btn"
              title="Staff & ASHA Healthcare Portal Login"
            >
              <span>Staff & ASHA Login →</span>
            </button>
          </footer>
        </div>
      </main>
    </div>
  );
}
