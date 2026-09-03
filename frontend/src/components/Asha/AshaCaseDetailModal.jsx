import React, { useState } from 'react';
import { 
  X, User, FileText, CheckCircle, ShieldAlert, 
  Hospital, CheckCircle2 
} from 'lucide-react';
import { recordCaseAction } from '../../services/api';

export default function AshaCaseDetailModal({ 
  selectedCase, 
  onClose, 
  onSaveSuccess, 
  showToast, 
  user 
}) {
  const [selectedAction, setSelectedAction] = useState('Visit completed');
  const [actionNotes, setActionNotes] = useState('');
  const [savingAction, setSavingAction] = useState(false);

  if (!selectedCase) return null;

  const getPriorityBadge = (level) => {
    switch (level) {
      case 4:
        return { label: 'Urgent • Emergency', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.3)' };
      case 3:
        return { label: 'High • Hospital Visit', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.3)' };
      case 2:
        return { label: 'Moderate • PHC Check', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.3)' };
      default:
        return { label: 'Routine • Home Care', color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.3)' };
    }
  };

  const getActionStepsForCase = (c) => {
    if (!c) return [];
    if (c.triage_level >= 4) {
      return [
        'Confirm if 108 Emergency Ambulance has been called or patient has reached hospital.',
        'Check patient responsiveness, continuous breathing, and alert status.',
        'Assist caregiver with emergency hospital transport and notify PHC Medical Officer.',
        'Stay with patient or follow up with hospital emergency staff within 2 hours.'
      ];
    }
    if (c.triage_level === 3) {
      return [
        'Visit patient home to assess fever temperature, hydration, and alertness.',
        'Facilitate accompaniment or referral slip to Community Health Centre (CHC).',
        'Verify patient is drinking fluids and not developing danger signs.',
        'Schedule return visit within 24 hours to check hospital consultation status.'
      ];
    }
    if (c.triage_level === 2) {
      return [
        'Visit patient to verify primary symptom severity.',
        'Advise visit to local Primary Health Centre (PHC) during OPD hours.',
        'Provide ORS / paracetamol guidance as per basic protocol if indicated.',
        'Re-evaluate patient recovery status after 24 hours.'
      ];
    }
    return [
      'Confirm patient is resting and taking adequate home fluids / nutrition.',
      'Check for fever resolution and symptom relief.',
      'Advise family to contact ASHA if condition does not improve in 48 hours.',
      'Mark follow-up complete once symptom recovery is verified.'
    ];
  };

  const getWarningSignsForCase = (c) => {
    if (!c) return [];
    if (c.triage_level >= 3) {
      return [
        'Inability to drink, eat, or continuous vomiting',
        'Strained, rapid breathing (>40 breaths per minute) or chest indrawing',
        'High fever persisting beyond 3 days or convulsions / seizures',
        'Severe drowsiness, unresponsiveness, or cold, clammy hands/feet'
      ];
    }
    return [
      'Sudden increase in fever or inability to tolerate liquids',
      'Difficulty in breathing or persistent chest pain',
      'Blood in stool or extreme lethargy',
      'Symptoms worsening after 24-48 hours of home care'
    ];
  };

  const getPatientDisplayName = (c) => {
    if (c.patient?.full_name) return c.patient.full_name;
    const genderStr = c.patient?.gender ? (c.patient.gender === 'female' ? 'Female' : 'Male') : '';
    const ageStr = c.patient?.age_group ? c.patient.age_group : 'Adult';
    if (genderStr) return `Patient (${genderStr}, ${ageStr})`;
    return `Patient (${ageStr})`;
  };

  const handleSaveAction = async (newStatusOverride = null) => {
    setSavingAction(true);
    try {
      const actionName = newStatusOverride === 'Resolved' ? 'Resolved' : selectedAction;
      const actorName = user?.full_name || (user?.role === 'admin' ? 'Administrator' : 'ASHA Worker');
      await recordCaseAction(selectedCase.id, {
        action: actionName,
        notes: actionNotes || (newStatusOverride === 'Resolved' ? 'Follow-up completed successfully. Patient recovering.' : `Action recorded by ${actorName}`),
        actor_name: actorName,
        new_status: newStatusOverride || (actionName === 'Resolved' ? 'Resolved' : undefined)
      });
      
      if (showToast) {
        showToast(newStatusOverride === 'Resolved' ? `✅ Case ${selectedCase.case_code} marked completed!` : `✅ Action recorded for ${selectedCase.case_code}`);
      }
      
      setActionNotes('');
      if (onSaveSuccess) onSaveSuccess();
      onClose();
    } catch (err) {
      alert('Error saving action: ' + err.message);
    } finally {
      setSavingAction(false);
    }
  };

  const priority = getPriorityBadge(selectedCase.triage_level);

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(5, 12, 22, 0.85)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 300,
      padding: '16px'
    }}>
      <div style={{
        background: '#0F172A',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: 'var(--radius-lg)',
        maxWidth: '680px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '24px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)'
      }}>
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#38BDF8', fontFamily: 'monospace', background: 'rgba(56, 189, 248, 0.12)', padding: '2px 8px', borderRadius: '4px' }}>
                {selectedCase.case_code}
              </span>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '4px',
                background: priority.bg,
                color: priority.color,
                border: `1px solid ${priority.border}`
              }}>
                {priority.label}
              </span>
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF', marginTop: '6px', margin: 0 }}>
              Patient Case &amp; Action Plan
            </h2>
          </div>

          <button 
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94A3B8',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Section 1: PATIENT */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: 'var(--radius-md)', padding: '14px 16px' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#38BDF8', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User size={14} />
              <span>1. Patient Details</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', fontSize: '0.82rem' }}>
              <div>
                <span style={{ color: '#94A3B8' }}>Name:</span>{' '}
                <strong style={{ color: '#FFFFFF' }}>{getPatientDisplayName(selectedCase)}</strong>
              </div>
              <div>
                <span style={{ color: '#94A3B8' }}>Location:</span>{' '}
                <strong style={{ color: '#FFFFFF' }}>{selectedCase.patient?.village || 'Village'}, {selectedCase.patient?.district || 'Varanasi'}</strong>
              </div>
              <div>
                <span style={{ color: '#94A3B8' }}>Language:</span>{' '}
                <strong style={{ color: '#FFFFFF' }}>{selectedCase.detected_language?.toUpperCase() || 'HI'}</strong>
              </div>
              <div>
                <span style={{ color: '#94A3B8' }}>Recorded At:</span>{' '}
                <strong style={{ color: '#FFFFFF' }}>{new Date(selectedCase.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</strong>
              </div>
            </div>
          </div>

          {/* Section 2: WHY THIS CASE NEEDS FOLLOW-UP */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: 'var(--radius-md)', padding: '14px 16px' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#F59E0B', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={14} />
              <span>2. Why This Case Needs Follow-up</span>
            </div>
            <div style={{ fontSize: '0.85rem', color: '#F8FAFC', marginBottom: '6px' }}>
              <strong>Reported Complaint:</strong> "{selectedCase.primary_complaint}"
            </div>
            <div style={{ fontSize: '0.8rem', color: '#CBD5E1', background: 'rgba(0, 0, 0, 0.25)', padding: '10px 12px', borderRadius: '6px' }}>
              <strong>Voice Guidance Provided:</strong> {selectedCase.recommendation_text || 'Standard clinical guidance issued during voice triage.'}
            </div>
          </div>

          {/* Section 3: WHAT TO DO (Clear Action Steps) */}
          <div style={{ background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 'var(--radius-md)', padding: '14px 16px' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#10B981', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle size={14} />
              <span>3. What To Do</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {getActionStepsForCase(selectedCase).map((step, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.82rem', color: '#E2E8F0' }}>
                  <span style={{ background: '#10B981', color: '#064E3B', width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', fontWeight: 800, flexShrink: 0, marginTop: '2px' }}>
                    {idx + 1}
                  </span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: WHEN TO ESCALATE (Warning Signs) */}
          <div style={{ background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 'var(--radius-md)', padding: '14px 16px' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#EF4444', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldAlert size={14} />
              <span>4. When To Escalate (Danger Signs)</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {getWarningSignsForCase(selectedCase).map((sign, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#FCA5A5' }}>
                  <span style={{ color: '#EF4444', fontSize: '1rem', lineHeight: 1 }}>•</span>
                  <span>{sign}</span>
                </div>
              ))}
              <div style={{ marginTop: '6px', fontSize: '0.75rem', color: '#EF4444', fontWeight: 700 }}>
                🚨 If any danger sign is present: Call 108 Emergency Ambulance or coordinate immediate PHC/Hospital transfer.
              </div>
            </div>
          </div>

          {/* Section 5: FACILITY */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: 'var(--radius-md)', padding: '14px 16px' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#A855F7', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Hospital size={14} />
              <span>5. Facility &amp; Care Coordination</span>
            </div>
            <div style={{ fontSize: '0.82rem', color: '#E2E8F0' }}>
              <div><strong>Attached Facility:</strong> {selectedCase.facility?.name || 'Local Primary Health Centre (PHC)'}</div>
              <div style={{ color: '#94A3B8', marginTop: '2px' }}>Type: {selectedCase.facility?.facility_type || 'Primary Health Centre'} • Helpline: {selectedCase.facility?.emergency_helpline || '108'}</div>
              {selectedCase.asha_worker && (
                <div style={{ color: '#94A3B8', marginTop: '6px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <div><strong>Assigned ASHA Worker:</strong> {selectedCase.asha_worker.name || 'ASHA Worker'}</div>
                  <div style={{ fontSize: '0.76rem', marginTop: '2px', color: '#CBD5E1' }}>
                    {selectedCase.asha_worker.village ? `Village: ${selectedCase.asha_worker.village}, ` : ''}{selectedCase.asha_worker.district || ''}
                    {selectedCase.asha_worker.phone_number ? ` • 📞 ${selectedCase.asha_worker.phone_number}` : ''}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 6: FOLLOW-UP & OUTCOME */}
          <div style={{ background: 'rgba(59, 130, 246, 0.06)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#60A5FA', textTransform: 'uppercase', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={14} />
              <span>6. Follow-up &amp; Outcome</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#CBD5E1', marginBottom: '4px', fontWeight: 600 }}>
                  Care Action / Visit Outcome:
                </label>
                <select
                  value={selectedAction}
                  onChange={(e) => setSelectedAction(e.target.value)}
                  style={{
                    background: '#1E293B',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    color: '#FFFFFF',
                    fontSize: '0.85rem',
                    width: '100%',
                    outline: 'none'
                  }}
                >
                  <option value="Visit completed">✅ Home Visit Completed (Patient Assessed)</option>
                  <option value="Contacted">📞 Patient Contacted &amp; Verified by Phone</option>
                  <option value="Referred">🏥 Accompanied / Referred to PHC/Hospital</option>
                  <option value="Improving">📈 Condition Improving / Recovering</option>
                  <option value="Worsening">⚠️ Condition Worsening (Escalate to MO)</option>
                  <option value="Resolved">🟢 Symptom Completely Resolved</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#CBD5E1', marginBottom: '4px', fontWeight: 600 }}>
                  Field Notes &amp; Observations:
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Patient visited at home. Fever reduced, taking ORS. Advised rest."
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  style={{
                    background: '#1E293B',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    color: '#FFFFFF',
                    fontSize: '0.82rem',
                    width: '100%',
                    outline: 'none',
                    resize: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '6px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => handleSaveAction(null)}
                  disabled={savingAction}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: 'var(--radius-md)',
                    padding: '8px 16px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: '#E2E8F0',
                    cursor: 'pointer'
                  }}
                >
                  {savingAction ? 'Saving...' : 'Record Visit Note'}
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveAction('Resolved')}
                  disabled={savingAction}
                  style={{
                    background: '#10B981',
                    color: '#064E3B',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    padding: '8px 18px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer'
                  }}
                >
                  <CheckCircle2 size={15} />
                  <span>{savingAction ? 'Saving...' : 'Mark Follow-up Complete'}</span>
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
