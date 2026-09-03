import React, { useState, useEffect } from 'react';
import {
  PhoneIncoming, AlertTriangle, Building2, Home,
  CalendarClock, Activity, CheckCircle2, Clock, MapPin,
  ArrowRight, RefreshCw, Radio
} from 'lucide-react';
import { fetchTodayOverview, fetchActiveCalls } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import DistrictCombobox from '../components/Common/DistrictCombobox';

// ── Formatting Helpers ─────────────────────────────────────────────

function formatIST(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit', minute: '2-digit', hour12: true
    }).format(new Date(dateStr));
  } catch { return dateStr; }
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return '—';
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return formatIST(dateStr);
  } catch { return '—'; }
}

function formatDuration(seconds) {
  if (!seconds) return '0s';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

// ── Sub-components ─────────────────────────────────────────────────

/**
 * KPI Card with unified dark theme styling.
 * Uses dark navy/slate surface (#111E2E) matching the Admin Operations foundation.
 * Consistent restrained teal icon container.
 * Highlights in red only when emergency count > 0.
 */
function KpiCard({ icon: Icon, label, value, sub, isEmergency }) {
  const hasEmergency = isEmergency && value > 0;

  return (
    <div style={{
      backgroundColor: hasEmergency ? 'rgba(239, 68, 68, 0.12)' : '#111E2E',
      border: `1px solid ${hasEmergency ? 'rgba(239, 68, 68, 0.35)' : 'rgba(255, 255, 255, 0.08)'}`,
      borderRadius: '12px',
      padding: '18px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.25)',
      transition: 'all 0.15s ease'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          fontSize: '0.72rem',
          fontWeight: 700,
          color: hasEmergency ? '#FCA5A5' : '#94A3B8',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}>
          {label}
        </span>
        <span style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          background: hasEmergency ? 'rgba(239, 68, 68, 0.2)' : 'rgba(20, 184, 166, 0.12)',
          color: hasEmergency ? '#EF4444' : '#14B8A6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Icon size={16} />
        </span>
      </div>

      <div style={{
        fontSize: '1.9rem',
        fontWeight: 800,
        color: hasEmergency ? '#EF4444' : '#F8FAFC',
        lineHeight: 1.1,
        fontVariantNumeric: 'tabular-nums'
      }}>
        {value ?? 0}
      </div>

      {sub && (
        <div style={{
          fontSize: '0.73rem',
          color: hasEmergency ? '#F87171' : '#64748B',
          marginTop: '-2px'
        }}>
          {sub}
        </div>
      )}
    </div>
  );
}

/**
 * Needs Attention section with dark theme styling.
 * Slightly lighter dark navy/slate surface with a subtle amber accent border.
 */
function NeedsAttentionSection({ urgentCases, onNavigateTo }) {
  const actionableItems = [];

  (urgentCases || []).forEach(c => {
    actionableItems.push({
      id: c.call_id,
      type: c.triage_level === 4 ? 'emergency' : 'hospital',
      label: c.triage_level === 4 ? 'Emergency' : 'Hospital Referral',
      detail: `${c.district || 'Unknown District'} • ${c.language?.toUpperCase() || 'HI'}`,
      time: formatRelativeTime(c.started_at),
      level: c.triage_level
    });
  });

  const hasItems = actionableItems.length > 0;

  return (
    <div style={{
      backgroundColor: '#111E2E',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderLeft: hasItems ? '4px solid #F59E0B' : '4px solid #10B981',
      borderRadius: '12px',
      overflow: 'hidden',
      marginBottom: '24px',
      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.25)'
    }}>
      {/* Header */}
      <div style={{
        padding: '13px 20px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: hasItems ? 'rgba(245, 158, 11, 0.08)' : 'rgba(16, 185, 129, 0.06)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {hasItems
            ? <AlertTriangle size={17} color="#F59E0B" />
            : <CheckCircle2 size={17} color="#10B981" />}
          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#F8FAFC' }}>
            {hasItems ? 'Needs Attention' : 'All Clear'}
          </span>
          {hasItems && (
            <span style={{
              background: 'rgba(245, 158, 11, 0.2)',
              color: '#FCD34D',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              fontSize: '0.7rem',
              fontWeight: 800,
              padding: '1px 8px',
              borderRadius: '9999px'
            }}>
              {actionableItems.length}
            </span>
          )}
        </div>

        <button
          style={{
            fontSize: '0.75rem',
            color: '#14B8A6',
            fontWeight: 600,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
          onClick={() => onNavigateTo('cases')}
        >
          <span>View all cases</span>
          <ArrowRight size={12} />
        </button>
      </div>

      {/* Content */}
      {!hasItems ? (
        <div style={{
          padding: '20px',
          fontSize: '0.84rem',
          color: '#34D399',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <CheckCircle2 size={16} />
          <span>No cases currently require immediate attention.</span>
        </div>
      ) : (
        <div>
          {actionableItems.map((item, idx) => {
            const isEmerg = item.level === 4;
            return (
              <div key={idx} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '12px 20px',
                borderBottom: idx < actionableItems.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
                backgroundColor: 'transparent'
              }}>
                {/* Status Dot */}
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: isEmerg ? '#EF4444' : '#F59E0B',
                  flexShrink: 0
                }} />

                {/* Semantic Triage Badge */}
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '5px',
                  background: isEmerg ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                  color: isEmerg ? '#FCA5A5' : '#FCD34D',
                  border: `1px solid ${isEmerg ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}>
                  {item.label}
                </span>

                {/* Case details */}
                <span style={{ fontSize: '0.82rem', color: '#E2E8F0', flex: 1, minWidth: 0 }}>
                  {item.detail}
                </span>

                {/* Relative timestamp */}
                <span style={{ fontSize: '0.73rem', color: '#94A3B8', flexShrink: 0 }}>
                  {item.time}
                </span>

                {/* Coordinate Action Button */}
                <button
                  style={{
                    background: '#DC2626',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '5px 12px',
                    fontSize: '0.73rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    flexShrink: 0,
                    transition: 'background 0.15s ease'
                  }}
                  onClick={() => onNavigateTo('cases')}
                >
                  Coordinate
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Live Consultations card with dark navy theme and teal/green live indicators.
 */
function LiveConsultationsCard({ activeCalls, selectedDistrict, onNavigateTo }) {
  return (
    <div style={{
      backgroundColor: '#111E2E',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.25)'
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 18px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#10B981',
              boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.35)',
              animation: activeCalls.length > 0 ? 'pulse 2s infinite' : 'none'
            }} />
            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#F8FAFC' }}>
              Live Consultations
            </span>
          </div>
          <span style={{
            fontSize: '0.7rem',
            fontWeight: 700,
            padding: '1px 7px',
            borderRadius: '9999px',
            background: activeCalls.length > 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.06)',
            color: activeCalls.length > 0 ? '#34D399' : '#94A3B8'
          }}>
            {activeCalls.length} active
          </span>
        </div>

        <button
          style={{
            fontSize: '0.73rem',
            color: '#14B8A6',
            fontWeight: 600,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
          onClick={() => onNavigateTo('live_calls')}
        >
          View all <ArrowRight size={12} />
        </button>
      </div>

      {/* Body */}
      <div style={{ maxHeight: '310px', overflowY: 'auto' }}>
        {activeCalls.length === 0 ? (
          <div style={{
            padding: '40px 20px',
            textAlign: 'center',
            fontSize: '0.82rem',
            color: '#94A3B8'
          }}>
            <Radio size={22} color="#475569" style={{ margin: '0 auto 8px auto', display: 'block' }} />
            {selectedDistrict
              ? `No active consultations in ${selectedDistrict} right now.`
              : 'No voice consultations in progress at this moment.'}
          </div>
        ) : (
          activeCalls.slice(0, 6).map((call) => (
            <div key={call.id} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 18px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.04)'
            }}>
              {/* Live indicator dot */}
              <span style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: '#10B981',
                flexShrink: 0
              }} />

              {/* Main info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: '#F8FAFC',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#2DD4BF', fontWeight: 700 }}>
                    {call.caller_phone || 'Web Voice User'}
                  </span>
                </div>
                <div style={{
                  fontSize: '0.72rem',
                  color: '#94A3B8',
                  marginTop: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <span>{call.language?.toUpperCase() || 'HI'}</span>
                  {call.district && (
                    <>
                      <span>•</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <MapPin size={10} />
                        {call.district}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Status badge */}
              <span style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                padding: '2px 7px',
                borderRadius: '5px',
                background: 'rgba(16, 185, 129, 0.12)',
                color: '#34D399',
                border: '1px solid rgba(16, 185, 129, 0.25)'
              }}>
                {call.state || 'Listening'}
              </span>

              {/* Duration */}
              <span style={{
                fontSize: '0.72rem',
                color: '#64748B',
                fontFamily: 'monospace',
                flexShrink: 0,
                minWidth: '36px',
                textAlign: 'right'
              }}>
                {formatDuration(call.duration_seconds)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/**
 * Recent Activity feed with dark navy theme and semantic triage badges.
 */
function RecentActivityCard({ recentActivity, selectedDistrict, onNavigateTo }) {
  const getBadgeStyle = (cat, level) => {
    if (level === 4 || cat === 'emergency') {
      return {
        label: 'Emergency',
        color: '#FCA5A5',
        bg: 'rgba(239, 68, 68, 0.15)',
        border: 'rgba(239, 68, 68, 0.3)'
      };
    }
    if (level === 3 || cat === 'hospital') {
      return {
        label: 'Hospital',
        color: '#FCD34D',
        bg: 'rgba(245, 158, 11, 0.15)',
        border: 'rgba(245, 158, 11, 0.3)'
      };
    }
    if (level === 2 || cat === 'phc') {
      return {
        label: 'PHC Referral',
        color: '#93C5FD',
        bg: 'rgba(59, 130, 246, 0.15)',
        border: 'rgba(59, 130, 246, 0.3)'
      };
    }
    return {
      label: 'Home Care',
      color: '#6EE7B7',
      bg: 'rgba(16, 185, 129, 0.15)',
      border: 'rgba(16, 185, 129, 0.3)'
    };
  };

  return (
    <div style={{
      backgroundColor: '#111E2E',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.25)'
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 18px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <Activity size={16} color="#14B8A6" />
          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#F8FAFC' }}>
            Recent Activity
          </span>
        </div>
        <button
          style={{
            fontSize: '0.73rem',
            color: '#14B8A6',
            fontWeight: 600,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
          onClick={() => onNavigateTo('analytics')}
        >
          Analytics <ArrowRight size={12} />
        </button>
      </div>

      {/* Body */}
      <div style={{ maxHeight: '310px', overflowY: 'auto' }}>
        {!recentActivity || recentActivity.length === 0 ? (
          <div style={{
            padding: '40px 20px',
            textAlign: 'center',
            fontSize: '0.82rem',
            color: '#94A3B8'
          }}>
            <Activity size={22} color="#475569" style={{ margin: '0 auto 8px auto', display: 'block' }} />
            {selectedDistrict
              ? `No recent consultations found in ${selectedDistrict}.`
              : 'No consultation activity to display yet.'}
          </div>
        ) : (
          recentActivity.map((act, idx) => {
            const shortId = act.call_id_short || (act.call_id || '').slice(-6).toUpperCase();
            const badge = getBadgeStyle(act.triage_category, act.triage_level);

            return (
              <div key={idx} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '11px 18px',
                borderBottom: idx < recentActivity.length - 1 ? '1px solid rgba(255, 255, 255, 0.04)' : 'none'
              }}>
                {/* Neutral icon container */}
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  color: '#14B8A6'
                }}>
                  <CheckCircle2 size={14} color="#14B8A6" />
                </div>

                {/* Main info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#F8FAFC' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#2DD4BF', fontWeight: 700 }}>
                      #{shortId}
                    </span>
                    {' — '}
                    <span>Consultation completed</span>
                  </div>
                  <div style={{
                    fontSize: '0.72rem',
                    color: '#94A3B8',
                    marginTop: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}>
                    {/* Semantic triage badge */}
                    <span style={{
                      padding: '1px 6px',
                      borderRadius: '4px',
                      background: badge.bg,
                      color: badge.color,
                      border: `1px solid ${badge.border}`,
                      fontSize: '0.68rem',
                      fontWeight: 700
                    }}>
                      {badge.label}
                    </span>
                    {act.district && (
                      <>
                        <span>•</span>
                        <span>{act.district}</span>
                      </>
                    )}
                    {act.language && (
                      <>
                        <span>•</span>
                        <span>{act.language.toUpperCase()}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Relative timestamp */}
                <span style={{ fontSize: '0.7rem', color: '#64748B', flexShrink: 0 }}>
                  {formatRelativeTime(act.ended_at)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Main Overview Page ─────────────────────────────────────────────

export default function OverviewPage({ onNavigateTo }) {
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [activeCalls, setActiveCalls] = useState([]);
  const [urgentCases, setUrgentCases] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadData = async () => {
    try {
      const params = { exclude_demo: true };
      if (selectedDistrict) params.district = selectedDistrict;

      const [overview, calls] = await Promise.all([
        fetchTodayOverview(params),
        fetchActiveCalls(params)
      ]);
      setData(overview);
      setActiveCalls(calls);
      setUrgentCases(overview?.urgent_cases || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Overview load failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 8000);
    return () => clearInterval(interval);
  }, [selectedDistrict]);

  if (isLoading) {
    return (
      <div className="empty-state">
        <RefreshCw size={22} className="spin text-teal-400" />
        <div className="empty-state-title" style={{ marginTop: '8px', color: '#94A3B8' }}>
          Loading operations overview…
        </div>
      </div>
    );
  }

  const d = data || {};

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 4px' }}>

      {/* ── Page Header ───────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: '28px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '4px' }}>
            Operations Overview
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#94A3B8' }}>
            Real-time health consultation monitoring and triage coordination
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ minWidth: '210px' }}>
            <DistrictCombobox
              selectedDistrict={selectedDistrict || ''}
              onSelectDistrict={(dist) => setSelectedDistrict(
                dist === 'All Districts' || dist === 'All Districts (India)' ? '' : dist
              )}
              showAllOption={true}
              allOptionLabel="All Districts"
              placeholder="All Districts"
              id="overview-district-filter"
            />
          </div>

          {lastUpdated && (
            <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
              Updated {formatIST(lastUpdated)}
            </span>
          )}

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

      {/* ── District banner (Restrained Dark Teal Tone) ───────── */}
      {selectedDistrict && (
        <div style={{
          background: 'rgba(20, 184, 166, 0.1)',
          border: '1px solid rgba(20, 184, 166, 0.25)',
          borderRadius: '8px',
          padding: '8px 14px',
          marginBottom: '20px',
          fontSize: '0.78rem',
          color: '#2DD4BF',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <MapPin size={13} />
          <span>Showing data for <strong style={{ color: '#FFFFFF' }}>{selectedDistrict}</strong></span>
        </div>
      )}

      {/* ── KPI Grid (Consistent Dark Navy Card Style) ───────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '14px',
        marginBottom: '28px'
      }}>
        <KpiCard
          icon={PhoneIncoming}
          label="Consultations Today"
          value={d.calls_today ?? 0}
          sub={selectedDistrict ? `In ${selectedDistrict}` : 'All active districts'}
        />
        <KpiCard
          icon={Radio}
          label="Active Consultations"
          value={d.active_calls ?? activeCalls.length}
          sub="In-progress voice calls"
        />
        <KpiCard
          icon={AlertTriangle}
          label="Emergency Cases"
          value={d.emergency_today ?? 0}
          sub="Level 4 — 108 escalations"
          isEmergency={true}
        />
        <KpiCard
          icon={Building2}
          label="Hospital Referrals"
          value={d.hospital_today ?? 0}
          sub="Level 3 — CHC / Hospital"
        />
        <KpiCard
          icon={Home}
          label="PHC Referrals"
          value={d.phc_today ?? 0}
          sub="Level 2 — Primary Care"
        />
        <KpiCard
          icon={CalendarClock}
          label="Follow-ups Due"
          value={d.followups_due ?? 0}
          sub="Scheduled community visits"
        />
      </div>

      {/* ── Needs Attention (Subtle Dark Amber) ───────────────── */}
      <NeedsAttentionSection
        urgentCases={urgentCases}
        onNavigateTo={onNavigateTo}
      />

      {/* ── Live Consultations + Recent Activity (Dark Slate) ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: '18px'
      }}>
        <LiveConsultationsCard
          activeCalls={activeCalls}
          selectedDistrict={selectedDistrict}
          onNavigateTo={onNavigateTo}
        />
        <RecentActivityCard
          recentActivity={d.recent_activity || []}
          selectedDistrict={selectedDistrict}
          onNavigateTo={onNavigateTo}
        />
      </div>

    </div>
  );
}
