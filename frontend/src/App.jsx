import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';

// Layout
import Sidebar from './components/Layout/Sidebar';
import Navbar from './components/Layout/Navbar';

// Patient Portal Pages
import PatientLandingPage from './pages/patient/PatientLandingPage';
import VoiceConsultationPage from './pages/patient/VoiceConsultationPage';
import PatientCasesPage from './pages/patient/PatientCasesPage';
import PatientSettingsPage from './pages/patient/PatientSettingsPage';
import FacilityFinderPage from './pages/patient/FacilityFinderPage';
import PatientAuthModal from './pages/patient/PatientAuthModal';

// Admin & ASHA Operations Portal Pages
import LoginPage from './pages/LoginPage';
import OverviewPage from './pages/OverviewPage';
import CasesManagementPage from './pages/CasesManagementPage';
import AshaDashboardPage from './pages/asha/AshaDashboardPage';
import LiveCallsPage from './pages/LiveCallsPage';
import AshaWorkersPage from './pages/AshaWorkersPage';
import FollowupsPage from './pages/FollowupsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import TriageProtocolsPage from './pages/TriageProtocolsPage';
import SystemSettingsPage from './pages/SystemSettingsPage';
import LiveCallSimulatorPage from './pages/LiveCallSimulatorPage';

function AppContent() {
  const { 
    user, 
    isAuthenticated, 
    isStaffAuthenticated, 
    isPatientAuthenticated, 
    isAdmin, 
    isAsha, 
    portalMode, 
    setPortalMode, 
    logout 
  } = useAuth();
  
  // Patient Portal Navigation State
  const [patientView, setPatientView] = useState('landing'); // 'landing' | 'consultation' | 'my-cases' | 'facilities'
  const [patientDistrict, setPatientDistrict] = useState('Varanasi');
  const [facilityFinderType, setFacilityFinderType] = useState('');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Operations Portal Active Tab
  const [activeTab, setActiveTab] = useState(() => (user?.role === 'asha_worker' ? 'my-work' : 'overview'));
  const [toasts, setToasts] = useState([]);

  const showToast = (message) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const handleStartConsultation = (district = 'Varanasi') => {
    setPatientDistrict(district);
    setPatientView('consultation');
  };

  const handleNavigatePatient = (view, params = {}) => {
    if (params.district) setPatientDistrict(params.district);
    if (params.type !== undefined) setFacilityFinderType(params.type);
    const validViews = ['landing', 'consultation', 'my-cases', 'settings', 'facilities'];
    setPatientView(validViews.includes(view) ? view : 'landing');
  };

  const handleSwitchToPatient = () => {
    setPatientView('landing');
    setPortalMode('patient');
  };

  // ── PATIENT PORTAL EXPERIENCE ──────────────────────────────────────
  if (portalMode === 'patient') {
    return (
      <div className="patient-app-wrapper">
        <ToastContainer toasts={toasts} />
        
        {(patientView === 'landing' || !['consultation', 'my-cases', 'settings', 'facilities'].includes(patientView)) && (
          <PatientLandingPage
            district={patientDistrict}
            onDistrictChange={setPatientDistrict}
            onNavigate={handleNavigatePatient}
            onStartConsultation={handleStartConsultation}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
          />
        )}

        {patientView === 'consultation' && (
          <VoiceConsultationPage
            district={patientDistrict}
            onBack={() => setPatientView('landing')}
            onNavigateToCases={() => setPatientView('my-cases')}
            onNavigateToFacilities={() => setPatientView('facilities')}
          />
        )}

        {patientView === 'my-cases' && (
          <PatientCasesPage
            onBack={() => setPatientView('landing')}
            onStartNewConsultation={() => setPatientView('consultation')}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
            onNavigateToSettings={() => setPatientView('settings')}
          />
        )}

        {patientView === 'settings' && (
          <PatientSettingsPage
            onBack={() => setPatientView('landing')}
            onNavigateToCases={() => setPatientView('my-cases')}
            showToast={showToast}
          />
        )}

        {patientView === 'facilities' && (
          <FacilityFinderPage
            initialDistrict={patientDistrict}
            initialType={facilityFinderType}
            onBack={() => setPatientView('landing')}
          />
        )}

        <PatientAuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onSuccess={(u) => {
            showToast(`Welcome back, ${u.full_name || u.username}`);
            setPatientView('my-cases');
          }}
        />
      </div>
    );
  }

  // ── ADMIN & ASHA HEALTH OPERATIONS PORTAL ─────────────────────────
  // Strictly enforce staff authentication: if unauthenticated OR logged-in as patient, show Staff LoginPage
  if (!isStaffAuthenticated) {
    return (
      <>
        <LoginPage 
          onLoginSuccess={(u) => {
            showToast(`Signed in as ${u.full_name || u.username}`);
            if (u.role === 'asha_worker') {
              setActiveTab('my-work');
            } else {
              setActiveTab('overview');
            }
          }} 
          onReturnToPatient={handleSwitchToPatient}
        />
        <ToastContainer toasts={toasts} />
      </>
    );
  }

  return (
    <div className="app-container">
      <ToastContainer toasts={toasts} />
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
      />
      
      <div className="main-content">
        <Navbar 
          onLogout={() => {
            logout();
            showToast('Signed out of operations portal');
          }}
          onSwitchToPatient={handleSwitchToPatient}
        />

        <main className="page-body">
          {/* ASHA Primary View */}
          {activeTab === 'my-work' && (
            <AshaDashboardPage showToast={showToast} />
          )}

          {/* Admin & Operations Views */}
          {activeTab === 'overview' && (
            <OverviewPage onNavigateTo={setActiveTab} />
          )}

          {activeTab === 'cases' && (
            <CasesManagementPage showToast={showToast} />
          )}

          {activeTab === 'live-calls' && (
            <LiveCallsPage />
          )}

          {activeTab === 'asha' && (
            <AshaWorkersPage
              onNavigateToCalls={() => setActiveTab('cases')}
              showToast={showToast}
            />
          )}

          {activeTab === 'followups' && (
            <FollowupsPage
              onUpdate={() => {}}
              showToast={showToast}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsPage />
          )}

          {activeTab === 'protocols' && (
            <TriageProtocolsPage />
          )}

          {activeTab === 'settings' && (
            <SystemSettingsPage />
          )}

          {activeTab === 'simulator' && (
            <LiveCallSimulatorPage
              onCallCompleted={() => {}}
              showToast={showToast}
            />
          )}
        </main>
      </div>
    </div>
  );
}

function ToastContainer({ toasts }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className="toast-item">
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </AuthProvider>
  );
}
