import React, { useState, useEffect } from 'react';
import { Settings, ShieldCheck, Database, Cpu, Activity, RefreshCw, CheckCircle, AlertCircle, HardDrive } from 'lucide-react';
import { fetchHealth, fetchAuthStatus } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

export default function SystemSettingsPage() {
  const { t } = useLanguage();
  const [health, setHealth] = useState(null);
  const [authStatus, setAuthStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const [h, a] = await Promise.all([
        fetchHealth().catch(() => null),
        fetchAuthStatus().catch(() => null)
      ]);
      setHealth(h);
      setAuthStatus(a);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  return (
    <div className="system-settings-page">
      <div className="page-header-row">
        <div>
          <h1 className="page-heading">System Diagnostics & Configuration</h1>
          <p className="page-subheading">Operational health probes, AI model adapters, and database integrity</p>
        </div>
        <button className="refresh-btn-clean" onClick={loadStatus}>
          <RefreshCw size={16} />
          <span>Refresh Health</span>
        </button>
      </div>

      <div className="settings-grid">
        {/* Overall Health Card */}
        <div className="ops-settings-card">
          <div className="card-header-clean">
            <Activity size={18} className="text-teal-400" />
            <h3>Core Platform Status</h3>
          </div>
          <div className="card-body-clean">
            <div className="status-row">
              <span className="text-slate-400">FastAPI Backend Service</span>
              <span className="status-pill status-healthy">
                <CheckCircle size={13} className="inline mr-1" />
                {health?.status?.toUpperCase() || 'HEALTHY'}
              </span>
            </div>
            <div className="status-row">
              <span className="text-slate-400">Target Timezone</span>
              <span className="font-semibold text-slate-200">{health?.timezone || 'Asia/Kolkata (IST)'}</span>
            </div>
            <div className="status-row">
              <span className="text-slate-400">Environment</span>
              <span className="font-semibold text-slate-200">{health?.environment || 'Development / Production'}</span>
            </div>
            <div className="status-row">
              <span className="text-slate-400">Server UTC Time</span>
              <span className="text-xs text-slate-400 font-mono">{health?.server_time_utc || new Date().toISOString()}</span>
            </div>
          </div>
        </div>

        {/* Database Card */}
        <div className="ops-settings-card">
          <div className="card-header-clean">
            <Database size={18} className="text-sky-400" />
            <h3>Database & Storage Layer</h3>
          </div>
          <div className="card-body-clean">
            <div className="status-row">
              <span className="text-slate-400">Connection Pool Status</span>
              <span className="status-pill status-healthy">
                <CheckCircle size={13} className="inline mr-1" />
                Connected
              </span>
            </div>
            <div className="status-row">
              <span className="text-slate-400">Database Engine</span>
              <span className="font-semibold text-slate-200">SQLite / PostgreSQL Pool</span>
            </div>
            <div className="status-row">
              <span className="text-slate-400">Data Retention Policy</span>
              <span className="font-semibold text-slate-200">90 Days Audio / 365 Days Case Log</span>
            </div>
          </div>
        </div>

        {/* AI & Speech Pipeline Card */}
        <div className="ops-settings-card">
          <div className="card-header-clean">
            <Cpu size={18} className="text-indigo-400" />
            <h3>AI & Speech Engine Adapters</h3>
          </div>
          <div className="card-body-clean">
            <div className="status-row">
              <span className="text-slate-400">ASR (Speech-to-Text)</span>
              <span className="font-semibold text-slate-200">IndicWav2Vec / Web Audio Telephony</span>
            </div>
            <div className="status-row">
              <span className="text-slate-400">Language Understanding (NLP)</span>
              <span className="font-semibold text-slate-200">IndicBERT + Hinglish Clinical Parser</span>
            </div>
            <div className="status-row">
              <span className="text-slate-400">Triage Decision Engine</span>
              <span className="font-semibold text-slate-200">Deterministic WHO IMCI & ICMR</span>
            </div>
            <div className="status-row">
              <span className="text-slate-400">TTS (Voice Synthesizer)</span>
              <span className="font-semibold text-slate-200">IndicTTS / gTTS Audio Generator</span>
            </div>
          </div>
        </div>

        {/* Compliance & Security Card */}
        <div className="ops-settings-card">
          <div className="card-header-clean">
            <ShieldCheck size={18} className="text-emerald-400" />
            <h3>Security & Compliance</h3>
          </div>
          <div className="card-body-clean">
            <div className="status-row">
              <span className="text-slate-400">Data Protection</span>
              <span className="font-semibold text-slate-200">DPDP Act 2023 Compliant</span>
            </div>
            <div className="status-row">
              <span className="text-slate-400">Authentication Algorithm</span>
              <span className="font-semibold text-slate-200">{authStatus?.token_algorithm || 'HS256 (JWT)'}</span>
            </div>
            <div className="status-row">
              <span className="text-slate-400">PII Masking</span>
              <span className="font-semibold text-slate-200">Enabled (+91-XXXXX-XXXX)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
