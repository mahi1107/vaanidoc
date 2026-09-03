import React, { useState, useEffect } from 'react';
import { ArrowLeft, Hospital, Phone, MapPin, Search, ShieldCheck, AlertTriangle } from 'lucide-react';
import { fetchFacilities } from '../../services/api';
import { DEFAULT_DISTRICT } from '../../data/districts';
import DistrictCombobox from '../../components/Common/DistrictCombobox';

export default function FacilityFinderPage({ initialDistrict = DEFAULT_DISTRICT, initialType = '', onBack }) {
  const [facilities, setFacilities] = useState([]);
  const [district, setDistrict] = useState(initialDistrict);
  const [facilityType, setFacilityType] = useState(initialType);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const types = [
    { label: 'All Facility Types', value: '' },
    { label: 'Primary Health Centres (PHC)', value: 'PHC' },
    { label: 'Community Health Centres (CHC)', value: 'CHC' },
    { label: 'District Hospitals', value: 'DISTRICT_HOSPITAL' },
    { label: 'Emergency 108 Dispatch', value: 'EMERGENCY' }
  ];

  const loadFacilities = async () => {
    setLoading(true);
    try {
      const params = {};
      if (district && district !== 'All Districts (India)' && district !== 'All Districts') {
        params.district = district;
      }
      if (facilityType) params.facility_type = facilityType;
      const data = await fetchFacilities(params);
      setFacilities(data);
    } catch (err) {
      console.error('Failed to load facilities', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFacilities();
  }, [district, facilityType]);

  const filtered = facilities.filter(f => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return f.name.toLowerCase().includes(q) || f.district.toLowerCase().includes(q) || f.block.toLowerCase().includes(q);
  });

  return (
    <div className="facility-finder-page">
      <div className="finder-top-bar">
        <button className="back-btn" onClick={onBack}>
          <ArrowLeft size={18} />
          <span>Back to Home</span>
        </button>
        <div className="emergency-fast-call">
          <a href="tel:108" className="emergency-pill-btn">
            <AlertTriangle size={15} />
            <span>Emergency Ambulance: 108</span>
          </a>
        </div>
      </div>

      <div className="finder-header">
        <h2>Verified Government Healthcare Facilities</h2>
        <p>Official Public Health Centres, CHCs, and District Hospitals across India</p>
      </div>

      {/* Filter Row */}
      <div className="finder-filters-row">
        <div className="filter-item search-box">
          <Search size={16} className="text-slate-400" />
          <input
            type="text"
            placeholder="Search facility name, block, or town..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="filter-input"
          />
        </div>

        <div className="filter-item select-box combobox-filter-item">
          <DistrictCombobox
            selectedDistrict={district}
            onSelectDistrict={(d) => setDistrict(d)}
            showAllOption={true}
            allOptionLabel="All Districts (India)"
            placeholder="Filter by district..."
          />
        </div>

        <div className="filter-item select-box">
          <Hospital size={16} className="text-teal-600" />
          <select value={facilityType} onChange={(e) => setFacilityType(e.target.value)} className="filter-select">
            {types.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      </div>

      {/* Facilities Grid */}
      <div className="facilities-grid">
        {loading ? (
          <div className="loading-grid">Loading verified healthcare centres...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-facilities-notice">
            <Hospital size={40} className="text-slate-300" />
            <p>No configured healthcare facility found for {district && district !== 'All Districts (India)' ? district : 'this search'}.</p>
            <p className="text-xs text-slate-400 mt-1">For urgent emergencies, please dial 108 for government ambulance service.</p>
          </div>
        ) : (
          filtered.map((f) => (
            <div key={f.id} className="facility-item-card">
              <div className="card-top-type">
                <span className={`facility-type-badge type-${f.facility_type?.toLowerCase()}`}>
                  {f.facility_type?.replace('_', ' ')}
                </span>
                <span className="verified-badge">
                  <ShieldCheck size={14} className="text-emerald-600 inline mr-1" />
                  Verified Govt.
                </span>
              </div>

              <h3 className="facility-title">{f.name}</h3>
              <p className="facility-loc">
                <MapPin size={14} className="inline mr-1 text-slate-400" />
                {f.block} Block, {f.district}
              </p>
              <p className="facility-full-addr">{f.address}</p>

              {f.services_offered && f.services_offered.length > 0 && (
                <div className="services-chips-row">
                  {f.services_offered.slice(0, 3).map((s, idx) => (
                    <span key={idx} className="service-chip">{s}</span>
                  ))}
                  {f.services_offered.length > 3 && (
                    <span className="service-chip-more">+{f.services_offered.length - 3} more</span>
                  )}
                </div>
              )}

              <div className="card-action-bottom">
                <a href={`tel:${f.phone_number}`} className="card-call-btn">
                  <Phone size={15} />
                  <span>Call {f.phone_number}</span>
                </a>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
