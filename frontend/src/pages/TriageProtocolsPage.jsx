import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Search, ShieldAlert, CheckCircle2, 
  ChevronDown, ChevronUp, AlertTriangle, Hospital, 
  HeartHandshake, Info, ShieldCheck, Stethoscope, 
  Flame, Wind, Droplets, Baby, HeartPulse, Sparkles,
  ExternalLink
} from 'lucide-react';
import { fetchProtocols } from '../services/api';

const CATEGORIES = [
  { id: 'all', label: 'All Protocols', icon: BookOpen, countKey: 'all' },
  { id: 'fever', label: 'Fever (बुखार)', icon: Flame, keywords: ['fever', 'बुखार', 'temperature', 'dengue', 'malaria', 'typhoid'] },
  { id: 'respiratory', label: 'Cough / Breathing (खांसी / सांस)', icon: Wind, keywords: ['respiratory', 'cough', 'breathing', 'dyspnea', 'cold', 'asthma', 'pneumonia', 'खांसी', 'सांस'] },
  { id: 'diarrhea', label: 'Diarrhea / Vomiting (दस्त / उल्टी)', icon: Droplets, keywords: ['diarrhea', 'vomiting', 'gastro', 'dehydration', 'cholera', 'दस्त', 'उल्टी', 'loose'] },
  { id: 'pregnancy', label: 'Pregnancy (गर्भावस्था)', icon: HeartPulse, keywords: ['pregnancy', 'maternal', 'bleeding', 'labor', 'preeclampsia', 'गर्भावस्था', 'प्रसव', 'pregnant'] },
  { id: 'child_health', label: 'Child Health (बाल स्वास्थ्य)', icon: Baby, keywords: ['child', 'pediatric', 'infant', 'neonate', 'imci', 'बच्चा', 'शिशु'] },
  { id: 'other', label: 'Emergency / Other (आपातकालीन)', icon: ShieldAlert, keywords: ['chest', 'pain', 'consciousness', 'unconscious', 'emergency', 'fainting', 'trauma', 'stroke'] }
];

export default function TriageProtocolsPage() {
  const [protocols, setProtocols] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // Expanded Protocol IDs state (for progressive disclosure)
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const data = await fetchProtocols();
        setProtocols(data || []);
      } catch (e) {
        console.error('Failed to load clinical protocols', e);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const getProtocolCategory = (p) => {
    const text = `${p.rule_id} ${p.name} ${p.condition_description || ''} ${p.action_guidance_hi || ''} ${p.action_guidance_en || ''}`.toLowerCase();
    for (const cat of CATEGORIES) {
      if (cat.id === 'all') continue;
      if (cat.keywords && cat.keywords.some(kw => text.includes(kw.toLowerCase()))) {
        return cat.id;
      }
    }
    return 'other';
  };

  const filtered = protocols.filter((p) => {
    const cat = getProtocolCategory(p);
    if (selectedCategory !== 'all' && cat !== selectedCategory) {
      return false;
    }
    if (search) {
      const q = search.toLowerCase();
      const matchText = `${p.rule_id} ${p.name} ${p.condition_description || ''} ${p.action_guidance_hi || ''} ${p.action_guidance_en || ''} ${p.reference_guideline || ''}`.toLowerCase();
      return matchText.includes(q);
    }
    return true;
  });

  const getLevelInfo = (level) => {
    switch (level) {
      case 4:
        return { label: 'Level 4 • Emergency (108)', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.3)' };
      case 3:
        return { label: 'Level 3 • Hospital / CHC Referral', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.3)' };
      case 2:
        return { label: 'Level 2 • Primary Health Centre (PHC)', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.3)' };
      default:
        return { label: 'Level 1 • Home Care & Monitoring', color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.3)' };
    }
  };

  const getWhenToRefer = (p) => {
    if (p.level === 4) {
      return 'Immediate Emergency Referral: Call 108 Ambulance right away or transport directly to nearest Emergency Hospital with oxygen/ICU support.';
    }
    if (p.level === 3) {
      return 'Hospital / CHC Referral: Patient must be examined by an MBBS Doctor / Specialist at the Community Health Centre (CHC) within 12-24 hours.';
    }
    if (p.level === 2) {
      return 'Primary Health Centre (PHC) Visit: Visit local PHC / Sub-Centre OPD within 24-48 hours for standard clinical evaluation and prescription.';
    }
    return 'Home Care: Routine monitoring at home. Refer to PHC only if symptoms persist beyond 3 days or red flags emerge.';
  };

  const getWarningSigns = (p) => {
    if (p.level >= 3) {
      return [
        'Difficulty breathing, grunting, or severe chest tightness',
        'Inability to drink or retain oral fluids, continuous vomiting',
        'Extreme drowsiness, confusion, or convulsions/seizures',
        'Cold extremities with high central body temperature'
      ];
    }
    return [
      'Fever rising above 102°F or lasting longer than 3 days',
      'Sudden onset of persistent pain or dehydration signs',
      'Patient becoming unusually weak or unable to eat'
    ];
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      
      {/* ── Page Header ────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.1) 0%, rgba(17, 30, 46, 0.95) 100%)',
        border: '1px solid rgba(56, 189, 248, 0.2)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ 
              background: '#0284C7', 
              color: '#F0F9FF', 
              padding: '2px 8px', 
              borderRadius: '6px', 
              fontSize: '0.72rem', 
              fontWeight: 800,
              textTransform: 'uppercase'
            }}>
              ASHA Reference Library
            </span>
            <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
              WHO IMCI &amp; ICMR Standard Guidelines
            </span>
          </div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
            Clinical Protocols &amp; Action Library
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#94A3B8', marginTop: '4px', margin: 0 }}>
            Quick, reliable field guidance for symptom assessment, home care advice, and hospital referral triggers.
          </p>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', width: '280px' }}>
          <Search size={15} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '10px' }} />
          <input
            type="text"
            placeholder="Search symptoms, fever, cough..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: 'var(--radius-md)',
              padding: '8px 12px 8px 34px',
              fontSize: '0.82rem',
              color: '#FFFFFF',
              width: '100%',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* ── Category Tabs (Low Cognitive Load) ──────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        overflowX: 'auto',
        paddingBottom: '4px'
      }}>
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedCategory(cat.id);
                setExpandedId(null);
              }}
              style={{
                background: isActive ? '#0284C7' : 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${isActive ? '#38BDF8' : 'rgba(255, 255, 255, 0.08)'}`,
                borderRadius: '20px',
                padding: '8px 16px',
                color: isActive ? '#FFFFFF' : '#CBD5E1',
                fontSize: '0.8rem',
                fontWeight: isActive ? 700 : 500,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              <Icon size={14} color={isActive ? '#FFFFFF' : '#94A3B8'} />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Protocols List with Progressive Disclosure ─────────── */}
      {isLoading ? (
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          padding: '48px 24px',
          textAlign: 'center',
          color: '#94A3B8',
          border: '1px solid var(--border-subtle)'
        }}>
          <p style={{ margin: 0, fontSize: '0.88rem' }}>Loading reference protocols...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          padding: '48px 24px',
          textAlign: 'center',
          border: '1px solid var(--border-subtle)'
        }}>
          <Info size={32} color="#94A3B8" style={{ margin: '0 auto 8px auto' }} />
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
            No protocols found
          </h3>
          <p style={{ fontSize: '0.8rem', color: '#94A3B8', margin: '4px 0 0 0' }}>
            Try searching for a different symptom or select "All Protocols".
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filtered.map((p) => {
            const levelInfo = getLevelInfo(p.level);
            const isExpanded = expandedId === p.rule_id;

            return (
              <div
                key={p.rule_id}
                style={{
                  background: 'var(--bg-card)',
                  border: `1px solid ${isExpanded ? 'rgba(56, 189, 248, 0.4)' : 'var(--border-subtle)'}`,
                  borderLeft: `4px solid ${levelInfo.color}`,
                  borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden',
                  transition: 'all 0.2s ease'
                }}
              >
                {/* Protocol Card Summary Header (Tap to Expand) */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : p.rule_id)}
                  style={{
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                    cursor: 'pointer',
                    background: isExpanded ? 'rgba(56, 189, 248, 0.04)' : 'transparent'
                  }}
                >
                  <div style={{ flex: '1 1 300px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#38BDF8', fontFamily: 'monospace', background: 'rgba(56, 189, 248, 0.12)', padding: '2px 6px', borderRadius: '4px' }}>
                        {p.rule_id}
                      </span>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: levelInfo.bg,
                        color: levelInfo.color,
                        border: `1px solid ${levelInfo.border}`
                      }}>
                        {levelInfo.label}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1.02rem', fontWeight: 700, color: '#FFFFFF', margin: '0 0 4px 0' }}>
                      {p.name}
                    </h3>
                    
                    <p style={{ fontSize: '0.8rem', color: '#94A3B8', margin: 0 }}>
                      <strong>Trigger:</strong> {p.condition_description}
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '0.78rem', color: isExpanded ? '#38BDF8' : '#94A3B8', fontWeight: 600 }}>
                      {isExpanded ? 'Hide Details' : 'View Action Steps'}
                    </span>
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '50%',
                      background: 'rgba(255, 255, 255, 0.06)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: isExpanded ? '#38BDF8' : '#94A3B8'
                    }}>
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>
                </div>

                {/* Expanded Action Sections (Prioritizing 4 Key Guidance Areas) */}
                {isExpanded && (
                  <div style={{
                    padding: '16px 20px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                    background: 'rgba(15, 23, 42, 0.6)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px'
                  }}>
                    
                    {/* 1. WHAT TO CHECK */}
                    <div style={{ background: 'rgba(56, 189, 248, 0.06)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#38BDF8', textTransform: 'uppercase', marginBottom: '4px' }}>
                        🔍 1. What to Check (Assessment)
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#E2E8F0', lineHeight: 1.4 }}>
                        {p.condition_description}
                      </div>
                    </div>

                    {/* 2. WHAT TO DO */}
                    <div style={{ background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#10B981', textTransform: 'uppercase', marginBottom: '6px' }}>
                        💊 2. What to Do (Guidance &amp; Advice)
                      </div>
                      
                      {p.action_guidance_hi && (
                        <div style={{ fontSize: '0.85rem', color: '#FFFFFF', marginBottom: '6px', fontStyle: 'italic', background: 'rgba(0, 0, 0, 0.25)', padding: '8px 10px', borderRadius: '6px' }}>
                          <strong>Hindi Advice:</strong> "{p.action_guidance_hi}"
                        </div>
                      )}
                      
                      {p.action_guidance_en && (
                        <div style={{ fontSize: '0.8rem', color: '#CBD5E1' }}>
                          <strong>Clinical Standard:</strong> {p.action_guidance_en}
                        </div>
                      )}
                    </div>

                    {/* 3. WHEN TO REFER */}
                    <div style={{ background: 'rgba(245, 158, 11, 0.06)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#F59E0B', textTransform: 'uppercase', marginBottom: '4px' }}>
                        🏥 3. When to Refer (Facility Escalation)
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#FEF3C7', lineHeight: 1.4 }}>
                        {getWhenToRefer(p)}
                      </div>
                    </div>

                    {/* 4. WARNING SIGNS */}
                    <div style={{ background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#EF4444', textTransform: 'uppercase', marginBottom: '6px' }}>
                        🚨 4. Warning Signs (Danger Flags)
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {getWarningSigns(p).map((sign, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#FCA5A5' }}>
                            <span style={{ color: '#EF4444' }}>•</span>
                            <span>{sign}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Reference Footer */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#64748B', paddingTop: '4px' }}>
                      <span>Guideline: <strong>{p.reference_guideline || 'Standard ICMR/WHO IMCI'}</strong></span>
                      <span>Urgency: <strong style={{ color: levelInfo.color }}>{p.urgency || 'Standard'}</strong></span>
                    </div>

                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
