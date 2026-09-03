import React, { useState, useEffect } from 'react';
import {
  ListChecks, Search, Eye, Clock, MapPin, X,
  Activity, FileText, AlertTriangle, CheckCircle2,
  Loader, Bell, Calendar
import { fetchCalls, fetchCallDetail } from '../services/api';
import { INDIAN_STATES_DISTRICTS } from '../data/districts';

function formatIST(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    }).format(new Date(dateStr));
  } catch { return dateStr; }
}

function formatDuration(s) {
  if (!s) return '—';
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

function TriageBadge({ level, category }) {
  const map = {
    1: ['badge-home', 'L1 — Home Care'],
    2: ['badge-phc', 'L2 — PHC'],
    3: ['badge-hospital', 'L3 — Hospital'],
    4: ['badge-emergency', 'L4 — Emergency']
  };
  const [cls, label] = map[level] || ['badge-muted', category || 'Processing'];
  return <span className={`badge ${cls}`}>{label}</span>;
}

function SectionHeader({ title, color = 'var(--text-muted)' }) {
  return (
    <div style={{
      fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.05em', color, marginBottom: '10px'
    }}>{title}</div>
  );
}

function CallDetailModal({ callId, onClose, showToast }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const d = await fetchCallDetail(callId);
        setDetail(d);
      } catch (err) {
        if (showToast) showToast('Failed to load call detail: ' + err.message);
        onClose();
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [callId]);

  const tr = detail?.triage_results?.[0];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box"
        style={{ maxWidth: '760px', maxHeight: '88vh', overflowY: 'auto', position: 'relative' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '18px', right: '18px',
            width: '28px', height: '28px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)', color: 'var(--text-secondary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          <X size={15} />
        </button>

        {loading ? (
          <div className="empty-state" style={{ padding: '50px' }}>
            <Loader size={24} className="spin" style={{ color: 'var(--brand-primary-light)' }} />
            <div className="empty-state-title">Loading call record...</div>
          </div>
        ) : !detail ? null : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Modal Header */}
            <div>
              <div className="flex-row gap-3" style={{ flexWrap: 'wrap', marginBottom: '6px' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Call Record
                </h2>
                {tr && <TriageBadge level={tr.level} category={tr.category} />}
                {detail.is_demo && <span className="badge badge-warning">Simulator</span>}
                {!detail.is_demo && (
                  <span className="badge badge-success">Real Call · {detail.provider?.toUpperCase()}</span>
                )}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                ID: {detail.id} &nbsp;·&nbsp;
                {formatIST(detail.started_at)} &nbsp;·&nbsp;
                {detail.district || '—'}{detail.village ? `, ${detail.village}` : ''}
              </div>
            </div>

            {/* Quick Summary Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
              {[
                { label: 'Duration', value: formatDuration(detail.duration_seconds) },
                { label: 'Language', value: detail.language?.toUpperCase() },
                { label: 'Status', value: detail.status },
                { label: 'Transcripts', value: detail.transcripts?.length ?? 0 },
                { label: 'Symptoms', value: detail.symptoms?.length ?? 0 },
              ].map(s => (
                <div key={s.label} style={{
                  padding: '10px 12px', background: 'var(--bg-card-subtle)',
                  borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)'
                }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px' }}>{s.label}</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>{s.value ?? '—'}</div>
                </div>
              ))}
            </div>

            {/* Transcript */}
            {detail.transcripts?.length > 0 && (
              <div style={{ background: 'var(--bg-card-subtle)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <SectionHeader title="Patient Transcript" color="var(--brand-primary-light)" />
                {detail.transcripts.map((t, i) => (
                  <div key={i} style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: i < detail.transcripts.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontStyle: 'italic', lineHeight: '1.5' }}>
                      "{t.transcript}"
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Turn {t.turn_index} &nbsp;·&nbsp; Language: {t.language}
                      &nbsp;·&nbsp; Confidence: {t.confidence ? `${(t.confidence * 100).toFixed(0)}%` : '—'}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Symptoms */}
            {detail.symptoms?.length > 0 && (
              <div>
                <SectionHeader title="Detected Clinical Symptoms" color="var(--color-warning)" />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {detail.symptoms.map((s, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '5px 12px', borderRadius: 'var(--radius-sm)',
                        background: s.is_negated ? 'rgba(255,255,255,0.04)'
                          : s.is_red_flag ? 'var(--color-danger-bg)' : 'var(--color-info-bg)',
                        border: `1px solid ${s.is_negated ? 'var(--border-subtle)'
                          : s.is_red_flag ? 'var(--color-danger-border)' : 'var(--color-info-border)'}`,
                        fontSize: '0.82rem'
                      }}
                    >
                      <strong style={{ color: s.is_negated ? 'var(--text-muted)' : s.is_red_flag ? 'var(--color-danger)' : 'var(--text-primary)' }}>
                        {s.hindi_term || s.symptom_name}
                      </strong>
                      {s.duration_val && <span style={{ color: 'var(--text-muted)', marginLeft: '5px' }}>({s.duration_val} {s.duration_unit})</span>}
                      {s.severity && <span style={{ color: 'var(--text-secondary)', marginLeft: '4px' }}>[{s.severity}]</span>}
                      {s.is_negated && <span style={{ color: 'var(--text-dim)', marginLeft: '4px', fontSize: '0.7rem' }}>negated</span>}
                      {s.is_red_flag && <span style={{ color: 'var(--color-danger)', marginLeft: '4px', fontSize: '0.7rem' }}>⚠ red flag</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Triage Decision */}
            {tr && (
              <div style={{ background: 'var(--bg-card-subtle)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <SectionHeader title="Triage Decision" color="var(--brand-accent)" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div>
                    <span className="text-xs text-muted">Protocol Rule: </span>
                    <code style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '4px', color: 'var(--brand-primary-light)' }}>
                      {tr.rule_id}
                    </code>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{tr.reason}</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)', fontStyle: 'italic', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                    Voice Guidance: {tr.voice_guidance_text}
                  </div>
                  {tr.recommended_action && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-success)', fontWeight: 600 }}>
                      ✓ {tr.recommended_action}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* System Timeline */}
            {detail.timeline_events?.length > 0 && (
              <div>
                <SectionHeader title="Processing Timeline (IST)" color="var(--text-muted)" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {detail.timeline_events.map((evt, i) => (
                    <div key={i} style={{ display: 'flex', gap: '10px', fontSize: '0.78rem' }}>
                      <span style={{ color: 'var(--brand-primary-light)', fontFamily: 'monospace', minWidth: '86px', fontWeight: 600 }}>
                        {evt.time}
                      </span>
                      <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--brand-accent)', flexShrink: 0, marginTop: '4px' }} />
                      <div style={{ flex: 1 }}>
                        <strong style={{ color: 'var(--text-primary)' }}>{evt.stage}</strong>
                        {evt.details && <div style={{ color: 'var(--text-muted)', marginTop: '1px' }}>{evt.details}</div>}
                        {evt.latency_ms && <span style={{ color: 'var(--text-dim)', fontSize: '0.7rem' }}> {evt.latency_ms}ms</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CallsPage({ showToast }) {
  const [calls, setCalls] = useState([]);
  const [levelFilter, setLevelFilter] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [excludeDemo, setExcludeDemo] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCallId, setSelectedCallId] = useState(null);

  const loadCalls = async () => {
    try {
      const params = {};
      if (levelFilter) params.level = levelFilter;
      if (districtFilter) params.district = districtFilter;
      if (excludeDemo) params.exclude_demo = true;
      const data = await fetchCalls(params);
      setCalls(data);
    } catch (err) {
      console.error('Call log load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCalls();
    const interval = setInterval(loadCalls, 10000);
    return () => clearInterval(interval);
  }, [levelFilter, districtFilter, excludeDemo]);

  const filteredCalls = calls.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (c.caller_phone && c.caller_phone.toLowerCase().includes(q)) ||
      (c.top_symptom && c.top_symptom.toLowerCase().includes(q)) ||
      (c.district && c.district.toLowerCase().includes(q)) ||
      (c.id && c.id.toLowerCase().includes(q))
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Header */}
      <div className="flex-between" style={{ flexWrap: 'wrap', gap: '12px' }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1 className="page-title">Call Logs</h1>
          <p className="page-subtitle">
            Auditable health guidance sessions from telephony — {filteredCalls.length} records
          </p>
        </div>

        {/* Filters */}
        <div className="flex-row gap-3" style={{ flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} color="var(--text-dim)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search ID, symptom, district..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '30px', minWidth: '220px', padding: '7px 12px 7px 30px' }}
            />
          </div>
          <select value={districtFilter} onChange={e => setDistrictFilter(e.target.value)} style={{ padding: '7px 10px', minWidth: '140px' }}>
            <option value="">All Districts (India)</option>
            {Object.entries(INDIAN_STATES_DISTRICTS).map(([stateName, distList]) => (
              <optgroup key={stateName} label={stateName}>
                {distList.map(d => (
                  <option key={`${stateName}-${d}`} value={d}>{d} ({stateName})</option>
                ))}
              </optgroup>
            ))}
          </select>
          <select value={levelFilter} onChange={e => setLevelFilter(e.target.value)} style={{ padding: '7px 10px', minWidth: '170px' }}>
            <option value="">All Triage Levels</option>
            <option value="4">Level 4 — Emergency</option>
            <option value="3">Level 3 — Hospital</option>
            <option value="2">Level 2 — PHC</option>
            <option value="1">Level 1 — Home Care</option>
          </select>
          <label className="flex-row gap-2 text-sm" style={{ cursor: 'pointer', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
            <input
              type="checkbox"
              checked={excludeDemo}
              onChange={e => setExcludeDemo(e.target.checked)}
              style={{ accentColor: 'var(--brand-primary)', width: '14px', height: '14px' }}
            />
            Real calls only
          </label>
        </div>
      </div>

      {/* Table */}
      <div className="v-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="v-table v-table-clickable">
          <thead>
            <tr>
              <th style={{ padding: '12px 16px' }}>Call ID</th>
              <th style={{ padding: '12px 16px' }}>Source</th>
              <th style={{ padding: '12px 16px' }}>Location</th>
              <th style={{ padding: '12px 16px' }}>Triage</th>
              <th style={{ padding: '12px 16px' }}>Top Symptom</th>
              <th style={{ padding: '12px 16px' }}>Duration</th>
              <th style={{ padding: '12px 16px' }}>Started (IST)</th>
              <th style={{ padding: '12px 16px' }}></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && filteredCalls.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px' }}>
                  <div className="empty-state" style={{ padding: 0 }}>
                    <Loader size={20} className="spin" style={{ color: 'var(--brand-primary-light)' }} />
                    <span className="text-sm text-muted">Loading records...</span>
                  </div>
                </td>
              </tr>
            ) : filteredCalls.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px' }}>
                  <div className="empty-state" style={{ padding: 0 }}>
                    <ListChecks size={28} className="empty-state-icon" />
                    <div className="empty-state-title">No records found</div>
                    <p className="empty-state-desc">Run a simulation or receive a real call to generate records.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredCalls.map(call => (
                <tr key={call.id} onClick={() => setSelectedCallId(call.id)}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontFamily: 'monospace', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      #{call.id.slice(-8).toUpperCase()}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>{call.caller_phone || '—'}</div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {call.is_demo
                      ? <span className="badge badge-warning">Simulator</span>
                      : <span className="badge badge-success">● {call.provider?.toUpperCase()}</span>
                    }
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div className="flex-row gap-1 text-sm">
                      <MapPin size={12} style={{ flexShrink: 0 }} />
                      {call.district || '—'}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <TriageBadge level={call.triage_level} category={call.triage_category} />
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                    {call.top_symptom || '—'}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                    {formatDuration(call.duration_seconds)}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                    {formatIST(call.started_at)}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={e => { e.stopPropagation(); setSelectedCallId(call.id); }}
                    >
                      <Eye size={13} /> Inspect
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {selectedCallId && (
        <CallDetailModal
          callId={selectedCallId}
          onClose={() => setSelectedCallId(null)}
          showToast={showToast}
        />
      )}
    </div>
  );
}
