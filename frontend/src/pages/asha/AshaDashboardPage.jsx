import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, Clock, CheckCircle2, User, MapPin, 
  Hospital, Phone, ChevronRight, X, ShieldAlert,
  ArrowRight, RefreshCw, CheckCircle, Calendar,
  Activity, AlertCircle, FileText, Check, PhoneCall,
  UserCheck, HeartHandshake, Eye
} from 'lucide-react';
import { fetchAshaMyWork } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import AshaCaseDetailModal from '../../components/Asha/AshaCaseDetailModal';

export default function AshaDashboardPage({ showToast }) {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState('urgent'); // 'urgent' | 'due_today' | 'upcoming' | 'completed'
  const [data, setData] = useState({
    stats: { urgent_count: 0, followups_due_count: 0, active_count: 0, completed_count: 0 },
    urgent_cases: [],
    followups_due: [],
    active_cases: [],
    completed_cases: []
  });
  const [loading, setLoading] = useState(true);

  // Selected Case Detail View State
  const [selectedCase, setSelectedCase] = useState(null);

  // Action Form State
  const [selectedAction, setSelectedAction] = useState('Visit completed');
  const [actionNotes, setActionNotes] = useState('');
  const [savingAction, setSavingAction] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchAshaMyWork({
        asha_id: user?.asha_worker_id || undefined,
        district: user?.district || 'Varanasi'
      });
      setData(res);
      // If a case is currently open, refresh its data
      if (selectedCase) {
        const all = [
          ...(res.urgent_cases || []),
          ...(res.followups_due || []),
          ...(res.active_cases || []),
          ...(res.completed_cases || [])
        ];
        const updated = all.find(c => c.id === selectedCase.id);
        if (updated) setSelectedCase(updated);
      }
    } catch (err) {
      console.error('Failed to load ASHA work data', err);
      if (showToast) showToast('Failed to load work data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleSaveAction = async (newStatusOverride = null) => {
    if (!selectedCase) return;
    setSavingAction(true);

    try {
      const actionName = newStatusOverride === 'Resolved' ? 'Resolved' : selectedAction;
      await recordCaseAction(selectedCase.id, {
        action: actionName,
        notes: actionNotes || (newStatusOverride === 'Resolved' ? 'Follow-up visit completed successfully. Patient recovering.' : `Action recorded by ASHA Worker ${user?.full_name || ''}`),
        actor_name: user?.full_name || 'ASHA Worker',
        new_status: newStatusOverride || (actionName === 'Resolved' ? 'Resolved' : undefined)
      });
      
      if (showToast) {
        showToast(newStatusOverride === 'Resolved' ? `✅ Case ${selectedCase.case_code} marked completed!` : `✅ Visit action recorded for ${selectedCase.case_code}`);
      }
      
      setActionNotes('');
      setSelectedCase(null);
      loadData();
    } catch (err) {
      alert('Error saving action: ' + err.message);
    } finally {
      setSavingAction(false);
    }
  };

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

  // Filter tasks according to active tab
  const getFilteredTasks = () => {
    if (activeTab === 'urgent') return data.urgent_cases || [];
    if (activeTab === 'due_today') return data.followups_due || [];
    if (activeTab === 'upcoming') return data.active_cases || [];
    return data.completed_cases || [];
  };

  const tasksList = getFilteredTasks();

  const getPatientDisplayName = (c) => {
    if (c.patient?.full_name) return c.patient.full_name;
    const genderStr = c.patient?.gender ? (c.patient.gender === 'female' ? 'Female' : 'Male') : '';
    const ageStr = c.patient?.age_group ? c.patient.age_group : 'Adult';
    if (genderStr) return `Patient (${genderStr}, ${ageStr})`;
    return `Patient (${ageStr})`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      
      {/* ── Page Header ────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(17, 30, 46, 0.95) 100%)',
        border: '1px solid rgba(16, 185, 129, 0.2)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <span style={{ 
              background: '#10B981', 
              color: '#064E3B', 
              padding: '2px 8px', 
              borderRadius: '6px', 
              fontSize: '0.72rem', 
              fontWeight: 800,
              textTransform: 'uppercase'
            }}>
              ASHA Field Portal
            </span>
            <span style={{ fontSize: '0.82rem', color: '#94A3B8' }}>
              📍 {user?.village || 'Area'}, {user?.district || 'Varanasi'}
            </span>
          </div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
            Today's Community Tasks
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#94A3B8', marginTop: '4px', margin: 0 }}>
            Follow-up visit queue and health verification for assigned village patients.
          </p>
        </div>

        <button 
          onClick={loadData} 
          style={{
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 'var(--radius-md)',
            padding: '8px 14px',
            color: '#E2E8F0',
            fontSize: '0.8rem',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer'
          }}
        >
          <RefreshCw size={14} className={loading ? 'spin text-teal-400' : ''} />
          <span>Refresh Tasks</span>
        </button>
      </div>

      {/* ── Task Category Filter Tabs (Low Cognitive Load) ─────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '12px'
      }}>
        {/* Urgent Tab */}
        <button
          onClick={() => setActiveTab('urgent')}
          style={{
            background: activeTab === 'urgent' ? 'rgba(239, 68, 68, 0.16)' : 'var(--bg-card)',
            border: `1.5px solid ${activeTab === 'urgent' ? '#EF4444' : 'rgba(255, 255, 255, 0.08)'}`,
            borderRadius: 'var(--radius-md)',
            padding: '14px 16px',
            textAlign: 'left',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <AlertTriangle size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: activeTab === 'urgent' ? '#FCA5A5' : '#FFFFFF' }}>
                Urgent
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Hospital & Emergency</div>
            </div>
          </div>
          <span style={{
            fontSize: '1.15rem', fontWeight: 800,
            color: '#EF4444', background: 'rgba(239, 68, 68, 0.15)',
            padding: '2px 10px', borderRadius: '12px'
          }}>
            {data.stats.urgent_count || 0}
          </span>
        </button>

        {/* Due Today Tab */}
        <button
          onClick={() => setActiveTab('due_today')}
          style={{
            background: activeTab === 'due_today' ? 'rgba(245, 158, 11, 0.16)' : 'var(--bg-card)',
            border: `1.5px solid ${activeTab === 'due_today' ? '#F59E0B' : 'rgba(255, 255, 255, 0.08)'}`,
            borderRadius: 'var(--radius-md)',
            padding: '14px 16px',
            textAlign: 'left',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '8px',
              background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Clock size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: activeTab === 'due_today' ? '#FCD34D' : '#FFFFFF' }}>
                Due Today
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>24h Follow-up check</div>
            </div>
          </div>
          <span style={{
            fontSize: '1.15rem', fontWeight: 800,
            color: '#F59E0B', background: 'rgba(245, 158, 11, 0.15)',
            padding: '2px 10px', borderRadius: '12px'
          }}>
            {data.stats.followups_due_count || 0}
          </span>
        </button>

        {/* Upcoming / Active Tab */}
        <button
          onClick={() => setActiveTab('upcoming')}
          style={{
            background: activeTab === 'upcoming' ? 'rgba(59, 130, 246, 0.16)' : 'var(--bg-card)',
            border: `1.5px solid ${activeTab === 'upcoming' ? '#3B82F6' : 'rgba(255, 255, 255, 0.08)'}`,
            borderRadius: 'var(--radius-md)',
            padding: '14px 16px',
            textAlign: 'left',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '8px',
              background: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Activity size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: activeTab === 'upcoming' ? '#93C5FD' : '#FFFFFF' }}>
                Active
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Ongoing monitoring</div>
            </div>
          </div>
          <span style={{
            fontSize: '1.15rem', fontWeight: 800,
            color: '#60A5FA', background: 'rgba(59, 130, 246, 0.15)',
            padding: '2px 10px', borderRadius: '12px'
          }}>
            {data.stats.active_count || 0}
          </span>
        </button>

        {/* Completed Tab */}
        <button
          onClick={() => setActiveTab('completed')}
          style={{
            background: activeTab === 'completed' ? 'rgba(16, 185, 129, 0.16)' : 'var(--bg-card)',
            border: `1.5px solid ${activeTab === 'completed' ? '#10B981' : 'rgba(255, 255, 255, 0.08)'}`,
            borderRadius: 'var(--radius-md)',
            padding: '14px 16px',
            textAlign: 'left',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '8px',
              background: 'rgba(16, 185, 129, 0.15)', color: '#10B981',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <CheckCircle2 size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: activeTab === 'completed' ? '#6EE7B7' : '#FFFFFF' }}>
                Completed
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Visits resolved</div>
            </div>
          </div>
          <span style={{
            fontSize: '1.15rem', fontWeight: 800,
            color: '#10B981', background: 'rgba(16, 185, 129, 0.15)',
            padding: '2px 10px', borderRadius: '12px'
          }}>
            {data.stats.completed_count || 0}
          </span>
        </button>
      </div>

      {/* ── Main Tasks List Section ────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#F1F5F9', margin: 0 }}>
            {activeTab === 'urgent' && '🔴 Urgent Attention Cases'}
            {activeTab === 'due_today' && '🟡 Follow-up Visits Due Today'}
            {activeTab === 'upcoming' && '🔵 Active Community Monitoring'}
            {activeTab === 'completed' && '🟢 Resolved Patient Visits'}
          </h2>
          <span style={{ fontSize: '0.78rem', color: '#94A3B8', fontWeight: 500 }}>
            {tasksList.length} {tasksList.length === 1 ? 'task' : 'tasks'}
          </span>
        </div>

        {loading ? (
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
            padding: '48px 24px',
            textAlign: 'center',
            color: '#94A3B8',
            border: '1px solid var(--border-subtle)'
          }}>
            <RefreshCw size={24} className="spin text-teal-500 mb-2 mx-auto" />
            <p style={{ margin: 0, fontSize: '0.88rem' }}>Loading assigned tasks...</p>
          </div>
        ) : tasksList.length === 0 ? (
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
            padding: '48px 24px',
            textAlign: 'center',
            border: '1px solid var(--border-subtle)'
          }}>
            <CheckCircle2 size={36} color="#10B981" style={{ margin: '0 auto 10px auto' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
              No tasks in this queue
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#94A3B8', margin: '6px 0 0 0' }}>
              All patient check-ins in this category are up to date.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {tasksList.map((c) => {
              const priority = getPriorityBadge(c.triage_level);
              return (
                <div 
                  key={c.id}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    borderLeft: `4px solid ${priority.color}`,
                    borderRadius: 'var(--radius-lg)',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '16px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {/* Left: Patient & Location */}
                  <div style={{ flex: '1 1 240px', minWidth: '220px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '1rem', fontWeight: 700, color: '#FFFFFF' }}>
                        {getPatientDisplayName(c)}
                      </span>
                      <span style={{ 
                        fontSize: '0.72rem', 
                        padding: '2px 8px', 
                        borderRadius: '4px',
                        background: priority.bg,
                        color: priority.color,
                        border: `1px solid ${priority.border}`,
                        fontWeight: 700
                      }}>
                        {priority.label}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#94A3B8' }}>
                      <MapPin size={13} color="#64748B" />
                      <span>{c.patient?.village || user?.village || 'Local Area'}, {c.patient?.district || user?.district || 'Varanasi'}</span>
                    </div>
                  </div>

                  {/* Middle: Reason for Follow-up & Due Timing */}
                  <div style={{ flex: '2 1 300px', minWidth: '260px' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#E2E8F0', marginBottom: '3px' }}>
                      Reason: <span style={{ color: '#F1F5F9' }}>{c.primary_complaint}</span>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.75rem', color: '#94A3B8' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} color="#60A5FA" />
                        <span>Status: <strong style={{ color: '#E2E8F0' }}>{c.status}</strong></span>
                      </span>
                      <span>•</span>
                      <span>Case: <strong style={{ color: '#38BDF8', fontFamily: 'monospace' }}>{c.case_code}</strong></span>
                    </div>
                  </div>

                  {/* Right: Primary Action Button */}
                  <div>
                    <button
                      onClick={() => setSelectedCase(c)}
                      style={{
                        background: '#10B981',
                        color: '#064E3B',
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        padding: '9px 16px',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)'
                      }}
                    >
                      <span>Open Case</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Detailed "Open Case" Modal View (Clean, 6 Scannable Sections) ── */}
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
