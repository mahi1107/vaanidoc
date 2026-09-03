import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Send, 
  CheckCircle, 
  Phone, 
  MapPin, 
  AlertCircle, 
  ShieldCheck,
  Clock,
  Eye,
  X,
  PhoneCall,
  Activity,
  Layers,
  AlertTriangle
} from 'lucide-react';
import { fetchAshaWorkers, fetchAshaAlerts, acknowledgeAshaAlert, fetchWorkerDetail, sendWorkerTestAlert } from '../services/api';
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

export default function AshaWorkersPage({ onNavigateToCalls, showToast }) {
  const [workers, setWorkers] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Worker Detail Drawer State
  const [selectedWorkerId, setSelectedWorkerId] = useState(null);
  const [workerDetail, setWorkerDetail] = useState(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const params = {};
      if (selectedDistrict) params.district = selectedDistrict;
      const [wData, aData] = await Promise.all([
        fetchAshaWorkers(params),
        fetchAshaAlerts({ ...params, exclude_demo: true })
      ]);
      setWorkers(wData);
      setAlerts(aData);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedDistrict]);

  const handleOpenWorker = async (wId) => {
    setSelectedWorkerId(wId);
    setIsLoadingDetail(true);
    try {
      const data = await fetchWorkerDetail(wId, { exclude_demo: true });
      setWorkerDetail(data);
    } catch (err) {
      if (showToast) showToast('❌ Failed to fetch worker details: ' + err.message);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleSendTestAlert = async (wId) => {
    try {
      const res = await sendWorkerTestAlert(wId);
      if (showToast) showToast(`📱 ${res.message}`);
      loadData();
      if (selectedWorkerId) handleOpenWorker(selectedWorkerId);
    } catch (err) {
      if (showToast) showToast('❌ Failed to send alert: ' + err.message);
    }
  };

  const handleAcknowledge = async (alertId) => {
    try {
      await acknowledgeAshaAlert(alertId);
      if (showToast) showToast('✅ Alert acknowledged.');
      loadData();
      if (selectedWorkerId) handleOpenWorker(selectedWorkerId);
    } catch (err) {
      if (showToast) showToast('❌ Failed to acknowledge alert: ' + err.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title">ASHA Alerts &amp; Community Workers</h1>
          <p className="page-subtitle">
            SMS triage alerts dispatched to village ASHA workers for in-person community follow-up.
          </p>
        </div>
        <div style={{ minWidth: '220px' }}>
          <DistrictCombobox
            selectedDistrict={selectedDistrict || ''}
            onSelectDistrict={(dist) => setSelectedDistrict(dist === 'All Districts' || dist === 'All Districts (India)' ? '' : dist)}
            showAllOption={true}
            allOptionLabel="All Districts"
            placeholder="All Districts"
            id="asha-district-filter"
          />
        </div>
      </div>

      {/* ASHA Directory Grid */}
      <div className="v-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#FFFFFF' }}>
              Assigned Community Health Workers
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Click any worker card to inspect activity metrics, dispatch test alerts, or view assigned area cases
            </p>
          </div>
          <span className="badge badge-home">{workers.length} Active Workers</span>
        </div>

        {workers.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
            {selectedDistrict ? "No consultations found for this district." : "No active ASHA workers found."}
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '16px'
          }}>
          {workers.map((w) => (
            <div
              key={w.id}
              onClick={() => handleOpenWorker(w.id)}
              style={{
                background: 'var(--bg-card-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '18px',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.4)';
                e.currentTarget.style.background = 'var(--bg-card-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                e.currentTarget.style.background = 'var(--bg-card-subtle)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10B981', background: 'rgba(16, 185, 129, 0.15)', padding: '2px 8px', borderRadius: '4px' }}>
                  {w.worker_code}
                </span>
                <span className="badge badge-home">Active</span>
              </div>

              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '4px' }}>
                {w.name}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Phone size={14} color="#64748B" />
                  <span>{w.phone_number}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={14} color="#64748B" />
                  <span>{w.village}, {w.district} ({w.state})</span>
                </div>
                <div style={{ marginTop: '4px', color: 'var(--text-dim)' }}>
                  Catchment Population: <strong style={{ color: '#FFFFFF' }}>{w.assigned_population}</strong> citizens
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                <span style={{ fontSize: '0.75rem', color: '#10B981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>View Profile</span>
                  <Eye size={13} />
                </span>
              </div>
            </div>
          ))}
          </div>
        )}
      </div>

      {/* Alert Dispatch Queue */}
      <div className="v-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#FFFFFF' }}>
              Automated Triage Alert Queue
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              SMS dispatches triggered by Level 2 (PHC), Level 3 (Hospital), and Level 4 (Emergency) calls
            </p>
          </div>
          <span className="badge badge-phc">{alerts.length} Dispatched</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {alerts.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No alerts dispatched yet. Run a call simulation with Level 2+ symptoms.
            </div>
          ) : (
            alerts.map((a) => (
              <div
                key={a.id}
                style={{
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '16px',
                  flexWrap: 'wrap'
                }}
              >
                <div style={{ flex: 1, minWidth: '280px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <span className={`badge ${a.triage_level === 4 ? 'badge-emergency' : (a.triage_level === 3 ? 'badge-hospital' : 'badge-phc')}`}>
                      Level {a.triage_level} Alert
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      To: <strong style={{ color: '#FFFFFF' }}>{a.worker_name}</strong> ({a.worker_phone})
                    </span>
                  </div>

                  <pre style={{
                    fontSize: '0.8rem',
                    color: '#F8FAFC',
                    fontFamily: 'monospace',
                    background: 'rgba(0,0,0,0.3)',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    whiteSpace: 'pre-wrap',
                    marginTop: '6px'
                  }}>
                    {a.message}
                  </pre>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '6px' }}>
                    Sent (IST): {formatIST(a.sent_at)}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                  <span style={{
                    fontSize: '0.75rem',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    background: a.status === 'acknowledged' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                    color: a.status === 'acknowledged' ? '#10B981' : '#F59E0B',
                    fontWeight: 700,
                    textTransform: 'uppercase'
                  }}>
                    {a.status}
                  </span>

                  {a.status !== 'acknowledged' && (
                    <button
                      onClick={() => handleAcknowledge(a.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        background: 'rgba(16, 185, 129, 0.12)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        borderRadius: 'var(--radius-sm)',
                        color: '#10B981',
                        fontSize: '0.75rem',
                        fontWeight: 600
                      }}
                    >
                      <CheckCircle size={14} />
                      <span>Mark Acknowledged</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ASHA Worker Detail Modal */}
      {selectedWorkerId && (
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
          <div className="v-card" style={{ maxWidth: '650px', width: '100%', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
            <button
              onClick={() => { setSelectedWorkerId(null); setWorkerDetail(null); }}
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

            {isLoadingDetail || !workerDetail ? (
              <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading worker profile...
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF' }}>
                      {workerDetail.worker.name}
                    </h3>
                    <span className="badge badge-home">{workerDetail.worker.worker_code}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                    {workerDetail.worker.village}, {workerDetail.worker.district} ({workerDetail.worker.state}) &bull; Phone: {workerDetail.worker.phone_number}
                  </div>
                </div>

                {/* Worker Stats Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  <div style={{ background: 'var(--bg-main)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Total Dispatched</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FFFFFF' }}>{workerDetail.stats.total_alerts}</div>
                  </div>
                  <div style={{ background: 'var(--bg-main)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Emergencies</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#EF4444' }}>{workerDetail.stats.emergency_alerts}</div>
                  </div>
                  <div style={{ background: 'var(--bg-main)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Acknowledged</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10B981' }}>{workerDetail.stats.acknowledged_count}</div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => handleSendTestAlert(workerDetail.worker.id)}
                    className="btn btn-success"
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    <Send size={14} />
                    <span>Send Test Alert</span>
                  </button>
                  <div style={{ flex: 1, padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>📞</span>
                    <span>Call: <strong style={{ color: 'var(--text-primary)' }}>{workerDetail.worker.phone_number}</strong></span>
                  </div>
                </div>

                {/* Recent Alerts to this Worker */}
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '8px' }}>
                    Recent Alert Dispatches
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {workerDetail.recent_alerts.map((al) => (
                      <div key={al.id} style={{ background: 'var(--bg-main)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: '0.8rem', color: '#FFFFFF', fontWeight: 600 }}>
                            {al.message.split('\n')[0]}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                            Sent (IST): {formatIST(al.sent_at)}
                          </div>
                        </div>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: al.status === 'acknowledged' ? '#10B981' : '#F59E0B' }}>
                          {al.status.toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
