import React from 'react';
import { ShieldCheck, Lock, EyeOff, Server, Phone, Cpu, FileCheck } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', maxWidth: '1000px' }}>
      
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ShieldCheck size={26} color="#10B981" />
          <span>Patient Privacy & Healthcare Regulatory Architecture</span>
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          VaaniDoc is engineered with privacy-by-design for community healthcare in rural India.
        </p>
      </div>

      {/* Grid of Privacy Pillars */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px'
      }}>
        
        <div className="v-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#10B981', marginBottom: '12px' }}>
            <EyeOff size={22} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#FFFFFF' }}>Zero Unnecessary PII</h3>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            The system does not mandate citizen names, Aadhaar numbers, biometric scans, or account passwords. Caller phone numbers are cryptographically masked (+91-XXXXX-12345) before entering analytics streams.
          </p>
        </div>

        <div className="v-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#3B82F6', marginBottom: '12px' }}>
            <Lock size={22} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#FFFFFF' }}>Configurable Audio Retention</h3>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            Raw telephony audio recordings are ephemeral by default (auto-purged after 7 days). Only anonymized clinical entity records and auditable triage rule identifiers are retained for public health surveillance.
          </p>
        </div>

        <div className="v-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#F59E0B', marginBottom: '12px' }}>
            <Cpu size={22} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#FFFFFF' }}>Conservative AI Safety</h3>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            VaaniDoc explicitly disclaims autonomous medical diagnosis. All decision flows are deterministic decision trees based on WHO IMCI and ICMR protocols, with mandatory escalation for red-flag symptoms.
          </p>
        </div>

        <div className="v-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#A855F7', marginBottom: '12px' }}>
            <Phone size={22} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#FFFFFF' }}>Provider Interoperability</h3>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            Supports Indian telecom providers (Exotel, Tata Teleservices) as well as international carriers (Twilio) via strict provider abstractions without vendor lock-in.
          </p>
        </div>

      </div>

      {/* Disclaimer Box */}
      <div style={{
        background: 'rgba(239, 68, 68, 0.08)',
        border: '1px solid rgba(239, 68, 68, 0.25)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        color: '#FFFFFF'
      }}>
        <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#EF4444', marginBottom: '8px' }}>
          Important Clinical Safety Disclaimer
        </h4>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
          VaaniDoc is an AI voice tele-triage and guidance platform designed to assist in health navigation and timely escalation to Primary Health Centres (PHC), Community Health Centres (CHC), and Emergency Services (108). It is not a replacement for in-person physical clinical examinations, diagnostic laboratory tests, or physician consultations.
        </p>
      </div>

    </div>
  );
}
