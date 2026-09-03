import React, { useState, useEffect } from 'react';
import {
  Radio, Clock, MapPin, PhoneIncoming, Activity,
  ChevronDown, ChevronUp, Eye, RefreshCw, Cpu
} from 'lucide-react';
import { fetchActiveCalls, fetchCases } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import DistrictCombobox from '../components/Common/DistrictCombobox';
import AshaCaseDetailModal from '../components/Asha/AshaCaseDetailModal';

// ── Formatting & Status Helpers ────────────────────────────────────

function formatLanguage(langCode) {
  const map = {
    hi: 'Hindi',
    en: 'English',
    bho: 'Bhojpuri',
    bn: 'Bengali',
    mr: 'Marathi',
    ta: 'Tamil',
    te: 'Telugu'
  };
  return map[langCode?.toLowerCase()] || (langCode ? langCode.toUpperCase() : 'Hindi');
}

function getLiveSeconds(startedAt, baseSeconds) {
  if (startedAt) {
    const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
    return Math.max(elapsed, 0);
  }
  return baseSeconds || 0;
}

function formatDuration(seconds) {
  if (!seconds || seconds < 0) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return 'Started recently';
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Started just now';
    if (diffMins < 60) return `Started ${diffMins} min ago`;
    const diffHrs = Math.floor(diffMins / 60);
    return `Started ${diffHrs} hr ago`;
  } catch {
    return 'Started recently';
  }
}

function getHumanStatus(state) {
  const s = (state || '').toUpperCase();
  if (s === 'LISTENING' || s === 'CHIEF_COMPLAINT') {
    return {
      label: 'Listening',
      color: '#34D399',
      bg: 'rgba(16, 185, 129, 0.15)',
      border: 'rgba(16, 185, 129, 0.3)'
    };
  }
  if (s === 'TRIAGE' || s === 'GUIDANCE' || s === 'PROCESSING' || s === 'ASSESSING') {
    return {
      label: 'Processing',
      color: '#2DD4BF',
      bg: 'rgba(20, 184, 166, 0.15)',
      border: 'rgba(20, 184, 166, 0.3)'
    };
  }
  if (s === 'MISSING_INFO' || s === 'LANGUAGE_SELECT' || s === 'GREETING' || s === 'AWAITING_RESPONSE') {
    return {
      label: 'Awaiting Response',
      color: '#FCD34D',
      bg: 'rgba(245, 158, 11, 0.15)',
      border: 'rgba(245, 158, 11, 0.3)'
    };
  }
  if (s === 'CONNECTING' || s === 'INITIALIZING') {
    return {
      label: 'Connecting',
      color: '#94A3B8',
      bg: 'rgba(255, 255, 255, 0.08)',
      border: 'rgba(255, 255, 255, 0.12)'
    };
  }
  if (s === 'COMPLETED') {
    return {
      label: 'Completed',
      color: '#94A3B8',
      bg: 'rgba(255, 255, 255, 0.08)',
      border: 'rgba(255, 255, 255, 0.12)'
    };
  }
  return {
    label: state || 'Active',
    color: '#34D399',
    bg: 'rgba(16, 185, 129, 0.15)',
    border: 'rgba(16, 185, 129, 0.3)'
  };
}

function getCallCaseCode(call, linkedCase) {
  if (linkedCase?.case_code) return linkedCase.case_code;
  const suffix = (call.id || '').replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase();
  return `VD-${suffix || 'LIVE'}`;
}

// ── Main Page Component ────────────────────────────────────────────

export default function LiveCallsPage({ showToast }) {
  const { t } = useLanguage();
  const { user } = useAuth();

  const [calls, setCalls] = useState([]);
  const [cases, setCases] = useState([]);
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [selectedCase, setSelectedCase] = useState(null);
  const [expandedTech, setExpandedTech] = useState({});

  const loadData = async () => {
    try {
      const params = { exclude_demo: true };
      if (selectedDistrict) params.district = selectedDistrict;

      const [callsData, casesData] = await Promise.all([
        fetchActiveCalls(params),
        fetchCases({ exclude_demo: true, limit: 100 })
      ]);

      setCalls(callsData || []);
      setCases(casesData || []);
    } catch (err) {
      console.error('Failed to load active consultations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const pollInterval = setInterval(loadData, 4000);
    const tickInterval = setInterval(() => setTick(t => t + 1), 1000);
    return () => {
      clearInterval(pollInterval);
      clearInterval(tickInterval);
    };
  }, [selectedDistrict]);

  const toggleTech = (callId) => {
    setExpandedTech(prev => ({
      ...prev,
      [callId]: !prev[callId]
    }));
  };

  // Derive real summary metrics from actual active calls
  const countActive = calls.length;
  const countListening = calls.filter(c =>
    ['LISTENING', 'CHIEF_COMPLAINT'].includes(c.state?.toUpperCase())
  ).length;
  const countProcessing = calls.filter(c =>
    ['TRIAGE', 'GUIDANCE', 'PROCESSING', 'ASSESSING'].includes(c.state?.toUpperCase())
  ).length;
  const countAwaiting = calls.filter(c =>
    ['MISSING_INFO', 'LANGUAGE_SELECT', 'GREETING', 'AWAITING_RESPONSE'].includes(c.state?.toUpperCase())
  ).length;

  const handleOpenCase = (call, linkedCase) => {
    if (linkedCase) {
      setSelectedCase(linkedCase);
      return;
    }

    const caseCode = getCallCaseCode(call, null);
    const statusInfo = getHumanStatus(call.state);

    const syntheticCase = {
      id: call.id,
      case_code: caseCode,
      primary_complaint: call.symptoms?.[0]?.symptom_name || call.transcripts?.[0]?.text || 'Live Voice Consultation In Progress',
      detected_language: call.language || 'hi',
      language_confidence: 0.95,
      triage_level: call.triage_results?.[0]?.triage_level || 2,
      triage_category: call.triage_results?.[0]?.triage_category || 'phc',
      status: statusInfo.label,
      recommendation_text: call.triage_results?.[0]?.voice_guidance_text || 'Active consultation currently receiving live speech triage.',
      facility: {
        name: `Primary Health Centre (${call.district || 'Local'})`,
        facility_type: 'Primary Health Centre',
        emergency_helpline: '108',
        address: `${call.district || 'District'} Health Network`
      },
      patient: {
        district: call.district || 'Local District',
        village: call.village || 'Community Area',
        phone_number: call.caller_phone
      },
      care_events: call.timeline_events || [],
      is_demo: false,
      created_at: call.started_at || new Date().toISOString()
    };

    setSelectedCase(syntheticCase);
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 4px' }}>

      {/* ── Page Header ───────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '4px' }}>
            Live Consultations
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#94A3B8' }}>
            Monitor consultations currently in progress.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ minWidth: '220px' }}>
            <DistrictCombobox
              selectedDistrict={selectedDistrict || ''}
              onSelectDistrict={(dist) => setSelectedDistrict(
                dist === 'All Districts' || dist === 'All Districts (India)' ? '' : dist
              )}
              showAllOption={true}
              allOptionLabel="All Districts"
              placeholder="All Districts"
              id="live-calls-district-filter"
            />
          </div>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            padding: '7px 12px',
            borderRadius: '8px',
            fontSize: '0.78rem',
            fontWeight: 700,
            color: '#34D399'
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#10B981',
              boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.35)',
              animation: calls.length > 0 ? 'pulse 2s infinite' : 'none'
            }} />
            <span>{calls.length} Active Now</span>
          </div>

          <button
            onClick={loadData}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '8px',
              padding: '7px 12px',
              fontSize: '0.78rem',
              fontWeight: 600,
              color: '#E2E8F0',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={13} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── Summary Metrics Section (Consistent Dark Theme) ───── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '14px',
        marginBottom: '24px'
      }}>
        <div style={{
          backgroundColor: '#111E2E',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          padding: '16px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Active Now
            </span>
            <span style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              background: 'rgba(20, 184, 166, 0.12)',
              color: '#14B8A6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Radio size={15} />
            </span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#F8FAFC', lineHeight: 1.1 }}>
            {countActive}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
            In-progress consultations
          </div>
        </div>

        <div style={{
          backgroundColor: '#111E2E',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          padding: '16px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Listening
            </span>
            <span style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              background: 'rgba(16, 185, 129, 0.12)',
              color: '#10B981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Activity size={15} />
            </span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#F8FAFC', lineHeight: 1.1 }}>
            {countListening}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
            Hearing patient symptoms
          </div>
        </div>

        <div style={{
          backgroundColor: '#111E2E',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          padding: '16px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Processing / Assessing
            </span>
            <span style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              background: 'rgba(20, 184, 166, 0.12)',
              color: '#2DD4BF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Cpu size={15} />
            </span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#F8FAFC', lineHeight: 1.1 }}>
            {countProcessing}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
            AI triage &amp; guidance
          </div>
        </div>

        <div style={{
          backgroundColor: '#111E2E',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          padding: '16px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Awaiting Response
            </span>
            <span style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              background: 'rgba(245, 158, 11, 0.12)',
              color: '#F59E0B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Clock size={15} />
            </span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#F8FAFC', lineHeight: 1.1 }}>
            {countAwaiting}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
            Waiting for patient input
          </div>
        </div>
      </div>

      {/* ── Consultations List ─────────────────────────────────── */}
      {isLoading ? (
        <div style={{
          backgroundColor: '#111E2E',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          padding: '60px 20px',
          textAlign: 'center',
          color: '#94A3B8'
        }}>
          <RefreshCw size={24} className="spin text-teal-400" style={{ margin: '0 auto 10px auto', display: 'block' }} />
          <div>Connecting to active consultation stream…</div>
        </div>
      ) : calls.length === 0 ? (
        <div style={{
          backgroundColor: '#111E2E',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          padding: '64px 20px',
          textAlign: 'center',
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)'
        }}>
          <PhoneIncoming size={36} color="#475569" style={{ margin: '0 auto 12px auto', display: 'block' }} />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '6px' }}>
            {selectedDistrict
              ? `No consultations found for ${selectedDistrict}.`
              : 'No consultations are currently in progress.'}
          </h3>
          <p style={{ fontSize: '0.82rem', color: '#94A3B8', maxWidth: '440px', margin: '0 auto' }}>
            {selectedDistrict
              ? `There are currently no active live consultations in ${selectedDistrict}.`
              : 'Active patient consultations will appear here automatically when callers connect with VaaniDoc.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {calls.map((call) => {
            const linkedCase = cases.find(c =>
              (c.id && c.id === call.id) ||
              (c.patient?.id && c.patient.id === call.patient_id)
            );
            const caseCode = getCallCaseCode(call, linkedCase);
            const statusInfo = getHumanStatus(call.state);
            const liveSec = getLiveSeconds(call.started_at, call.duration_seconds);
            const isTechOpen = !!expandedTech[call.id];

            return (
              <div
                key={call.id}
                style={{
                  backgroundColor: '#111E2E',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)',
                  transition: 'background 0.15s ease'
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '14px'
                }}>
                  {/* Left block: Case ID, Patient, Location & Language */}
                  <div style={{ minWidth: '220px', flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        background: '#10B981',
                        boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.3)',
                        flexShrink: 0
                      }} />
                      <span style={{
                        fontFamily: 'monospace',
                        fontWeight: 800,
                        fontSize: '0.96rem',
                        color: '#2DD4BF',
                        letterSpacing: '0.02em'
                      }}>
                        {caseCode}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.84rem', color: '#E2E8F0', fontWeight: 600, marginBottom: '2px' }}>
                      Patient: <span style={{ fontFamily: 'monospace', color: '#F8FAFC' }}>{call.caller_phone || 'Web Voice User'}</span>
                    </div>

                    <div style={{
                      fontSize: '0.75rem',
                      color: '#94A3B8',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <MapPin size={11} />
                        {call.district || 'District Triage'}{call.village ? `, ${call.village}` : ''}
                      </span>
                      <span>•</span>
                      <span>{formatLanguage(call.language)}</span>
                    </div>
                  </div>

                  {/* Middle block: Current Status & Started Time */}
                  <div style={{ minWidth: '150px' }}>
                    <div style={{ marginBottom: '4px' }}>
                      <span style={{
                        display: 'inline-block',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        padding: '3px 9px',
                        borderRadius: '6px',
                        backgroundColor: statusInfo.bg,
                        color: statusInfo.color,
                        border: `1px solid ${statusInfo.border}`
                      }}>
                        {statusInfo.label}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.73rem', color: '#94A3B8' }}>
                      {formatRelativeTime(call.started_at)}
                    </div>
                  </div>

                  {/* Right block: Live Duration & View Case Action */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    flexShrink: 0
                  }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        fontSize: '0.98rem',
                        fontWeight: 700,
                        color: '#F8FAFC',
                        fontFamily: 'monospace'
                      }}>
                        {formatDuration(liveSec)}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#64748B' }}>
                        Duration
                      </div>
                    </div>

                    <button
                      onClick={() => handleOpenCase(call, linkedCase)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'rgba(20, 184, 166, 0.12)',
                        border: '1px solid rgba(20, 184, 166, 0.3)',
                        borderRadius: '8px',
                        padding: '8px 14px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        color: '#2DD4BF',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Eye size={13} />
                      <span>View Case</span>
                    </button>
                  </div>
                </div>

                {/* Secondary Technical Details Toggle */}
                <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.04)' }}>
                  <button
                    onClick={() => toggleTech(call.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      color: '#64748B',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span>Technical details</span>
                    {isTechOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                  </button>

                  {isTechOpen && (
                    <div style={{
                      marginTop: '8px',
                      padding: '10px 14px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(0, 0, 0, 0.25)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      fontSize: '0.73rem',
                      color: '#94A3B8',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '8px'
                    }}>
                      <div>
                        <span style={{ color: '#64748B' }}>Call Session ID: </span>
                        <code style={{ color: '#CBD5E1', fontSize: '0.7rem' }}>{call.id}</code>
                      </div>
                      <div>
                        <span style={{ color: '#64748B' }}>Provider: </span>
                        <strong style={{ color: '#E2E8F0' }}>{call.provider?.toUpperCase() || 'WEB'}</strong>
                      </div>
                      {call.provider_call_id && (
                        <div>
                          <span style={{ color: '#64748B' }}>Provider Call SID: </span>
                          <code style={{ color: '#CBD5E1', fontSize: '0.7rem' }}>{call.provider_call_id}</code>
                        </div>
                      )}
                      {call.timeline_events && call.timeline_events.length > 0 && (
                        <div style={{ gridColumn: '1 / -1' }}>
                          <span style={{ color: '#64748B' }}>Latest Engine Step: </span>
                          <span style={{ color: '#E2E8F0' }}>
                            {call.timeline_events[call.timeline_events.length - 1]?.stage} — {call.timeline_events[call.timeline_events.length - 1]?.details || 'In progress'}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Shared Case Detail Modal ───────────────────────────── */}
      {selectedCase && (
        <AshaCaseDetailModal
          selectedCase={selectedCase}
          onClose={() => setSelectedCase(null)}
          onSaveSuccess={loadData}
          showToast={showToast}
          user={user}
        />
      )}

    </div>
  );
}
