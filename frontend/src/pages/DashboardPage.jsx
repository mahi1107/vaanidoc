import React, { useState } from 'react';
import { 
  PhoneIncoming, 
  AlertTriangle, 
  Building2, 
  Home, 
  Ambulance, 
  Send, 
  Clock, 
  MapPin, 
  TrendingUp,
  Activity,
  ArrowRight,
  Filter,
  ShieldCheck,
  Calendar
} from 'lucide-react';
import LiveActiveCallStream from '../components/LiveActiveCallStream';

export default function DashboardPage({
  metrics,
  triageData,
  symptomsData,
  timelineData,
  districtData,
  onNavigateToSimulator,
  onInspectCall,
  selectedDistrict,
  setSelectedDistrict,
  selectedDays,
  setSelectedDays
}) {
  const [selectedHoverDistrict, setSelectedHoverDistrict] = useState(null);

  const m = metrics || {
    total_calls: 0,
    calls_today: 0,
    active_cases: 0,
    emergency_cases: 0,
    hospital_referrals: 0,
    phc_referrals: 0,
    home_care_cases: 0,
    followups_pending: 0,
    asha_alerts_sent: 0
  };

  const triageLevels = triageData || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Live Active Telephony Surveillance Stream */}
      <LiveActiveCallStream onInspectCall={onInspectCall} />
      
      {/* Top Banner / Hero Triage Alert */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(59, 130, 246, 0.08) 100%)',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div style={{ maxWidth: '650px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#10B981', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
            <Activity size={16} />
            <span>Rural Health Tele-Triage Network</span>
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '6px' }}>
            Voice-First AI Clinical Guidance & Surveillance
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: '1.5' }}>
            Enabling rural citizens across Northern India to access immediate, conservative health triage over standard voice calls without smartphone apps, internet, or literacy barriers.
          </p>
        </div>

        <button
          onClick={onNavigateToSimulator}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            color: '#FFFFFF',
            padding: '12px 24px',
            borderRadius: 'var(--radius-sm)',
            fontWeight: 800,
            fontSize: '0.9rem',
            boxShadow: '0 4px 18px rgba(16, 185, 129, 0.4)'
          }}
        >
          <span>Launch Interactive Call Simulator</span>
          <ArrowRight size={18} />
        </button>
      </div>

      {/* Global Interactive Filter Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        background: 'var(--bg-card)',
        padding: '12px 20px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 700, color: '#FFFFFF' }}>
          <Filter size={16} color="#10B981" />
          <span>Surveillance Filters:</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>District:</span>
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              style={{
                background: 'var(--bg-main)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '6px 12px',
                color: '#FFFFFF',
                fontSize: '0.8rem'
              }}
            >
              <option value="">All Catchment Districts (Eastern UP)</option>
              <option value="Varanasi">Varanasi</option>
              <option value="Mirzapur">Mirzapur</option>
              <option value="Chandauli">Chandauli</option>
              <option value="Jaunpur">Jaunpur</option>
              <option value="Ghazipur">Ghazipur</option>
              <option value="Sonbhadra">Sonbhadra</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Time Range:</span>
            <select
              value={selectedDays}
              onChange={(e) => setSelectedDays(Number(e.target.value))}
              style={{
                background: 'var(--bg-main)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '6px 12px',
                color: '#FFFFFF',
                fontSize: '0.8rem'
              }}
            >
              <option value="7">Last 7 Days</option>
              <option value="14">Last 14 Days</option>
              <option value="30">Last 30 Days</option>
            </select>
          </div>

          {selectedDistrict && (
            <button
              onClick={() => setSelectedDistrict('')}
              style={{
                fontSize: '0.75rem',
                color: '#EF4444',
                background: 'rgba(239, 68, 68, 0.1)',
                padding: '4px 10px',
                borderRadius: '6px',
                fontWeight: 600
              }}
            >
              Clear Filter ({selectedDistrict})
            </button>
          )}
        </div>
      </div>

      {/* KPI Stat Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '20px'
      }}>
        <div className="v-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6' }}>
            <PhoneIncoming size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Calls Handled</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#FFFFFF' }}>{m.total_calls}</div>
            <div style={{ fontSize: '0.7rem', color: '#10B981', fontWeight: 600 }}>+{m.calls_today} today</div>
          </div>
        </div>

        <div className="v-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444' }}>
            <Ambulance size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Level 4 Emergencies</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#EF4444' }}>{m.emergency_cases}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Immediate 108 transfer</div>
          </div>
        </div>

        <div className="v-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B' }}>
            <Building2 size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Hospital Referrals</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#F59E0B' }}>{m.hospital_referrals}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Within 24h CHC/Hospital</div>
          </div>
        </div>

        <div className="v-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#10B981' }}>
            <Home size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>PHC & Home Care</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10B981' }}>{m.phc_referrals + m.home_care_cases}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{m.phc_referrals} PHC, {m.home_care_cases} Home</div>
          </div>
        </div>

        <div className="v-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(147, 51, 234, 0.15)', color: '#A855F7' }}>
            <Send size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>ASHA SMS Alerts</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#FFFFFF' }}>{m.asha_alerts_sent}</div>
            <div style={{ fontSize: '0.7rem', color: '#A855F7', fontWeight: 600 }}>{m.followups_pending} followups pending</div>
          </div>
        </div>
      </div>

      {/* Triage Distribution Breakdown (4 Levels) */}
      <div className="v-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#FFFFFF' }}>Clinical Triage Distribution</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Deterministic protocol decisions based on WHO IMCI and ICMR standard treatment guidelines</p>
          </div>
          <span className="badge badge-phc">Auditable Decision Tree</span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px'
        }}>
          {triageLevels.map((lvl) => {
            const badgeClass = lvl.level === 4 ? 'badge-emergency' : (lvl.level === 3 ? 'badge-hospital' : (lvl.level === 2 ? 'badge-phc' : 'badge-home'));
            return (
              <div 
                key={lvl.level}
                style={{
                  background: 'var(--bg-card-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  border: `1px solid rgba(255, 255, 255, 0.05)`,
                  borderLeft: `4px solid ${lvl.color}`
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span className={`badge ${badgeClass}`}>Level {lvl.level}</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF' }}>{lvl.count}</span>
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                  {lvl.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  <span>Proportion</span>
                  <strong style={{ color: lvl.color }}>{lvl.percentage}%</strong>
                </div>
                <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', marginTop: '8px', overflow: 'hidden' }}>
                  <div style={{ width: `${lvl.percentage}%`, height: '100%', background: lvl.color, borderRadius: '3px' }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Middle Grid: Disease/Symptom Trends & Timeline */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
        gap: '24px'
      }}>
        {/* Symptom Trends */}
        <div className="v-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#FFFFFF' }}>Top Extracted Symptoms</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>NLP Entity Frequency</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(symptomsData || []).map((sym, idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>
                    {sym.hindi_name} <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>({sym.symptom})</span>
                  </span>
                  <span style={{ color: 'var(--text-muted)' }}>{sym.count} cases ({sym.percentage}%)</span>
                </div>
                <div style={{ width: '100%', height: '7px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${Math.min(100, sym.percentage * 2)}%`,
                    height: '100%',
                    background: idx === 0 ? '#10B981' : (idx === 1 ? '#3B82F6' : '#6366F1'),
                    borderRadius: '4px'
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline Graph */}
        <div className="v-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#FFFFFF' }}>Daily Call Surveillance Timeline</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Last {selectedDays} Days</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '180px', paddingTop: '20px', gap: '12px' }}>
            {(timelineData || []).map((t, idx) => {
              const maxVal = Math.max(...timelineData.map(d => d.total), 10);
              const heightPct = Math.max(15, (t.total / maxVal) * 100);
              return (
                <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.7rem', color: '#FFFFFF', fontWeight: 700 }}>{t.total}</span>
                  <div style={{
                    width: '100%',
                    maxWidth: '32px',
                    height: `${heightPct}%`,
                    background: 'linear-gradient(180deg, #10B981 0%, rgba(16, 185, 129, 0.25) 100%)',
                    borderRadius: '6px 6px 0 0',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    borderBottom: 'none'
                  }} />
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>{t.date}</span>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', marginTop: '16px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#10B981' }} />
              <span>Inbound Triage Calls</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#EF4444' }} />
              <span>Emergency Flags</span>
            </div>
          </div>
        </div>
      </div>

      {/* District Health Surveillance Cards */}
      <div className="v-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#FFFFFF' }}>
              District-Level Aggregated Call Activity (Eastern Uttar Pradesh)
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Catchment area distribution, triage load, and active ASHA community health workers. Click any card to filter.
            </p>
          </div>
          <span className="badge badge-home">Active Surveillance</span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '16px'
        }}>
          {(districtData || []).map((dist, idx) => {
            const isSelected = selectedDistrict === dist.district;
            return (
              <div
                key={idx}
                onClick={() => setSelectedDistrict(isSelected ? '' : dist.district)}
                style={{
                  background: isSelected ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-card-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '18px',
                  border: isSelected ? '2px solid #10B981' : '1px solid rgba(255, 255, 255, 0.05)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MapPin size={18} color="#10B981" />
                    <span style={{ fontSize: '1rem', fontWeight: 700, color: '#FFFFFF' }}>{dist.district}</span>
                  </div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#60A5FA' }}>{dist.total_calls} calls</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Emergency Cases:</span>
                    <strong style={{ color: dist.emergency_cases > 0 ? '#EF4444' : 'var(--text-muted)' }}>
                      {dist.emergency_cases}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>PHC / Hospital Referrals:</span>
                    <strong style={{ color: '#FFFFFF' }}>{dist.phc_hospital_cases}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Active ASHA Workers:</span>
                    <strong style={{ color: '#10B981' }}>{dist.active_asha_count} assigned</strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Subtle Clinical Safety Disclaimer Footer */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: '16px 20px',
        fontSize: '0.75rem',
        color: 'var(--text-dim)',
        lineHeight: '1.5',
        textAlign: 'center'
      }}>
        🛡️ <strong>Safety Disclaimer:</strong> VaaniDoc provides AI-assisted health guidance and triage support. It does not replace professional medical diagnosis, laboratory testing, or emergency physician care. In emergency situations, citizens are immediately guided to call <strong>108</strong> or visit the nearest hospital emergency ward.
      </div>

    </div>
  );
}
