import React, { useState, useEffect } from 'react';
import { ClipboardList, Search, Filter, Hospital, UserCheck, Clock, MapPin, ChevronRight, X, RefreshCw, AlertTriangle } from 'lucide-react';
import { fetchCases, fetchCaseDetail, recordCaseAction } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { INDIAN_STATES_DISTRICTS } from '../data/districts';
import AshaCaseDetailModal from '../components/Asha/AshaCaseDetailModal';

export default function CasesManagementPage({ showToast }) {
  const { t } = useLanguage();
  const { isAsha, user } = useAuth();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [triageFilter, setTriageFilter] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [selectedCase, setSelectedCase] = useState(null);

  const loadCases = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
      if (triageFilter) params.triage_level = parseInt(triageFilter, 10);
      if (districtFilter) params.district = districtFilter;
      params.exclude_demo = true; // production clean view

      const data = await fetchCases(params);
      setCases(data);
    } catch (err) {
      console.error('Failed to load cases', err);
      if (showToast) showToast('Failed to load cases');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCases();
  }, [statusFilter, triageFilter, districtFilter]);

  const filtered = cases.filter(c => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return c.case_code.toLowerCase().includes(q) || 
           c.primary_complaint.toLowerCase().includes(q) ||
           (c.patient?.district && c.patient.district.toLowerCase().includes(q));
  });

  const getTriageBadge = (level) => {
    switch (level) {
      case 4: return 'badge-emergency';
      case 3: return 'badge-hospital';
      case 2: return 'badge-phc';
      default: return 'badge-home';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Resolved': return 'status-resolved';
      case 'Escalated': return 'status-escalated';
      case 'Referral Recommended': return 'status-referred';
      default: return 'status-active';
    }
  };

  return (
    <div className="cases-management-page">
      {/* Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-heading">{t('cases_title')}</h1>
          <p className="page-subheading">{t('cases_subtitle')}</p>
        </div>
        <button className="refresh-btn-clean" onClick={loadCases}>
          <RefreshCw size={16} />
          <span>{t('refresh')}</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="cases-filter-strip">
        <div className="search-box-wrap">
          <Search size={16} className="text-slate-400" />
          <input
            type="text"
            placeholder={t('search_cases')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="filter-search-input"
          />
        </div>

        <select 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)}
          className="filter-dropdown"
        >
          <option value="all">{t('filter_all')}</option>
          <option value="New">New</option>
          <option value="Assessing">Assessing</option>
          <option value="Referral Recommended">Referral Recommended</option>
          <option value="ASHA Follow-up">ASHA Follow-up</option>
          <option value="Follow-up Due">Follow-up Due</option>
          <option value="Resolved">Resolved</option>
          <option value="Escalated">Escalated</option>
        </select>

        <select 
          value={triageFilter} 
          onChange={(e) => setTriageFilter(e.target.value)}
          className="filter-dropdown"
        >
          <option value="">All Triage Levels</option>
          <option value="4">Level 4 — Emergency</option>
          <option value="3">Level 3 — Hospital</option>
          <option value="2">Level 2 — PHC</option>
          <option value="1">Level 1 — Home Care</option>
        </select>

        <select 
          value={districtFilter} 
          onChange={(e) => setDistrictFilter(e.target.value)}
          className="filter-dropdown"
        >
          <option value="">All Districts (India)</option>
          {Object.entries(INDIAN_STATES_DISTRICTS).map(([stateName, distList]) => (
            <optgroup key={stateName} label={stateName}>
              {distList.map(d => (
                <option key={`${stateName}-${d}`} value={d}>
                  {d} ({stateName})
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Cases Table */}
      <div className="cases-table-card">
        {loading ? (
          <div className="table-loading-wrap">{t('loading')}</div>
        ) : filtered.length === 0 ? (
          <div className="table-empty-wrap">
            <ClipboardList size={40} className="text-slate-300 mb-2" />
            <p>{districtFilter ? "No consultations found for this district." : t('no_data')}</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="clean-data-table">
              <thead>
                <tr>
                  <th>{t('col_case_code')}</th>
                  <th>{t('col_complaint')}</th>
                  <th>{t('col_language')}</th>
                  <th>{t('col_triage')}</th>
                  <th>{t('col_status')}</th>
                  <th>{t('col_facility')}</th>
                  <th>{t('col_asha')}</th>
                  <th>{t('col_date')}</th>
                  <th>{t('col_actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="case-row-hover" onClick={() => setSelectedCase(c)}>
                    <td className="font-semibold text-teal-700">{c.case_code}</td>
                    <td className="max-w-xs truncate" title={c.primary_complaint}>
                      {c.primary_complaint}
                    </td>
                    <td>
                      <span className="lang-mini-tag">
                        {c.detected_language?.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <span className={`triage-badge-pill ${getTriageBadge(c.triage_level)}`}>
                        Level {c.triage_level}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge-pill ${getStatusBadge(c.status)}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="text-slate-600">
                      {c.facility?.name || '—'}
                    </td>
                    <td className="text-slate-600">
                      {c.asha_worker?.name || 'Unassigned'}
                    </td>
                    <td className="text-xs text-slate-500">
                      {new Date(c.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td>
                      <button 
                        className="table-inspect-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCase(c);
                        }}
                      >
                        <span>{t('view_case')}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Case Detail Slide-over / Modal */}
      {selectedCase && (
        <AshaCaseDetailModal
          selectedCase={selectedCase}
          onClose={() => setSelectedCase(null)}
          onSaveSuccess={loadCases}
          showToast={showToast}
          user={user}
        />
      )}
    </div>
  );
}
