import React, { useState, useEffect, useRef } from 'react';
import { 
  PhoneCall, 
  Play, 
  Pause,
  Volume2, 
  Send, 
  AlertCircle, 
  CheckCircle2, 
  Radio, 
  Sparkles,
  RefreshCw,
  PhoneOff,
  User,
  MapPin,
  Flame,
  ShieldAlert,
  Clock,
  Activity,
  Layers,
  ChevronRight,
  HelpCircle,
  AlertTriangle
} from 'lucide-react';
import { simulateCall } from '../services/api';
import { INDIAN_STATES_DISTRICTS } from '../data/districts';

const PRESET_SCENARIOS = [
  {
    id: 'fever_phc',
    title: 'Acute Fever + Headache (PHC Visit)',
    speech: 'मुझे तीन दिन से बहुत तेज बुखार है और सिर में दर्द हो रहा है।',
    district: 'Varanasi',
    village: 'Rustampur',
    age: 'adult',
    pregnant: false,
    lowConf: false
  },
  {
    id: 'cardiac_emerg',
    title: 'Severe Chest Pain & Dyspnea (Level 4 Emergency)',
    speech: 'सीने में बहुत तेज दर्द हो रहा है और सांस लेने में भारी तकलीफ है, पसीना आ रहा है।',
    district: 'Mirzapur',
    village: 'Daranagar',
    age: 'adult',
    pregnant: false,
    lowConf: false
  },
  {
    id: 'pediatric_diarrhea',
    title: 'Pediatric Vomiting & Diarrhea (Level 3 Hospital)',
    speech: 'बच्चे को कल से उल्टी और दस्त हो रहे हैं, बहुत ज्यादा कमजोरी लग रही है।',
    district: 'Chandauli',
    village: 'Alinagar',
    age: 'child',
    pregnant: false,
    lowConf: false
  },
  {
    id: 'mild_cold',
    title: 'Mild Cold / Sneezing (Level 1 Home Care)',
    speech: 'हल्की खांसी और जुकाम है दो दिन से, कोई तेज बुखार नहीं है।',
    district: 'Varanasi',
    village: 'Lohta',
    age: 'adult',
    pregnant: false,
    lowConf: false
  },
  {
    id: 'low_confidence',
    title: 'Low ASR Confidence / Clarification Test',
    speech: '[LOW_CONF] अस्पष्ट आवाज',
    district: 'Jaunpur',
    village: 'Badlapur',
    age: 'adult',
    pregnant: false,
    lowConf: true
  }
];

const PIPELINE_STAGES = [
  { step: 1, label: 'Incoming Call IVR', desc: 'Telephony Session Initialized' },
  { step: 2, label: 'IVR Spoken Greeting', desc: 'Hindi Prompt Broadcast' },
  { step: 3, label: 'Listening to Patient', desc: 'Telephony Audio Stream Capture' },
  { step: 4, label: 'Speech-to-Text (ASR)', desc: 'IndicWav2Vec Acoustic Model' },
  { step: 5, label: 'Clinical NLP Entity Parsing', desc: 'IndicBERT Symptoms & Negation' },
  { step: 6, label: 'Deterministic Triage', desc: 'WHO IMCI / ICMR Protocol Rules' },
  { step: 7, label: 'Voice Response (TTS)', desc: 'Spoken Guidance Synthesized' },
  { step: 8, label: 'ASHA SMS & Follow-up', desc: 'Community Alert Dispatched' }
];

export default function LiveCallSimulatorPage({ onCallCompleted, showToast }) {
  const [selectedScenario, setSelectedScenario] = useState(PRESET_SCENARIOS[0]);
  const [customSpeech, setCustomSpeech] = useState(PRESET_SCENARIOS[0].speech);
  const [district, setDistrict] = useState(PRESET_SCENARIOS[0].district);
  const [village, setVillage] = useState(PRESET_SCENARIOS[0].village);
  const [ageGroup, setAgeGroup] = useState('adult');
  const [isPregnant, setIsPregnant] = useState(false);
  const [emulateLowConf, setEmulateLowConf] = useState(false);

  const [activeViewMode, setActiveViewMode] = useState('conversation'); // 'conversation' or 'admin'
  const [isSimulating, setIsSimulating] = useState(false);
  const [currentStage, setCurrentStage] = useState(0); // 0 = idle, 1..8
  const [callState, setCallState] = useState('IDLE'); // IDLE, LISTENING, PROCESSING, SPEAKING, COMPLETED
  const [callTimer, setCallTimer] = useState(0);

  const [callResult, setCallResult] = useState(null);
  const [error, setError] = useState(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const audioRef = useRef(null);
  const timerIntervalRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  const handleSelectPreset = (scenario) => {
    setSelectedScenario(scenario);
    setCustomSpeech(scenario.speech);
    setDistrict(scenario.district);
    setVillage(scenario.village);
    setAgeGroup(scenario.age);
    setIsPregnant(scenario.pregnant);
    setEmulateLowConf(scenario.lowConf);
  };

  const runAnimatedSimulation = async () => {
    setIsSimulating(true);
    setError(null);
    setCallResult(null);
    setCurrentStage(1);
    setCallState('LISTENING');
    setCallTimer(0);

    // Start timer counter
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(() => {
      setCallTimer((prev) => prev + 1);
    }, 1000);

    try {
      // Stage 1: Incoming Call (300ms)
      await new Promise(r => setTimeout(r, 400));
      setCurrentStage(2);

      // Stage 2: IVR Greeting (400ms)
      await new Promise(r => setTimeout(r, 500));
      setCurrentStage(3);

      // Stage 3: Patient speaking (waveform active) (800ms)
      await new Promise(r => setTimeout(r, 800));
      setCurrentStage(4);
      setCallState('PROCESSING');

      // Call Backend API
      const apiResponse = await simulateCall({
        patient_speech: customSpeech,
        language: 'hi',
        caller_phone: '+91-98765-43210',
        district: district,
        village: village,
        age_group: ageGroup,
        is_pregnant: isPregnant,
        emulate_low_asr_confidence: emulateLowConf,
        is_demo: true
      });

      // Stage 5: NLP (500ms)
      setCurrentStage(5);
      await new Promise(r => setTimeout(r, 500));

      // Stage 6: Triage (500ms)
      setCurrentStage(6);
      await new Promise(r => setTimeout(r, 500));

      // Stage 7: TTS (400ms)
      setCurrentStage(7);
      setCallState('SPEAKING');
      await new Promise(r => setTimeout(r, 400));

      // Stage 8: ASHA Alert & Follow-up (400ms)
      setCurrentStage(8);
      setCallResult(apiResponse);
      setCallState('COMPLETED');

      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (onCallCompleted) onCallCompleted();
      if (showToast) showToast('✅ Voice Health Guidance Session Resolved & Stored.');

    } catch (err) {
      setError(err.message || 'Failed to simulate call session');
      setCallState('IDLE');
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    } finally {
      setIsSimulating(false);
    }
  };

  const getTriageBadge = (level) => {
    if (level === 4) return <span className="badge badge-emergency">Level 4 — Emergency</span>;
    if (level === 3) return <span className="badge badge-hospital">Level 3 — Hospital / CHC</span>;
    if (level === 2) return <span className="badge badge-phc">Level 2 — PHC Visit</span>;
    if (level === 1) return <span className="badge badge-home">Level 1 — Home Care</span>;
    return <span className="badge badge-phc">Clarification Required</span>;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <PhoneCall size={26} color="#60A5FA" />
              <span>Development Simulator & Speech Test Bench</span>
            </h2>
            <span style={{
              background: 'rgba(96, 165, 250, 0.15)',
              border: '1px solid rgba(96, 165, 250, 0.3)',
              color: '#60A5FA',
              fontSize: '0.7rem',
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: '4px'
            }}>
              Development Tool (is_demo=true)
            </span>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Developer test harness to simulate phone speech without telecom charges. Real incoming phone calls arrive via Twilio/Exotel webhooks and appear directly in live production logs.
          </p>
        </div>

        {/* View Switcher: Patient Conversation vs Admin Debug */}
        <div style={{ display: 'flex', background: 'var(--bg-card)', padding: '4px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
          <button
            onClick={() => setActiveViewMode('conversation')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              background: activeViewMode === 'conversation' ? 'rgba(16, 185, 129, 0.18)' : 'transparent',
              color: activeViewMode === 'conversation' ? '#10B981' : 'var(--text-muted)',
              fontSize: '0.8rem',
              fontWeight: 700
            }}
          >
            Conversational Voice View
          </button>
          <button
            onClick={() => setActiveViewMode('admin')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              background: activeViewMode === 'admin' ? 'rgba(59, 130, 246, 0.18)' : 'transparent',
              color: activeViewMode === 'admin' ? '#60A5FA' : 'var(--text-muted)',
              fontSize: '0.8rem',
              fontWeight: 700
            }}
          >
            Admin / ML Pipeline View
          </button>
        </div>
      </div>

      {/* Main Simulator Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.35fr', gap: '28px', alignItems: 'start' }}>
        
        {/* Left Column: Preset Clinical Scenarios & Call Configuration */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Preset Clinical Scenarios */}
          <div className="v-card">
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} color="#10B981" />
              <span>Select Clinical Test Scenario</span>
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {PRESET_SCENARIOS.map((sc) => {
                const isSelected = selectedScenario?.id === sc.id;
                return (
                  <button
                    key={sc.id}
                    onClick={() => handleSelectPreset(sc)}
                    disabled={isSimulating}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-sm)',
                      background: isSelected ? 'rgba(16, 185, 129, 0.14)' : 'var(--bg-card-subtle)',
                      border: isSelected ? '1px solid #10B981' : '1px solid rgba(255,255,255,0.06)',
                      color: '#FFFFFF',
                      textAlign: 'left',
                      width: '100%',
                      boxShadow: isSelected ? '0 0 15px rgba(16, 185, 129, 0.15)' : 'none'
                    }}
                  >
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: isSelected ? '#10B981' : '#FFFFFF' }}>
                      {sc.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      "{sc.speech.slice(0, 52)}..."
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Patient Spoken Hindi Customizer */}
          <div className="v-card">
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '14px' }}>
              Patient Voice Speech (Hindi)
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Spoken Patient Utterance (Devanagari or Hinglish):
                </label>
                <textarea
                  rows={3}
                  value={customSpeech}
                  disabled={isSimulating}
                  onChange={(e) => setCustomSpeech(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '10px 12px',
                    color: '#FFFFFF',
                    fontSize: '0.9rem',
                    resize: 'vertical'
                  }}
                  placeholder="कृपया अपने लक्षण हिंदी में लिखें..."
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Patient Age Category:
                  </label>
                  <select
                    value={ageGroup}
                    disabled={isSimulating}
                    onChange={(e) => setAgeGroup(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px 10px',
                      color: '#FFFFFF',
                      fontSize: '0.85rem'
                    }}
                  >
                    <option value="adult">Adult (वयस्क)</option>
                    <option value="child">Child / Pediatric (बच्चा)</option>
                    <option value="elderly">Elderly (बुजुर्ग)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    District Location:
                  </label>
                  <select
                    value={district}
                    disabled={isSimulating}
                    onChange={(e) => setDistrict(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px 10px',
                      color: '#FFFFFF',
                      fontSize: '0.85rem'
                    }}
                  >
                    {Object.entries(INDIAN_STATES_DISTRICTS).map(([stateName, distList]) => (
                      <optgroup key={stateName} label={stateName}>
                        {distList.map(d => (
                          <option key={`${stateName}-${d}`} value={d}>{d} ({stateName})</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={isPregnant}
                    disabled={isSimulating}
                    onChange={(e) => setIsPregnant(e.target.checked)}
                  />
                  <span>Pregnant (गर्भवती)</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={emulateLowConf}
                    disabled={isSimulating}
                    onChange={(e) => setEmulateLowConf(e.target.checked)}
                  />
                  <span>Low ASR Confidence Test</span>
                </label>
              </div>

              <button
                onClick={runAnimatedSimulation}
                disabled={isSimulating}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  background: isSimulating ? 'rgba(16, 185, 129, 0.4)' : 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  color: '#FFFFFF',
                  padding: '14px 20px',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  marginTop: '8px',
                  boxShadow: '0 4px 18px rgba(16, 185, 129, 0.4)'
                }}
              >
                {isSimulating ? (
                  <>
                    <RefreshCw size={18} className="spin-anim" />
                    <span>Executing Voice Triage Pipeline...</span>
                  </>
                ) : (
                  <>
                    <PhoneCall size={18} />
                    <span>Simulate Incoming Patient Call</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Live Pipeline Visualizer & Conversational UI */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Active Call Header & Telephony Waveform Box */}
          <div className="v-card" style={{
            background: callResult?.triage_decision?.level === 4 ? 'linear-gradient(135deg, #240C0C 0%, #17111A 100%)' : 'linear-gradient(135deg, #111726 0%, #151F33 100%)',
            border: callResult?.triage_decision?.level === 4 ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid var(--border-active)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  padding: '10px',
                  borderRadius: '10px',
                  background: callState === 'SPEAKING' ? 'rgba(16, 185, 129, 0.2)' : (callState === 'LISTENING' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)'),
                  color: callState === 'SPEAKING' ? '#10B981' : (callState === 'LISTENING' ? '#60A5FA' : '#94A3B8')
                }}>
                  <Radio size={22} className={callState !== 'IDLE' && callState !== 'COMPLETED' ? "pulse-dot" : ""} />
                </div>
                <div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#FFFFFF' }}>
                    VaaniDoc Rural Tele-Triage IVR (Toll-Free)
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Caller: +91-XXXXX-43210 &bull; {village}, {district}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  fontSize: '0.75rem',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  background: 'rgba(0,0,0,0.3)',
                  color: '#FFFFFF',
                  fontFamily: 'monospace',
                  fontWeight: 700
                }}>
                  ⏱️ 00:{callTimer < 10 ? `0${callTimer}` : callTimer}
                </div>
                {callResult ? getTriageBadge(callResult.triage_decision.level) : (
                  <span className="badge badge-phc">{callState}</span>
                )}
              </div>
            </div>

            {/* Live Audio Waveform & Status */}
            <div style={{
              background: 'rgba(0,0,0,0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '14px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="wave-container">
                  <div className="wave-bar" />
                  <div className="wave-bar" />
                  <div className="wave-bar" />
                  <div className="wave-bar" />
                  <div className="wave-bar" />
                  <div className="wave-bar" />
                  <div className="wave-bar" />
                  <div className="wave-bar" />
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#FFFFFF' }}>
                    {callState === 'LISTENING' && '🎙️ Listening to patient speech...'}
                    {callState === 'PROCESSING' && '🧠 Understanding symptoms & querying clinical rules...'}
                    {callState === 'SPEAKING' && '🔊 VaaniDoc speaking guidance to patient...'}
                    {callState === 'COMPLETED' && '✅ Call Completed — Health Record & ASHA Alert Saved'}
                    {callState === 'IDLE' && 'Telephony line ready for call simulation'}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                    PCM 8kHz Telephony Codec &bull; Adaptive Noise Cancellation
                  </div>
                </div>
              </div>

              {callResult?.audio_data_base64 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <audio
                    ref={audioRef}
                    src={`data:audio/wav;base64,${callResult.audio_data_base64}`}
                    onPlay={() => setIsPlayingAudio(true)}
                    onEnded={() => setIsPlayingAudio(false)}
                    onPause={() => setIsPlayingAudio(false)}
                    controls
                    style={{ height: '32px', maxWidth: '200px' }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Emergency Alert Banner for Level 4 */}
          {callResult?.triage_decision?.level === 4 && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.25) 0%, rgba(185, 28, 28, 0.15) 100%)',
              border: '2px solid #EF4444',
              borderRadius: 'var(--radius-md)',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              animation: 'pulse-red 2s infinite'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <ShieldAlert size={28} color="#EF4444" />
                <div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#EF4444' }}>
                    🚨 LEVEL 4 EMERGENCY DETECTED
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#FFFFFF' }}>
                    Immediate emergency transfer required. National Ambulance Helpline: <strong>108</strong>
                  </div>
                </div>
              </div>

              <span className="badge badge-emergency">Immediate Escalation</span>
            </div>
          )}

          {/* Low Confidence Warning Notice */}
          {callResult?.status === 'clarification_needed' && (
            <div style={{
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              borderRadius: 'var(--radius-md)',
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <AlertTriangle size={24} color="#F59E0B" />
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#F59E0B' }}>
                  Low ASR Confidence &bull; Clarification Requested
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Acoustic confidence fell below 65%. VaaniDoc conservatively asks the patient to repeat clearly.
                </div>
              </div>
            </div>
          )}

          {/* Sequential Pipeline Progress Tracker */}
          <div className="v-card" style={{ padding: '16px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px' }}>
              Sequential AI & Clinical Pipeline Execution (8 Stages)
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {PIPELINE_STAGES.map((st) => {
                const isPassed = currentStage >= st.step;
                const isCurrent = currentStage === st.step;
                return (
                  <div
                    key={st.step}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      background: isCurrent ? 'rgba(16, 185, 129, 0.2)' : (isPassed ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-main)'),
                      border: isCurrent ? '1px solid #10B981' : (isPassed ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-subtle)'),
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 800, color: isPassed ? '#10B981' : 'var(--text-dim)' }}>
                        0{st.step}
                      </span>
                      {isPassed && <CheckCircle2 size={12} color="#10B981" />}
                    </div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: isPassed ? '#FFFFFF' : 'var(--text-dim)' }}>
                      {st.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mode 1: Conversational Voice View */}
          {activeViewMode === 'conversation' && (
            <div className="v-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Voice Conversation Dialogue Stream
              </div>

              {/* Message 1: VaaniDoc Greeting */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontWeight: 800, fontSize: '0.75rem' }}>
                  VD
                </div>
                <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-subtle)', padding: '12px 16px', borderRadius: '0 12px 12px 12px', maxWidth: '85%' }}>
                  <div style={{ fontSize: '0.7rem', color: '#10B981', fontWeight: 700, marginBottom: '2px' }}>
                    VaaniDoc (IVR Greeting)
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#FFFFFF', lineHeight: '1.4' }}>
                    नमस्ते! वाणी-डॉक (VaaniDoc) स्वास्थ्य सेवा में आपका स्वागत है। कृपया बताएं, आपको क्या परेशानी हो रही है?
                  </div>
                </div>
              </div>

              {/* Message 2: Patient Speech */}
              {currentStage >= 3 && (
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', justifyContent: 'flex-end' }}>
                  <div style={{ background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '12px 16px', borderRadius: '12px 0 12px 12px', maxWidth: '85%' }}>
                    <div style={{ fontSize: '0.7rem', color: '#60A5FA', fontWeight: 700, marginBottom: '2px', textAlign: 'right' }}>
                      Patient ({village}, {district})
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#FFFFFF', lineHeight: '1.4' }}>
                      "{customSpeech}"
                    </div>
                  </div>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontWeight: 800, fontSize: '0.75rem' }}>
                    <User size={16} />
                  </div>
                </div>
              )}

              {/* Message 3: VaaniDoc Spoken Guidance */}
              {callResult && (
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontWeight: 800, fontSize: '0.75rem' }}>
                    VD
                  </div>
                  <div style={{
                    background: callResult.triage_decision.level === 4 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.12)',
                    border: callResult.triage_decision.level === 4 ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(16, 185, 129, 0.3)',
                    padding: '14px 18px',
                    borderRadius: '0 12px 12px 12px',
                    maxWidth: '85%'
                  }}>
                    <div style={{ fontSize: '0.7rem', color: callResult.triage_decision.level === 4 ? '#EF4444' : '#10B981', fontWeight: 700, marginBottom: '4px' }}>
                      VaaniDoc Spoken Guidance (Indic TTS)
                    </div>
                    <div style={{ fontSize: '0.95rem', color: '#FFFFFF', lineHeight: '1.5', marginBottom: '8px' }}>
                      "{callResult.voice_response_hi}"
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      Triage Decision: <strong>Level {callResult.triage_decision.level} ({callResult.triage_decision.category.toUpperCase()})</strong>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* Mode 2: Admin / ML Pipeline View */}
          {activeViewMode === 'admin' && callResult && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* ASR & NLP Debug */}
              <div className="v-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#60A5FA', textTransform: 'uppercase' }}>
                    IndicWav2Vec ASR & Confidence Score
                  </span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#10B981' }}>
                    {(callResult.asr_confidence * 100).toFixed(1)}% Confidence
                  </span>
                </div>
                
                {/* Confidence Bar */}
                <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden', marginBottom: '12px' }}>
                  <div style={{ width: `${callResult.asr_confidence * 100}%`, height: '100%', background: callResult.asr_confidence >= 0.7 ? '#10B981' : '#F59E0B' }} />
                </div>

                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#A855F7', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Extracted Clinical Entities (IndicBERT)
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {callResult.extracted_symptoms.map((s, idx) => (
                    <div key={idx} style={{ padding: '6px 12px', borderRadius: '6px', background: s.is_red_flag ? 'rgba(239,68,68,0.2)' : 'rgba(59,130,246,0.15)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.8rem', color: '#FFFFFF' }}>
                      <strong>{s.hindi_term || s.name}</strong> &bull; Duration: {s.duration_val || 'N/A'} {s.duration_unit} &bull; Severity: {s.severity}
                    </div>
                  ))}
                </div>
              </div>

              {/* Triage Decision */}
              <div className="v-card">
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10B981', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Deterministic WHO IMCI / ICMR Triage Evaluation
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Rule ID: <strong style={{ color: '#60A5FA' }}>{callResult.triage_decision.rule_id}</strong>
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#FFFFFF', marginTop: '4px' }}>
                  Reason: {callResult.triage_decision.reason}
                </div>
              </div>

              {/* ASHA SMS Alert Box */}
              {callResult.asha_alert_sent && (
                <div className="v-card" style={{ background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#A855F7', textTransform: 'uppercase', marginBottom: '6px' }}>
                    ASHA Worker Automated SMS Dispatch Preview
                  </div>
                  <pre style={{ fontSize: '0.8rem', color: '#FFFFFF', fontFamily: 'monospace', background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '6px', whiteSpace: 'pre-wrap' }}>
                    {callResult.asha_alert_message}
                  </pre>
                </div>
              )}

            </div>
          )}

        </div>

      </div>

    </div>
  );
}
