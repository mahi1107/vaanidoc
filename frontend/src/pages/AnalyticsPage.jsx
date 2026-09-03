import React, { useState, useEffect } from 'react';
import {
  BarChart3, TrendingUp, Users, Globe, MapPin,
  CalendarClock, Filter, Loader, AlertTriangle, Home,
  Building2, PhoneIncoming, RefreshCw, Activity, ArrowUpRight,
  ArrowDownRight, CheckCircle2, ShieldAlert, Sparkles
} from 'lucide-react';
import {
  fetchOverviewMetrics, fetchTriageDistribution, fetchSymptomTrends,
  fetchCallsTimeline, fetchLanguageDistribution, fetchDistrictMetrics
} from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import DistrictCombobox from '../components/Common/DistrictCombobox';

// ── Helpers ────────────────────────────────────────────────────────

function formatLanguageName(code, rawName, nativeName) {
  const c = (code || '').toLowerCase();
  if (c === 'hi' || rawName === 'Hindi') return { name: 'Hindi', native: 'हिन्दी' };
  if (c === 'en' || rawName === 'English' || rawName === 'en') return { name: 'English', native: 'English' };
  if (c === 'hinglish' || rawName === 'hinglish') return { name: 'Hinglish', native: 'हिंग्लिश' };
  if (c === 'bho' || rawName === 'Bhojpuri') return { name: 'Bhojpuri', native: 'भोजपुरी' };
  if (c === 'bn' || rawName === 'Bengali') return { name: 'Bengali', native: 'বাংলা' };
  if (c === 'mr' || rawName === 'Marathi') return { name: 'Marathi', native: 'मराठी' };
  return { name: rawName || code?.toUpperCase() || 'Other', native: nativeName || '—' };
}

function formatSymptomTitle(symptom, hindiName) {
  const cleanSym = (symptom || '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  if (hindiName && hindiName !== '—') {
    return `${cleanSym} (${hindiName})`;
  }
  return cleanSym;
}

// ── Main Component ─────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { t } = useLanguage();
  const [dateRange, setDateRange] = useState('7d'); // '7d' | '30d' | 'all'
  const [district, setDistrict] = useState('');
  const [overview, setOverview] = useState(null);
  const [triageData, setTriageData] = useState([]);
  const [symptomData, setSymptomData] = useState([]);
  const [timelineData, setTimelineData] = useState([]);
  const [languageData, setLanguageData] = useState([]);
  const [districtData, setDistrictData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredDay, setHoveredDay] = useState(null);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : undefined;
      const params = { exclude_demo: true };
      if (district) params.district = district;
      if (days) params.days = days;

      const [ov, tr, sy, tl, lg, ds] = await Promise.all([
        fetchOverviewMetrics(params),
        fetchTriageDistribution(params),
        fetchSymptomTrends(params),
        fetchCallsTimeline({ days: days || 90, ...params }),
        fetchLanguageDistribution(params),
        fetchDistrictMetrics({ exclude_demo: true })
      ]);

      setOverview(ov || {});
      setTriageData(tr || []);
      setSymptomData(sy || []);
      setTimelineData(tl || []);
      setLanguageData(lg || []);
      setDistrictData(ds || []);
    } catch (err) {
      console.error('Analytics fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [dateRange, district]);

  // Derived Calculations
  const totalConsultations = overview?.total_calls ?? 0;
  const patientsServed = overview?.unique_patients ?? overview?.active_cases ?? 0;
  const hospitalReferrals = overview?.hospital_referrals ?? 0;
  const phcReferrals = overview?.phc_referrals ?? 0;
  const emergencyCases = overview?.emergency_cases ?? 0;
  const totalReferrals = hospitalReferrals + phcReferrals + emergencyCases;

  const timelineDays = timelineData.length || (dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90);
  const timelineTotalSum = timelineData.reduce((sum, item) => sum + (item.total || 0), 0);
  const dailyAverage = (timelineTotalSum / Math.max(timelineDays, 1)).toFixed(1);

  const referralRate = totalConsultations > 0
    ? Math.round((totalReferrals / totalConsultations) * 100)
    : 0;

  // Timeline max for chart scaling
  const maxDailyVolume = Math.max(...timelineData.map(d => d.total || 0), 5);

  // Latest day activity comparison
  const latestDay = timelineData.length > 0 ? timelineData[timelineData.length - 1] : null;
  const latestCount = latestDay ? (latestDay.total || 0) : 0;
  const isAboveAverage = Number(latestCount) >= Number(dailyAverage);

  // Filtered district list
  const activeDistrictsList = (districtData || [])
    .filter(d => !district || d.district?.toLowerCase() === district.toLowerCase())
    .sort((a, b) => (b.total_calls || 0) - (a.total_calls || 0));

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
            Analytics &amp; Trends
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#94A3B8' }}>
            Understand consultation volume, care recommendations, symptoms, languages, and district activity.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* District Selector */}
          <div style={{ minWidth: '220px' }}>
            <DistrictCombobox
              selectedDistrict={district || ''}
              onSelectDistrict={(dist) => setDistrict(
                dist === 'All Districts' || dist === 'All Districts (India)' ? '' : dist
              )}
              showAllOption={true}
              allOptionLabel="All Districts"
              placeholder="All Districts"
              id="analytics-district-filter"
            />
          </div>

          {/* Time Range Selector */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            backgroundColor: '#111E2E',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '8px',
            padding: '3px',
            gap: '2px'
          }}>
            {[
              { key: '7d', label: '7 Days' },
              { key: '30d', label: '30 Days' },
              { key: 'all', label: 'All Time' }
            ].map(pill => (
              <button
                key={pill.key}
                onClick={() => setDateRange(pill.key)}
                style={{
                  background: dateRange === pill.key ? '#14B8A6' : 'transparent',
                  color: dateRange === pill.key ? '#042F2E' : '#94A3B8',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '5px 12px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {pill.label}
              </button>
            ))}
          </div>

          <button
            onClick={loadAnalytics}
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

      {/* ── Active District Banner (Dark Teal) ────────────────── */}
      {district && (
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
          <span>Showing analytics scoped to <strong style={{ color: '#FFFFFF' }}>{district}</strong></span>
        </div>
      )}

      {/* ── Key Operational Metrics ───────────────────────────── */}
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
              Total Consultations
            </span>
            <span style={{
              width: '28px', height: '28px', borderRadius: '6px',
              background: 'rgba(20, 184, 166, 0.12)', color: '#14B8A6',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <PhoneIncoming size={15} />
            </span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#F8FAFC', lineHeight: 1.1 }}>
            {totalConsultations}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
            {district ? `In ${district}` : 'Across all active districts'}
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
              Patients Served
            </span>
            <span style={{
              width: '28px', height: '28px', borderRadius: '6px',
              background: 'rgba(20, 184, 166, 0.12)', color: '#14B8A6',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Users size={15} />
            </span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#F8FAFC', lineHeight: 1.1 }}>
            {patientsServed}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
            Unique individuals served
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
              Average per Day
            </span>
            <span style={{
              width: '28px', height: '28px', borderRadius: '6px',
              background: 'rgba(20, 184, 166, 0.12)', color: '#14B8A6',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <TrendingUp size={15} />
            </span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#F8FAFC', lineHeight: 1.1 }}>
            {dailyAverage}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
            Consultations per day
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
              Referrals Required
            </span>
            <span style={{
              width: '28px', height: '28px', borderRadius: '6px',
              background: 'rgba(245, 158, 11, 0.12)', color: '#F59E0B',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <AlertTriangle size={15} />
            </span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: totalReferrals > 0 ? '#FCD34D' : '#F8FAFC', lineHeight: 1.1 }}>
            {totalReferrals}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
            {referralRate}% of consultations triaged
          </div>
        </div>
      </div>

      {/* ── Main Visual: Consultations Over Time ─────────────── */}
      <div style={{
        backgroundColor: '#111E2E',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
        padding: '20px 22px',
        marginBottom: '24px',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)'
      }}>
        {/* Chart Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={17} color="#14B8A6" />
              <h3 style={{ fontSize: '0.96rem', fontWeight: 800, color: '#F8FAFC', margin: 0 }}>
                Consultations Over Time
              </h3>
            </div>
            <p style={{ fontSize: '0.76rem', color: '#94A3B8', marginTop: '3px' }}>
              Daily consultation volume over the selected {dateRange === '7d' ? '7-day' : dateRange === '30d' ? '30-day' : 'all-time'} timeframe.
            </p>
          </div>

          {/* Trend Indicator Badge */}
          {latestDay && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '6px',
              backgroundColor: isAboveAverage ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
              border: `1px solid ${isAboveAverage ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`,
              fontSize: '0.74rem',
              fontWeight: 700,
              color: isAboveAverage ? '#34D399' : '#FCD34D'
            }}>
              {isAboveAverage ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              <span>Latest day: {latestCount} calls ({isAboveAverage ? 'Above avg' : 'Normal'})</span>
            </div>
          )}
        </div>

        {/* Chart Area */}
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8', fontSize: '0.84rem' }}>
            <Loader size={24} className="spin text-teal-400" style={{ margin: '0 auto 8px auto', display: 'block' }} />
            <span>Loading consultation trend…</span>
          </div>
        ) : timelineData.length === 0 || timelineTotalSum === 0 ? (
          <div style={{
            padding: '48px 20px',
            textAlign: 'center',
            color: '#94A3B8',
            fontSize: '0.84rem',
            backgroundColor: 'rgba(0, 0, 0, 0.15)',
            borderRadius: '8px'
          }}>
            <CalendarClock size={32} color="#475569" style={{ margin: '0 auto 10px auto', display: 'block' }} />
            <div style={{ fontWeight: 600, color: '#E2E8F0' }}>No consultation data available for this period.</div>
            <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>Real calls will populate the trend timeline automatically.</div>
          </div>
        ) : (
          <div>
            {/* Chart Grid with Columns */}
            <div style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              gap: '8px',
              height: '180px',
              paddingTop: '16px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              {timelineData.map((item, idx) => {
                const total = item.total || 0;
                const heightPct = Math.max(6, Math.round((total / maxDailyVolume) * 100));
                const isHovered = hoveredDay === idx;

                return (
                  <div
                    key={idx}
                    onMouseEnter={() => setHoveredDay(idx)}
                    onMouseLeave={() => setHoveredDay(null)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      height: '100%',
                      justifyContent: 'flex-end',
                      position: 'relative',
                      cursor: 'pointer'
                    }}
                  >
                    {/* Hover Tooltip */}
                    {isHovered && (
                      <div style={{
                        position: 'absolute',
                        bottom: '100%',
                        marginBottom: '8px',
                        backgroundColor: '#0F172A',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        fontSize: '0.7rem',
                        color: '#FFFFFF',
                        whiteSpace: 'nowrap',
                        zIndex: 20,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                        pointerEvents: 'none'
                      }}>
                        <div style={{ fontWeight: 800, color: '#2DD4BF', marginBottom: '2px' }}>
                          {item.date}: {total} Consultations
                        </div>
                        <div style={{ color: '#94A3B8', fontSize: '0.68rem' }}>
                          PHC: {item.phc || 0} • Hospital: {item.hospital || 0} • Emerg: {item.emergency || 0}
                        </div>
                      </div>
                    )}

                    {/* Value label above bar */}
                    <span style={{
                      fontSize: '0.72rem',
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      color: total > 0 ? '#2DD4BF' : '#64748B',
                      marginBottom: '6px'
                    }}>
                      {total}
                    </span>

                    {/* Bar track and fill */}
                    <div style={{
                      width: '100%',
                      maxWidth: '42px',
                      height: `${heightPct}%`,
                      background: total > 0
                        ? (isHovered ? '#2DD4BF' : 'linear-gradient(180deg, #14B8A6 0%, #0F766E 100%)')
                        : 'rgba(255, 255, 255, 0.04)',
                      borderRadius: '4px 4px 0 0',
                      transition: 'all 0.15s ease'
                    }} />
                  </div>
                );
              })}
            </div>

            {/* X-axis Labels */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: '8px',
              paddingTop: '8px'
            }}>
              {timelineData.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    fontSize: '0.68rem',
                    color: '#94A3B8',
                    fontFamily: 'monospace'
                  }}
                >
                  {item.date}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Two Column Row: Care Recommendations & Languages ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: '18px',
        marginBottom: '24px'
      }}>

        {/* 1. Care Recommendations (Triage Distribution) */}
        <div style={{
          backgroundColor: '#111E2E',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          padding: '20px 22px',
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)'
        }}>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <BarChart3 size={16} color="#14B8A6" />
              <h3 style={{ fontSize: '0.94rem', fontWeight: 800, color: '#F8FAFC', margin: 0 }}>
                Care Recommendations
              </h3>
            </div>
            <p style={{ fontSize: '0.74rem', color: '#94A3B8', marginTop: '3px' }}>
              Triage category distribution based on clinical protocol assessment.
            </p>
          </div>

          {triageData.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#94A3B8', fontSize: '0.8rem' }}>
              No triage data recorded yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {triageData.map((item) => {
                const colors = {
                  1: { label: 'Level 1 — Home Care', bar: '#10B981', text: '#6EE7B7' },
                  2: { label: 'Level 2 — PHC Referral', bar: '#38BDF8', text: '#93C5FD' },
                  3: { label: 'Level 3 — Hospital Referral', bar: '#F59E0B', text: '#FCD34D' },
                  4: { label: 'Level 4 — Emergency', bar: '#EF4444', text: '#FCA5A5' }
                }[item.level] || { label: item.name, bar: '#14B8A6', text: '#2DD4BF' };

                const pct = item.percentage ?? 0;

                return (
                  <div key={item.level} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                      <span style={{ fontWeight: 700, color: colors.text }}>
                        {colors.label}
                      </span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#F8FAFC' }}>
                        {item.count} cases ({pct}%)
                      </span>
                    </div>

                    {/* Progress Track */}
                    <div style={{
                      height: '7px',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '9999px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.min(pct, 100)}%`,
                        backgroundColor: colors.bar,
                        borderRadius: '9999px',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. Consultation Languages */}
        <div style={{
          backgroundColor: '#111E2E',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          padding: '20px 22px',
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)'
        }}>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <Globe size={16} color="#14B8A6" />
              <h3 style={{ fontSize: '0.94rem', fontWeight: 800, color: '#F8FAFC', margin: 0 }}>
                Consultation Languages
              </h3>
            </div>
            <p style={{ fontSize: '0.74rem', color: '#94A3B8', marginTop: '3px' }}>
              Spoken languages identified by automatic speech recognition.
            </p>
          </div>

          {languageData.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#94A3B8', fontSize: '0.8rem' }}>
              No language records available.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {languageData.map((item, idx) => {
                const lang = formatLanguageName(item.code, item.name, item.native_name);
                const pct = item.percentage ?? 0;

                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                      <span style={{ fontWeight: 600, color: '#E2E8F0' }}>
                        <strong>{lang.name}</strong> <span style={{ color: '#94A3B8' }}>({lang.native})</span>
                      </span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#F8FAFC' }}>
                        {item.count} ({pct}%)
                      </span>
                    </div>

                    {/* Progress Track */}
                    <div style={{
                      height: '7px',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '9999px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.min(pct, 100)}%`,
                        backgroundColor: '#14B8A6',
                        borderRadius: '9999px',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* ── Two Column Row: Most Reported Symptoms & District Activity ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: '18px',
        marginBottom: '24px'
      }}>

        {/* 1. Most Reported Symptoms */}
        <div style={{
          backgroundColor: '#111E2E',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          padding: '20px 22px',
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)'
        }}>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <Activity size={16} color="#14B8A6" />
              <h3 style={{ fontSize: '0.94rem', fontWeight: 800, color: '#F8FAFC', margin: 0 }}>
                Most Reported Symptoms
              </h3>
            </div>
            <p style={{ fontSize: '0.74rem', color: '#94A3B8', marginTop: '3px' }}>
              Frequency of patient symptoms extracted by clinical NLP.
            </p>
          </div>

          {symptomData.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#94A3B8', fontSize: '0.8rem' }}>
              No symptom trends recorded for this selection.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
              {symptomData.slice(0, 6).map((sym, idx) => {
                const pct = sym.percentage ?? 0;
                const title = formatSymptomTitle(sym.symptom, sym.hindi_name);

                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                          fontSize: '0.66rem',
                          fontWeight: 800,
                          color: '#64748B',
                          fontFamily: 'monospace',
                          width: '16px'
                        }}>
                          #{idx + 1}
                        </span>
                        <span style={{ fontWeight: 600, color: '#E2E8F0' }}>
                          {title}
                        </span>
                      </div>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#F8FAFC' }}>
                        {sym.count} ({pct}%)
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div style={{
                      height: '6px',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '9999px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.min(pct, 100)}%`,
                        backgroundColor: '#2DD4BF',
                        borderRadius: '9999px',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. District Activity Breakdown */}
        <div style={{
          backgroundColor: '#111E2E',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          padding: '20px 22px',
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)'
        }}>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <MapPin size={16} color="#14B8A6" />
              <h3 style={{ fontSize: '0.94rem', fontWeight: 800, color: '#F8FAFC', margin: 0 }}>
                District Activity
              </h3>
            </div>
            <p style={{ fontSize: '0.74rem', color: '#94A3B8', marginTop: '3px' }}>
              Consultations and referral distribution across regional health centers.
            </p>
          </div>

          {activeDistrictsList.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#94A3B8', fontSize: '0.8rem' }}>
              No district activity logged for this selection.
            </div>
          ) : (
            <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.78rem',
                textAlign: 'left'
              }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <th style={{ padding: '8px 10px', color: '#94A3B8', fontWeight: 700 }}>District</th>
                    <th style={{ padding: '8px 10px', color: '#94A3B8', fontWeight: 700, textAlign: 'right' }}>Calls</th>
                    <th style={{ padding: '8px 10px', color: '#94A3B8', fontWeight: 700, textAlign: 'right' }}>Referrals</th>
                    <th style={{ padding: '8px 10px', color: '#94A3B8', fontWeight: 700 }}>Top Complaint</th>
                  </tr>
                </thead>
                <tbody>
                  {activeDistrictsList.slice(0, 8).map((dItem, idx) => (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                        transition: 'background 0.1s ease'
                      }}
                    >
                      <td style={{ padding: '9px 10px', fontWeight: 700, color: '#2DD4BF' }}>
                        {dItem.district}
                      </td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#F8FAFC' }}>
                        {dItem.total_calls}
                      </td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', fontFamily: 'monospace', color: dItem.phc_hospital_cases > 0 ? '#FCD34D' : '#94A3B8' }}>
                        {dItem.phc_hospital_cases}
                      </td>
                      <td style={{ padding: '9px 10px', color: '#CBD5E1', fontSize: '0.74rem' }}>
                        {dItem.top_symptom || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
