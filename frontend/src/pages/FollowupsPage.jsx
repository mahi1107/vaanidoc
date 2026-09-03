import React, { useState, useEffect } from 'react';
import { 
  Clock3, 
  CheckCircle, 
  PhoneCall, 
  Calendar, 
  MapPin, 
  UserCheck, 
  RotateCcw,
  X,
  Radio,
  FileCheck,
  AlertTriangle
} from 'lucide-react';
import { fetchFollowups, completeFollowup, rescheduleFollowup } from '../services/api';
import DistrictCombobox from '../components/Common/DistrictCombobox';

function formatIST(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(d);
  } catch (e) {
    return dateStr;
  }
}

export default function FollowupsPage({ onUpdate, showToast }) {
  const [followups, setFollowups] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [selectedFollowup, setSelectedFollowup] = useState(null);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [outcome, setOutcome] = useState('recovered');
  const [patientResponseText, setPatientResponseText] = useState('अब तबियत काफी बेहतर है, बुखार उतर गया है।');
  const [notes, setNotes] = useState('Patient confirms symptom resolution with oral hydration and rest.');

  const [callModalOpen, setCallModalOpen] = useState(false);
  const [callDetails, setCallDetails] = useState(null);

  const loadData = async () => {
    try {
      const params = { exclude_demo: true };
      if (statusFilter) params.status = statusFilter;
      if (districtFilter) params.district = districtFilter;
      const data = await fetchFollowups(params);
      setFollowups(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 4000);
    return () => clearInterval(interval);
  }, [statusFilter, districtFilter]);

  const handleOpenComplete = (f) => {
    setSelectedFollowup(f);
    setCompleteModalOpen(true);
  };

  const handleSaveComplete = async () => {
    if (!selectedFollowup) return;
    try {
      await completeFollowup(selectedFollowup.id, {
        outcome,
        patient_response_text: patientResponseText,
        notes
      });
      setCompleteModalOpen(false);
      if (showToast) showToast(`✅ Follow-up marked completed: Outcome "${outcome}".`);
      loadData();
      if (onUpdate) onUpdate();
    } catch (err) {
      if (showToast) showToast('❌ Failed to complete follow-up: ' + err.message);
    }
  };

  const handleReschedule = async (fId) => {
    try {
      await rescheduleFollowup(fId, 24);
      if (showToast) showToast('🗓️ Follow-up rescheduled +24 hours.');
      loadData();
      if (onUpdate) onUpdate();
    } catch (err) {
      if (showToast) showToast('❌ Failed to reschedule: ' + err.message);
    }
  };

  const handleTriggerCall = async (f) => {
    try {
      const res = await triggerFollowupCallNow(f.id);
      setCallDetails({ ...res, followup: f });
      setCallModalOpen(true);
    } catch (err) {
      if (showToast) showToast('❌ Call initiation failed: ' + err.message);
    }
  };

  const totalCount = followups.length;
  const completedCount = followups.filter(f => f.status === 'completed').length;
  const pendingCount = followups.filter(f => f.status === 'pending').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Clock3 size={26} color="#10B981" />
            <span>24-Hour Patient Follow-up Triage</span>
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Automated check-in schedule to reassess rural patients 24 hours post-triage and verify clinical outcomes.
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ minWidth: '200px' }}>
            <DistrictCombobox
              selectedDistrict={districtFilter || ''}
              onSelectDistrict={(dist) => setDistrictFilter(dist === 'All Districts' || dist === 'All Districts (India)' ? '' : dist)}
              showAllOption={true}
              allOptionLabel="All Districts"
              placeholder="All Districts"
              id="followups-district-filter"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '8px 12px',
              color: '#FFFFFF',
              fontSize: '0.85rem'
            }}
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending / Scheduled</option>
            <option value="due">Due Now</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {/* KPI Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div className="v-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6' }}>
            <Calendar size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Scheduled</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#FFFFFF' }}>{totalCount}</div>
          </div>
        </div>

        <div className="v-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B' }}>
            <Clock3 size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Pending Reassessments</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#F59E0B' }}>{pendingCount}</div>
          </div>
        </div>

        <div className="v-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#10B981' }}>
            <CheckCircle size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Completed Outcomes</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10B981' }}>{completedCount}</div>
          </div>
        </div>
      </div>

      {/* Follow-up Cases Table */}
      <div className="v-card" style={{ padding: '0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ background: 'var(--bg-card-subtle)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
              <th style={{ padding: '14px 20px' }}>Call Session Ref</th>
              <th style={{ padding: '14px 20px' }}>Scheduled For</th>
              <th style={{ padding: '14px 20px' }}>Status</th>
              <th style={{ padding: '14px 20px' }}>Outcome</th>
              <th style={{ padding: '14px 20px' }}>Patient Feedback</th>
              <th style={{ padding: '14px 20px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Loading follow-up records...
                </td>
              </tr>
            ) : followups.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  {districtFilter ? "No consultations found for this district." : "No follow-up records found."}
                </td>
              </tr>
            ) : (
              followups.map((f) => (
                <tr
                  key={f.id}
                  style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)', transition: 'background 0.15s ease' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ fontWeight: 600, color: '#FFFFFF' }}>Call ID: {f.call_session_id.slice(0, 8)}...</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Created: {formatIST(f.created_at)}</div>
                  </td>
                  <td style={{ padding: '14px 20px', color: 'var(--text-main)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock3 size={14} color="#60A5FA" />
                      <span>{formatIST(f.scheduled_for)}</span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <span style={{
                      fontSize: '0.75rem',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: f.status === 'completed' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      color: f.status === 'completed' ? '#10B981' : '#F59E0B',
                      fontWeight: 700,
                      textTransform: 'uppercase'
                    }}>
                      {f.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px', color: '#FFFFFF', fontWeight: 600 }}>
                    {f.outcome ? (
                      <span style={{ textTransform: 'capitalize' }}>{f.outcome.replace('_', ' ')}</span>
                    ) : (
                      <span style={{ color: 'var(--text-dim)' }}>Pending check</span>
                    )}
                  </td>
                  <td style={{ padding: '14px 20px', color: 'var(--text-muted)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {f.patient_response_text || '—'}
                  </td>
                  <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        onClick={() => handleTriggerCall(f)}
                        style={{
                          padding: '6px 10px',
                          background: 'rgba(59, 130, 246, 0.12)',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          borderRadius: 'var(--radius-sm)',
                          color: '#60A5FA',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        title="Simulate automated IVR check-in call"
                      >
                        <PhoneCall size={12} />
                        <span>Call</span>
                      </button>

                      {f.status !== 'completed' && (
                        <>
                          <button
                            onClick={() => handleOpenComplete(f)}
                            style={{
                              padding: '6px 10px',
                              background: 'rgba(16, 185, 129, 0.12)',
                              border: '1px solid rgba(16, 185, 129, 0.3)',
                              borderRadius: 'var(--radius-sm)',
                              color: '#10B981',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <CheckCircle size={12} />
                            <span>Resolve</span>
                          </button>

                          <button
                            onClick={() => handleReschedule(f.id)}
                            style={{
                              padding: '6px 8px',
                              background: 'var(--bg-card-subtle)',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: 'var(--radius-sm)',
                              color: 'var(--text-muted)',
                              fontSize: '0.75rem'
                            }}
                            title="Reschedule +24h"
                          >
                            <RotateCcw size={12} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Complete Modal */}
      {completeModalOpen && selectedFollowup && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200,
          padding: '20px'
        }}>
          <div className="v-card" style={{ maxWidth: '520px', width: '100%', position: 'relative' }}>
            <button
              onClick={() => setCompleteModalOpen(false)}
              style={{
                position: 'absolute',
                top: '18px',
                right: '18px',
                background: 'rgba(255,255,255,0.08)',
                borderRadius: '50%',
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF'
              }}
            >
              <X size={16} />
            </button>

            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '4px' }}>
              Complete 24h Patient Reassessment
            </h3>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '16px' }}>
              Session Ref: {selectedFollowup.call_session_id}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Clinical Outcome:
                </label>
                <select
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px 12px',
                    color: '#FFFFFF',
                    fontSize: '0.85rem'
                  }}
                >
                  <option value="recovered">Recovered / Symptoms Resolved (स्वस्थ)</option>
                  <option value="visited_phc">Visited PHC / ANM Consultation (पीएचसी जांच)</option>
                  <option value="visited_hospital">Visited District Hospital / CHC (अस्पताल परामर्श)</option>
                  <option value="escalated">Escalated to Medical Officer (विशेषज्ञ रेफरल)</option>
                  <option value="no_response">Patient Unreachable / No Response (संपर्क नहीं हुआ)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Patient Spoken Statement (Hindi):
                </label>
                <input
                  type="text"
                  value={patientResponseText}
                  onChange={(e) => setPatientResponseText(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px 12px',
                    color: '#FFFFFF',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Clinical Case Notes:
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px 12px',
                    color: '#FFFFFF',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button
                  onClick={handleSaveComplete}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                    borderRadius: 'var(--radius-sm)',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '0.85rem'
                  }}
                >
                  Save Outcome & Close Follow-up
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Automated IVR Call Simulated Modal */}
      {callModalOpen && callDetails && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200,
          padding: '20px'
        }}>
          <div className="v-card" style={{ maxWidth: '480px', width: '100%', position: 'relative' }}>
            <button
              onClick={() => setCallModalOpen(false)}
              style={{
                position: 'absolute',
                top: '18px',
                right: '18px',
                background: 'rgba(255,255,255,0.08)',
                borderRadius: '50%',
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF'
              }}
            >
              <X size={16} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.2)', color: '#10B981' }}>
                <PhoneCall size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#FFFFFF' }}>
                  Automated 24h Telephony Call
                </h3>
                <div style={{ fontSize: '0.75rem', color: '#10B981' }}>
                  Connected &bull; IVR Voice Broadcast
                </div>
              </div>
            </div>

            <div style={{ background: 'var(--bg-main)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', marginBottom: '16px' }}>
              <div style={{ fontSize: '0.7rem', color: '#60A5FA', fontWeight: 700, marginBottom: '4px' }}>
                Spoken Prompt (Hindi):
              </div>
              <div style={{ fontSize: '0.9rem', color: '#FFFFFF', fontStyle: 'italic' }}>
                "{callDetails.ivr_dialogue.prompt_hi}"
              </div>
            </div>

            <button
              onClick={() => {
                setCallModalOpen(false);
                handleOpenComplete(callDetails.followup);
              }}
              style={{
                width: '100%',
                padding: '10px',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: 'var(--radius-sm)',
                color: '#10B981',
                fontWeight: 700,
                fontSize: '0.85rem'
              }}
            >
              Log Patient Answer & Complete
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
