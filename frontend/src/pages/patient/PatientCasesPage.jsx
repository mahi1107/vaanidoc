import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft, ClipboardList, Hospital, UserCheck, Clock,
  Mic, RefreshCw, AlertCircle, HeartPulse, Phone,
  ChevronRight, X, Calendar, MapPin, CheckCircle,
  AlertTriangle, Activity, User
} from 'lucide-react';
import { fetchPatientCases, getPatientSessionCodes } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import PatientAccountMenu from '../../components/Common/PatientAccountMenu';

// ── Patient-facing status & triage label maps ──────────────────────
const TRIAGE_PATIENT_LABEL = {
  1: { label: 'Monitor at home', color: 'status-monitor', icon: CheckCircle },
  2: { label: 'Healthcare follow-up recommended', color: 'status-followup', icon: Activity },
  3: { label: 'Healthcare centre assessment needed', color: 'status-attention', icon: Hospital },
  4: { label: 'Urgent medical attention required', color: 'status-urgent', icon: AlertTriangle },
};

const STATUS_PATIENT_LABEL = {
  'Active':                   { label: 'Under care',                        color: 'status-active' },
  'ASHA Follow-up':           { label: 'Health worker follow-up needed',     color: 'status-followup' },
  'Follow-up Due':            { label: 'Health worker follow-up needed',     color: 'status-followup' },
  'Referral Recommended':     { label: 'Healthcare centre visit recommended',color: 'status-attention' },
  'Escalated':                { label: 'Urgent attention required',          color: 'status-urgent' },
  'Resolved':                 { label: 'Care completed',                     color: 'status-resolved' },
};

function getPatientStatus(careCase) {
  const byStatus = STATUS_PATIENT_LABEL[careCase.status];
  if (byStatus) return byStatus;
  const byTriage = TRIAGE_PATIENT_LABEL[careCase.triage_level];
  if (byTriage) return { label: byTriage.label, color: byTriage.color };
  return { label: 'Under care', color: 'status-active' };
}

function formatDate(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

function formatDateTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  });
}

// ── Skeleton loading card ─────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="consultation-card-patient skeleton-card" aria-hidden="true">
      <div className="skeleton-pulse card-skeleton-title" />
      <div className="skeleton-pulse card-skeleton-line" />
      <div className="skeleton-pulse card-skeleton-line short" />
    </div>
  );
}

// ── Consultation detail modal / expanded section ──────────────────
function CaseDetailModal({ careCase, onClose, onStartNew }) {
  const status = getPatientStatus(careCase);
  const trInfo = TRIAGE_PATIENT_LABEL[careCase.triage_level] || TRIAGE_PATIENT_LABEL[1];
  const TriageIcon = trInfo.icon;

  return (
    <div className="case-detail-modal-overlay" role="dialog" aria-modal="true" aria-label="Consultation details">
      <div className="case-detail-modal-card">
        {/* Modal Header */}
        <div className="modal-header-row">
          <div className="modal-header-left">
            <span className="modal-case-ref">{careCase.case_code}</span>
            <h2 className="modal-complaint-title">{careCase.primary_complaint}</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close details">
            <X size={20} />
          </button>
        </div>

        {/* Status + Date */}
        <div className="modal-meta-strip">
          <span className={`care-status-badge ${status.color}`}>{status.label}</span>
          <span className="modal-date-text">
            <Calendar size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
            {formatDateTime(careCase.created_at)}
          </span>
        </div>

        {/* Your concern / transcript */}
        {careCase.primary_complaint && (
          <div className="modal-section">
            <p className="modal-section-label">Your concern</p>
            <div className="modal-transcript-box">
              <p className="modal-transcript-text">"{careCase.primary_complaint}"</p>
              {careCase.detected_language && (
                <span className="modal-lang-tag">
                  {careCase.detected_language.toUpperCase()}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Recommended next step */}
        {careCase.recommendation_text && (
          <div className="modal-section">
            <p className="modal-section-label">Recommended next step</p>
            <div className={`modal-guidance-box ${trInfo.color}`}>
              <TriageIcon size={18} style={{ flexShrink: 0 }} />
              <p className="modal-guidance-text">{careCase.recommendation_text}</p>
            </div>
          </div>
        )}

        {/* Facility & ASHA two-col grid */}
        <div className="modal-info-grid">
          {/* Healthcare facility */}
          <div className="modal-info-card">
            <div className="modal-info-card-header">
              <Hospital size={16} className="icon-teal" />
              <span>Recommended facility</span>
            </div>
            {careCase.facility && (!careCase.patient?.district || (careCase.facility.district && careCase.facility.district.trim().toLowerCase() === careCase.patient.district.trim().toLowerCase())) ? (
              <div className="modal-info-card-body">
                <strong className="modal-info-name">{careCase.facility.name}</strong>
                <p className="modal-info-sub">
                  {careCase.facility.facility_type}
                  {careCase.facility.district ? ` • ${careCase.facility.district}` : ''}
                </p>
                {careCase.facility.address && (
                  <p className="modal-info-address">
                    <MapPin size={12} style={{ display: 'inline', marginRight: 3 }} />
                    {careCase.facility.address}
                  </p>
                )}
                {careCase.facility.phone_number && (
                  <a href={`tel:${careCase.facility.phone_number}`} className="modal-call-link">
                    <Phone size={13} />
                    {careCase.facility.phone_number}
                  </a>
                )}
              </div>
            ) : (
              <p className="modal-info-empty">No configured healthcare facility found for {careCase.patient?.district || 'this case'}.</p>
            )}
          </div>

          {/* ASHA worker */}
          <div className="modal-info-card">
            <div className="modal-info-card-header">
              <UserCheck size={16} className="icon-green" />
              <span>Community health worker</span>
            </div>
            {careCase.asha_worker ? (
              <div className="modal-info-card-body">
                <strong className="modal-info-name">{careCase.asha_worker.name}</strong>
                <p className="modal-info-sub">
                  {careCase.asha_worker.village}
                  {careCase.asha_worker.district ? `, ${careCase.asha_worker.district}` : ''}
                </p>
                {careCase.asha_worker.phone_number && (
                  <a href={`tel:${careCase.asha_worker.phone_number}`} className="modal-call-link">
                    <Phone size={13} />
                    {careCase.asha_worker.phone_number}
                  </a>
                )}
              </div>
            ) : (
              <p className="modal-info-empty">Your local ASHA worker will be notified if follow-up is needed.</p>
            )}
          </div>
        </div>

        {/* Care timeline events */}
        {careCase.care_events && careCase.care_events.length > 0 && (
          <div className="modal-section">
            <p className="modal-section-label">Care journey</p>
            <div className="modal-timeline">
              {careCase.care_events.map((ev, idx) => (
                <div key={idx} className="modal-timeline-event">
                  <div className="modal-timeline-dot" />
                  <div className="modal-timeline-content">
                    <div className="modal-timeline-header">
                      <span className="modal-timeline-name">{ev.event}</span>
                      {ev.time && <span className="modal-timeline-time">{ev.time}</span>}
                    </div>
                    {ev.notes && <p className="modal-timeline-notes">{ev.notes}</p>}
                    {ev.actor && <span className="modal-timeline-actor">by {ev.actor}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal footer actions */}
        <div className="modal-footer-actions">
          <button className="modal-new-consult-btn" onClick={() => { onClose(); onStartNew(); }}>
            <Mic size={16} />
            Start new consultation
          </button>
          <button className="modal-dismiss-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Single consultation card ──────────────────────────────────────
function ConsultationCard({ careCase, onViewDetail }) {
  const status = getPatientStatus(careCase);

  return (
    <article className="consultation-card-patient" onClick={() => onViewDetail(careCase)}>
      <div className="card-top-row">
        <h3 className="card-complaint-title">{careCase.primary_complaint}</h3>
        <span className={`care-status-badge ${status.color}`}>{status.label}</span>
      </div>

      {careCase.recommendation_text && (
        <p className="card-recommendation-excerpt">
          {careCase.recommendation_text.length > 120
            ? careCase.recommendation_text.slice(0, 120) + '…'
            : careCase.recommendation_text}
        </p>
      )}

      <div className="card-meta-row">
        <span className="card-date">
          <Calendar size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
          {formatDate(careCase.created_at)}
        </span>
        {careCase.detected_language && (
          <span className="card-lang-badge">{careCase.detected_language.toUpperCase()}</span>
        )}
      </div>

      {/* Next step preview */}
      {careCase.facility && (
        <div className="card-facility-row">
          <Hospital size={13} className="icon-teal" />
          <span>{careCase.facility.name}</span>
        </div>
      )}

      {/* ASHA follow-up status */}
      {(careCase.status === 'ASHA Follow-up' || careCase.status === 'Follow-up Due') && (
        <div className="card-followup-row">
          <UserCheck size={13} className="icon-amber" />
          <span>Health worker follow-up scheduled</span>
        </div>
      )}

      <div className="card-footer-row">
        <span className="card-case-ref">{careCase.case_code}</span>
        <button
          className="card-view-btn"
          onClick={(e) => { e.stopPropagation(); onViewDetail(careCase); }}
          aria-label={`View consultation details for ${careCase.primary_complaint}`}
        >
          View details <ChevronRight size={14} />
        </button>
      </div>
    </article>
  );
}

// ── Main Page ─────────────────────────────────────────────────────
export default function PatientCasesPage({ onBack, onStartNewConsultation, onOpenAuthModal, onNavigateToSettings }) {
  const { user, isPatient, logout, isAuthenticated } = useAuth();

  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'active' | 'followup' | 'completed'
  const [selectedCase, setSelectedCase] = useState(null);

  const loadCases = useCallback(async () => {
    // If logged out: My Care must NOT display private cases
    if (!isAuthenticated) {
      setCases([]);
      setSelectedCase(null);
      setLoading(false);
      setError(null);
      return;
    }

    // When authenticated, fetch strictly the authenticated patient's cases.
    // Do NOT include guest/sessionCodes in the authenticated My Care request.
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPatientCases();
      setCases(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Unable to load care cases.');
      setCases([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadCases();
  }, [loadCases]);

  // Clear in-memory state on logout or auth state transition
  useEffect(() => {
    if (!isAuthenticated) {
      setCases([]);
      setSelectedCase(null);
    }
  }, [isAuthenticated]);

  const handleLogoutAction = () => {
    logout();
    clearPatientSessionCodes();
    setCases([]);
    setSelectedCase(null);
    if (onBack) onBack();
  };

  // Determine if the patient has any identifier to fetch cases (only authenticated patients)
  const hasIdentifier = isAuthenticated;

  // Filter logic
  const filteredCases = cases.filter((c) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'active') return c.status !== 'Resolved';
    if (activeFilter === 'followup') return ['ASHA Follow-up', 'Follow-up Due', 'Referral Recommended'].includes(c.status);
    if (activeFilter === 'completed') return c.status === 'Resolved';
    return true;
  });

  const activeCases = cases.filter(c => c.status !== 'Resolved');
  const completedCases = cases.filter(c => c.status === 'Resolved');

  // Split for section display (only when filter is 'all')
  const showSections = activeFilter === 'all' && activeCases.length > 0 && completedCases.length > 0;

  return (
    <div className="my-care-page">
      {/* ── Shared patient header ── */}
      <header className="patient-header">
        <div className="patient-header-content">
          <div className="brand-logo-area">
            <div className="brand-icon-pill">
              <HeartPulse size={24} className="icon-teal-brand" />
            </div>
            <div>
              <h1 className="brand-title">VaaniDoc</h1>
              <p className="brand-tagline">AI Health Guidance &amp; Care Coordination</p>
            </div>
          </div>
          <div className="header-action-group">
            {user ? (
              <PatientAccountMenu
                onNavigateToSettings={onNavigateToSettings}
                onNavigateToCases={() => {}}
                onLogout={handleLogoutAction}
              />
            ) : (
              <button className="sign-in-link-btn" onClick={onOpenAuthModal}>
                <User size={15} />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Page body ── */}
      <div className="my-care-body">

        {/* Back nav */}
        <nav className="my-care-breadcrumb" aria-label="Navigation">
          <button className="back-btn" onClick={onBack}>
            <ArrowLeft size={16} />
            Back to Home
          </button>
        </nav>

        {/* Page title block */}
        <div className="my-care-title-block">
          <div className="my-care-title-left">
            <h2 className="my-care-heading">My Care</h2>
            <p className="my-care-subheading">
              Track your consultations, recommendations and follow-ups in one place.
            </p>
          </div>
          <button
            className="my-care-primary-cta"
            onClick={onStartNewConsultation}
            id="start-new-voice-btn"
          >
            <Mic size={16} />
            Start Voice Consultation
          </button>
        </div>

        {/* ── Not signed in / no session cases ── */}
        {!hasIdentifier && !loading && (
          <div className="empty-state-container">
            <div className="empty-state-icon">
              <ClipboardList size={40} />
            </div>
            <h3 className="empty-state-title">No consultations yet</h3>
            <p className="empty-state-body">
              Complete a voice consultation to see your personal care history here.
              Sign in to access consultations across all your devices.
            </p>
            <div className="empty-state-actions">
              <button className="empty-cta-primary" onClick={onStartNewConsultation}>
                <Mic size={16} />
                Start Voice Consultation
              </button>
              <button className="empty-cta-secondary" onClick={onOpenAuthModal}>
                Sign In
              </button>
            </div>
          </div>
        )}

        {/* ── Loading state ── */}
        {loading && hasIdentifier && (
          <div>
            {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* ── Error state ── */}
        {error && !loading && (
          <div className="empty-state-container error-state">
            <div className="empty-state-icon error-icon">
              <AlertCircle size={36} />
            </div>
            <h3 className="empty-state-title">Unable to load consultations</h3>
            <p className="empty-state-body">{error}</p>
            <button className="empty-cta-primary" onClick={loadCases}>
              <RefreshCw size={15} />
              Try Again
            </button>
          </div>
        )}

        {/* ── Loaded: no cases ── */}
        {!loading && !error && hasIdentifier && cases.length === 0 && (
          <div className="empty-state-container">
            <div className="empty-state-icon">
              <ClipboardList size={40} />
            </div>
            <h3 className="empty-state-title">No consultations yet</h3>
            <p className="empty-state-body">
              Start a voice consultation to get personalised health guidance and begin your care journey.
            </p>
            <button className="empty-cta-primary" onClick={onStartNewConsultation}>
              <Mic size={16} />
              Start Voice Consultation
            </button>
          </div>
        )}

        {/* ── Loaded: cases present ── */}
        {!loading && !error && cases.length > 0 && (
          <>
            {/* Filter tabs — only shown when there are multiple cases */}
            {cases.length > 1 && (
              <div className="filter-tabs-row" role="tablist" aria-label="Filter consultations">
                {[
                  { key: 'all', label: 'All', count: cases.length },
                  { key: 'active', label: 'Active', count: activeCases.length },
                  { key: 'followup', label: 'Follow-up', count: cases.filter(c => ['ASHA Follow-up', 'Follow-up Due', 'Referral Recommended'].includes(c.status)).length },
                  { key: 'completed', label: 'Completed', count: completedCases.length },
                ].map(tab => (
                  <button
                    key={tab.key}
                    className={`filter-tab-btn ${activeFilter === tab.key ? 'active' : ''}`}
                    onClick={() => setActiveFilter(tab.key)}
                    role="tab"
                    aria-selected={activeFilter === tab.key}
                  >
                    {tab.label}
                    {tab.count > 0 && (
                      <span className="filter-tab-count">{tab.count}</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* No results after filter */}
            {filteredCases.length === 0 && (
              <div className="empty-state-container filter-empty">
                <p className="filter-empty-msg">No consultations match this filter.</p>
                <button className="filter-reset-btn" onClick={() => setActiveFilter('all')}>
                  Show all
                </button>
              </div>
            )}

            {/* Section split — Active + Completed */}
            {showSections && activeFilter === 'all' ? (
              <>
                {activeCases.length > 0 && (
                  <section aria-label="Active care">
                    <h3 className="care-section-title">Active care</h3>
                    <div className="consultation-card-list">
                      {activeCases.map(c => (
                        <ConsultationCard
                          key={c.id}
                          careCase={c}
                          onViewDetail={setSelectedCase}
                        />
                      ))}
                    </div>
                  </section>
                )}
                {completedCases.length > 0 && (
                  <section aria-label="Previous consultations">
                    <h3 className="care-section-title previous">Previous consultations</h3>
                    <div className="consultation-card-list">
                      {completedCases.map(c => (
                        <ConsultationCard
                          key={c.id}
                          careCase={c}
                          onViewDetail={setSelectedCase}
                        />
                      ))}
                    </div>
                  </section>
                )}
              </>
            ) : (
              <div className="consultation-card-list">
                {filteredCases.map(c => (
                  <ConsultationCard
                    key={c.id}
                    careCase={c}
                    onViewDetail={setSelectedCase}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Consultation detail modal ── */}
      {selectedCase && (
        <CaseDetailModal
          careCase={selectedCase}
          onClose={() => setSelectedCase(null)}
          onStartNew={onStartNewConsultation}
        />
      )}

      {/* Footer */}
      <footer className="patient-portal-footer">
        <div className="footer-content">
          <p>© 2026 VaaniDoc Healthcare Platform • India Standard Time (IST)</p>
          <div className="footer-links">
            <a href="#emergency" onClick={(e) => { e.preventDefault(); window.open('tel:108', '_self'); }}>Emergency 108</a>
            <span>•</span>
            <a href="#back" onClick={(e) => { e.preventDefault(); onBack(); }}>Home</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
