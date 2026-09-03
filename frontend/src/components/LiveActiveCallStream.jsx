import React, { useState, useEffect } from 'react';
import { PhoneCall, Radio, Activity, Sparkles, AlertTriangle, ShieldCheck, Clock, User, Volume2, Mic, CheckCircle2 } from 'lucide-react';
import { fetchActiveCalls } from '../services/api';

export default function LiveActiveCallStream({ onInspectCall }) {
  const [activeCalls, setActiveCalls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [excludeDemo, setExcludeDemo] = useState(false);

  const loadActiveCalls = async () => {
    try {
      const data = await fetchActiveCalls({ exclude_demo: excludeDemo });
      setActiveCalls(data || []);
    } catch (err) {
      console.error('Failed to fetch active calls:', err);
    }
  };

  useEffect(() => {
    loadActiveCalls();
    const interval = setInterval(loadActiveCalls, 3000);
    return () => clearInterval(interval);
  }, [excludeDemo]);

  const getTriagePill = (level) => {
    switch (level) {
      case 4:
        return <span className="badge badge-emergency">Level 4: Emergency (108)</span>;
      case 3:
        return <span className="badge badge-hospital">Level 3: Hospital Referral</span>;
      case 2:
        return <span className="badge badge-phc">Level 2: PHC Consultation</span>;
      case 1:
        return <span className="badge badge-home">Level 1: Home Care</span>;
      default:
        return <span className="badge badge-neutral">Triage In Progress</span>;
    }
  };

  return (
    <div className="card" style={{ marginBottom: '24px', borderLeft: '4px solid #0284c7' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ 
              width: '12px', 
              height: '12px', 
              borderRadius: '50%', 
              backgroundColor: activeCalls.length > 0 ? '#10b981' : '#94a3b8',
              animation: activeCalls.length > 0 ? 'pulse 1.5s infinite' : 'none'
            }} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Radio size={18} color="#0284c7" /> Live Telephony Surveillance Stream
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '2px 0 0 0' }}>
              Real patient telephone calls arriving via Exotel & Twilio Voice Gateways
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: '#475569', cursor: 'pointer', background: '#f1f5f9', padding: '6px 10px', borderRadius: '6px' }}>
            <input 
              type="checkbox" 
              checked={excludeDemo} 
              onChange={(e) => setExcludeDemo(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <span>Production Only (is_demo=False)</span>
          </label>
          <span style={{ fontSize: '0.8rem', padding: '4px 8px', borderRadius: '12px', background: activeCalls.length > 0 ? '#ecfdf5' : '#f8fafc', color: activeCalls.length > 0 ? '#059669' : '#64748b', fontWeight: 600 }}>
            {activeCalls.length} Active {activeCalls.length === 1 ? 'Call' : 'Calls'}
          </span>
        </div>
      </div>

      {activeCalls.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 12px', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
          <PhoneCall size={28} color="#94a3b8" style={{ marginBottom: '8px' }} />
          <div style={{ fontSize: '0.9rem', fontWeight: 500, color: '#475569' }}>No Active Telephony Calls at this Second</div>
          <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px' }}>
            The gateway is listening for inbound calls on configured telecom numbers (+91 virtual lines).
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {activeCalls.map((call) => {
            const isReal = !call.is_demo;
            const latestTranscript = call.transcripts && call.transcripts.length > 0 ? call.transcripts[call.transcripts.length - 1].content : null;
            const triage = call.triage_results && call.triage_results.length > 0 ? call.triage_results[0] : null;

            return (
              <div 
                key={call.id}
                style={{ 
                  background: isReal ? '#ffffff' : '#fcfcfd', 
                  border: isReal ? '1.5px solid #0284c7' : '1px solid #e2e8f0', 
                  borderRadius: '8px', 
                  padding: '14px 16px',
                  boxShadow: isReal ? '0 4px 6px -1px rgba(2, 132, 199, 0.1)' : 'none'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ 
                      padding: '3px 8px', 
                      borderRadius: '4px', 
                      fontSize: '0.75rem', 
                      fontWeight: 700, 
                      letterSpacing: '0.5px',
                      background: isReal ? '#0284c7' : '#64748b', 
                      color: '#ffffff' 
                    }}>
                      {isReal ? '● REAL PHONE CALL' : 'DEVELOPMENT SIMULATOR'}
                    </span>
                    <span style={{ fontWeight: 600, fontSize: '0.95rem', color: '#0f172a' }}>
                      {call.caller_phone}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      (ID: {call.id.slice(0, 8)}...)
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.78rem', background: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 600 }}>
                      {call.provider} Gateway
                    </span>
                    <span style={{ fontSize: '0.78rem', background: '#f1f5f9', color: '#475569', padding: '3px 8px', borderRadius: '4px', fontWeight: 600 }}>
                      Stage: {call.state}
                    </span>
                    {onInspectCall && (
                      <button 
                        onClick={() => onInspectCall(call.id)}
                        className="btn-secondary" 
                        style={{ padding: '3px 8px', fontSize: '0.75rem', height: '26px' }}
                      >
                        Inspect Trace
                      </button>
                    )}
                  </div>
                </div>

                {/* Live Speech & Symptoms Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', background: '#f8fafc', padding: '10px 12px', borderRadius: '6px' }}>
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Mic size={12} color="#0284c7" /> Live Spoken Input (Hindi)
                    </div>
                    <div style={{ fontSize: '0.86rem', color: latestTranscript ? '#1e293b' : '#94a3b8', fontStyle: latestTranscript ? 'normal' : 'italic' }}>
                      {latestTranscript ? `"${latestTranscript}"` : 'Listening on telephone line...'}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Activity size={12} color="#10b981" /> Clinical Triage & Status
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {triage ? getTriagePill(triage.level) : <span style={{ fontSize: '0.82rem', color: '#64748b' }}>Awaiting full symptom extraction...</span>}
                      {call.symptoms && call.symptoms.length > 0 && (
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {call.symptoms.map(s => (
                            <span key={s.id} style={{ fontSize: '0.72rem', padding: '2px 6px', background: '#e2e8f0', color: '#334155', borderRadius: '3px' }}>
                              {s.name_hi || s.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
