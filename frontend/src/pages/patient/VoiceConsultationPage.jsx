import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, ArrowLeft, ShieldAlert, CheckCircle, Hospital, Phone, UserCheck, AlertTriangle, RefreshCw, Send, Globe, Sparkles } from 'lucide-react';
import { processBrowserAudio, startVoiceConsultation, addPatientSessionCode, clearPatientSessionCodes } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// Helper to downsample Float32 PCM audio from device/context sample rate to target sample rate (16000 Hz)
function downsampleBuffer(buffer, srcRate, targetRate = 16000) {
  if (srcRate === targetRate || !srcRate) {
    return buffer;
  }
  if (srcRate < targetRate) {
    return buffer;
  }
  const ratio = srcRate / targetRate;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;
  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
    let accum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i];
      count++;
    }
    result[offsetResult] = count > 0 ? accum / count : 0;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
}

// Helper to encode Float32Array PCM samples into standard 16-bit 16kHz RIFF/WAVE Blob
function encodeWAV(samples, srcSampleRate = 16000, targetSampleRate = 16000) {
  let totalLength = samples.reduce((acc, b) => acc + b.length, 0);
  let merged = new Float32Array(totalLength);
  let offset = 0;
  for (let b of samples) {
    merged.set(b, offset);
    offset += b.length;
  }

  // Downsample to exactly 16000 Hz if recorded at hardware sample rate (e.g. 48kHz or 44.1kHz)
  const resampled = (srcSampleRate && srcSampleRate !== targetSampleRate)
    ? downsampleBuffer(merged, srcSampleRate, targetSampleRate)
    : merged;

  const buffer = new ArrayBuffer(44 + resampled.length * 2);
  const view = new DataView(buffer);

  // Helper to write ASCII
  const writeString = (view, offset, str) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + resampled.length * 2, true);
  writeString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // PCM format (1)
  view.setUint16(22, 1, true); // Mono channel (1)
  view.setUint32(24, targetSampleRate, true); // Sample rate (16000)
  view.setUint32(28, targetSampleRate * 2, true); // Byte rate (SampleRate * NumChannels * BitsPerSample/8)
  view.setUint16(32, 2, true); // Block align (NumChannels * BitsPerSample/8)
  view.setUint16(34, 16, true); // Bits per sample (16)

  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, resampled.length * 2, true);

  // Write 16-bit signed PCM samples
  let index = 44;
  for (let i = 0; i < resampled.length; i++) {
    let s = Math.max(-1, Math.min(1, resampled[i]));
    view.setInt16(index, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    index += 2;
  }

  return new Blob([view], { type: 'audio/wav' });
}

export default function VoiceConsultationPage({
  district = 'Varanasi',
  onBack,
  onNavigateToCases,
  onNavigateToFacilities
}) {
  const { user, isAuthenticated } = useAuth();
  const [stage, setStage] = useState('ready'); // 'ready' | 'recording' | 'processing' | 'completed' | 'error' | 'clarification'
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioVolume, setAudioVolume] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [result, setResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [textInput, setTextInput] = useState('');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const pcmSamplesRef = useRef([]);
  const audioContextRef = useRef(null);
  const capturedSampleRateRef = useRef(16000);
  const processorNodeRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const timerRef = useRef(null);
  const recognitionRef = useRef(null);
  const liveTranscriptRef = useRef('');
  const audioElementRef = useRef(new Audio());

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopMicrophoneStream();
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
    };
  }, []);

  const startRecording = async () => {
    setErrorMessage(null);
    setLiveTranscript('');
    liveTranscriptRef.current = '';
    audioChunksRef.current = [];
    pcmSamplesRef.current = [];
    setRecordingDuration(0);

    try {
      // 1. Request real browser microphone
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });
      
      // 2. Setup Web Audio API with PCM sample recorder & real-time volume visualizer
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const audioCtx = new AudioCtx();
        audioContextRef.current = audioCtx;
        capturedSampleRateRef.current = audioCtx.sampleRate || 16000;
        const source = audioCtx.createMediaStreamSource(stream);

        // Visualizer Analyser
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);
        analyserRef.current = analyser;

        // PCM Audio Processor Node
        const processor = audioCtx.createScriptProcessor(4096, 1, 1);
        processorNodeRef.current = processor;
        processor.onaudioprocess = (e) => {
          const channelData = e.inputBuffer.getChannelData(0);
          pcmSamplesRef.current.push(new Float32Array(channelData));
        };
        source.connect(processor);
        processor.connect(audioCtx.destination);

        const updateVolume = () => {
          if (!analyserRef.current) return;
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          setAudioVolume(Math.min(100, Math.round((avg / 128) * 100)));
          animFrameRef.current = requestAnimationFrame(updateVolume);
        };
        updateVolume();
      }

      // 3. Setup Web Speech API for optional real-time transcript
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = 'en-IN'; // Multi-lingual default in India

          recognition.onresult = (event) => {
            let currentSpeech = '';
            for (let i = 0; i < event.results.length; i++) {
              currentSpeech += event.results[i][0].transcript + ' ';
            }
            const cleanSpeech = currentSpeech.trim();
            if (cleanSpeech) {
              setLiveTranscript(cleanSpeech);
              liveTranscriptRef.current = cleanSpeech;
            }
          };

          recognition.onerror = (e) => {
            console.log('SpeechRecognition notice:', e.error);
          };

          recognition.start();
          recognitionRef.current = recognition;
        } catch (recErr) {
          console.log('SpeechRecognition setup notice:', recErr);
        }
      }

      // 4. Setup MediaRecorder as backup container
      try {
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        recorder.onstop = async () => {
          const nativeSampleRate = capturedSampleRateRef.current || 16000;
          stopMicrophoneStream();
          // Downsample and encode pure 16kHz 16-bit PCM WAV
          let audioBlob;
          if (pcmSamplesRef.current.length > 0) {
            audioBlob = encodeWAV(pcmSamplesRef.current, nativeSampleRate, 16000);
          } else {
            audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
          }
          await handleAudioUpload(audioBlob, liveTranscriptRef.current);
        };

        recorder.start(250);
      } catch (recErr) {
        console.warn('MediaRecorder error, relying on WebAudio PCM:', recErr);
      }

      setStage('recording');

      // Start duration timer
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.warn('Microphone permission or capture error:', err);
      setErrorMessage('Microphone access was denied or unavailable. You can type your health concern below.');
      setStage('ready');
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      setStage('processing');
      mediaRecorderRef.current.stop();
    } else {
      setStage('processing');
      const nativeSampleRate = capturedSampleRateRef.current || 16000;
      stopMicrophoneStream();
      let audioBlob;
      if (pcmSamplesRef.current.length > 0) {
        audioBlob = encodeWAV(pcmSamplesRef.current, nativeSampleRate, 16000);
      } else {
        audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
      }
      handleAudioUpload(audioBlob, liveTranscriptRef.current);
    }
  };

  const stopMicrophoneStream = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
    if (processorNodeRef.current) {
      processorNodeRef.current.disconnect();
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.stream) {
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
    }
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
  };

  const handleAudioUpload = async (audioBlob, spokenTranscript) => {
    setStage('processing');
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'consultation.wav');
      if (spokenTranscript && spokenTranscript.trim()) {
        formData.append('transcript', spokenTranscript.trim());
      }
      formData.append('district', district);
      formData.append('village', 'Local Area');
      formData.append('age_group', 'adult');
      formData.append('is_demo', 'false');

      if (user?.patient_id) {
        formData.append('patient_id', user.patient_id);
      }

      const response = await processBrowserAudio(formData);
      handleConsultationResult(response);
    } catch (err) {
      console.error('Audio processing failed:', err);
      setErrorMessage(err.message || 'Speech processing failed. Please try speaking again.');
      setStage('error');
    }
  };

  const handleTextConsultation = async (e) => {
    if (e) e.preventDefault();
    if (!textInput.trim()) return;

    setStage('processing');
    setErrorMessage(null);
    try {
      const response = await startVoiceConsultation({
        patient_speech: textInput.trim(),
        district: district,
        village: 'Local Area',
        language: 'en',
        is_demo: false,
        caller_phone: user?.phone_number || undefined
      });
      handleConsultationResult(response);
    } catch (err) {
      console.error('Text consultation failed:', err);
      setErrorMessage(err.message || 'Consultation processing failed.');
      setStage('error');
    }
  };

  const handleConsultationResult = (res) => {
    setResult(res);

    if (res.status === 'clarification_needed') {
      setStage('clarification');
    } else {
      setStage('completed');
    }

    // Persist case code only for anonymous patients to access in My Care session
    if (res.case_code && !isAuthenticated) {
      addPatientSessionCode(res.case_code);
    }

    // Auto-play voice guidance TTS if audio is returned
    if (res.audio_data_base64) {
      try {
        const audioSrc = `data:audio/mp3;base64,${res.audio_data_base64}`;
        audioElementRef.current.src = audioSrc;
        audioElementRef.current.play()
          .then(() => setIsPlayingAudio(true))
          .catch(e => console.log('Audio autoplay info:', e));
        
        audioElementRef.current.onended = () => setIsPlayingAudio(false);
      } catch (e) {
        console.error('Audio playback error', e);
      }
    }
  };

  const playVoiceAgain = () => {
    if (result && result.audio_data_base64) {
      audioElementRef.current.currentTime = 0;
      audioElementRef.current.play()
        .then(() => setIsPlayingAudio(true))
        .catch(e => console.log(e));
    }
  };

  const resetConsultation = () => {
    if (!isAuthenticated) {
      clearPatientSessionCodes();
    }
    setResult(null);
    setStage('ready');
    setTextInput('');
    setLiveTranscript('');
    liveTranscriptRef.current = '';
    setErrorMessage(null);
  };

  const handleBack = () => {
    if (!isAuthenticated) {
      clearPatientSessionCodes();
    }
    if (onBack) onBack();
  };

  // Helper for Triage Badges
  const getTriageBadge = (level) => {
    switch (level) {
      case 4:
        return { label: 'Urgent Medical Attention Recommended (108)', bg: 'bg-red-50 text-red-800 border-red-200', icon: AlertTriangle };
      case 3:
        return { label: 'Healthcare Centre Assessment Recommended', bg: 'bg-amber-50 text-amber-800 border-amber-200', icon: Hospital };
      case 2:
        return { label: 'Healthcare Follow-up Recommended (PHC)', bg: 'bg-blue-50 text-blue-800 border-blue-200', icon: Hospital };
      default:
        return { label: 'Self-Care & Hydration Monitored', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200', icon: CheckCircle };
    }
  };

  // HARD INVARIANT CHECK:
  // A facility is only valid if its stored facility.district strictly matches the currently selected district
  const resolvedFacility = result?.recommended_facility;
  const isFacilityMatchingDistrict = resolvedFacility && resolvedFacility.district &&
    district && resolvedFacility.district.trim().toLowerCase() === district.trim().toLowerCase();

  return (
    <div className="voice-consultation-container">
      {/* Top Header */}
      <div className="consultation-top-bar">
        <button className="back-btn" onClick={handleBack}>
          <ArrowLeft size={18} />
          <span>Back to Home</span>
        </button>
        <div className="district-tag">
          <span>District: <strong>{district}</strong></span>
        </div>
      </div>

      <div className="consultation-card">
        {/* STAGE: READY */}
        {stage === 'ready' && (
          <div className="consultation-ready-state">
            <div className="state-header-icon">
              <Mic size={48} className="text-teal-600" />
            </div>
            <h2 className="state-title">Voice Health Consultation</h2>
            <p className="state-subtitle">
              Speak naturally about your symptoms in <strong>English</strong>, <strong>Hindi</strong>, or <strong>Hinglish</strong>.
            </p>

            <div className="example-speech-box">
              <span className="example-tag">Example Speech</span>
              <p className="example-text">"I have had fever for two days and I have a cold. What should I do?"</p>
            </div>

            {errorMessage && (
              <div className="error-alert-box">
                <ShieldAlert size={18} />
                <span>{errorMessage}</span>
              </div>
            )}

            <button className="mic-start-btn" onClick={startRecording} id="mic-record-btn">
              <Mic size={24} />
              <span>Tap to Speak (बोलना शुरू करें)</span>
            </button>

            <div className="text-fallback-divider">
              <span>or type your health concern</span>
            </div>

            <form onSubmit={handleTextConsultation} className="text-input-fallback-form">
              <input
                type="text"
                placeholder="Type your symptoms here (English, Hindi, or Hinglish)..."
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                className="symptom-text-field"
              />
              <button type="submit" className="symptom-send-btn" disabled={!textInput.trim()}>
                <Send size={18} />
              </button>
            </form>
          </div>
        )}

        {/* STAGE: RECORDING */}
        {stage === 'recording' && (
          <div className="consultation-recording-state">
            <div className="listening-indicator-pill">
              <span className="live-dot pulse-red"></span>
              <span>Listening to your speech...</span>
            </div>

            <h3 className="recording-instruction">Speak naturally about what you are experiencing</h3>
            <p className="recording-timer">{recordingDuration} seconds</p>

            {/* Dynamic Real-time Audio Waveform */}
            <div className="live-waveform-bars">
              {[...Array(12)].map((_, i) => {
                const height = Math.max(12, Math.min(65, (audioVolume * ((i % 3) + 1) * 0.4)));
                return (
                  <div
                    key={i}
                    className="wave-bar"
                    style={{ height: `${height}px` }}
                  />
                );
              })}
            </div>

            {/* Live speech preview if speech detected */}
            {liveTranscript ? (
              <div className="live-speech-preview-box">
                <span className="preview-label">Hearing:</span>
                <p className="preview-text">"{liveTranscript}"</p>
              </div>
            ) : (
              <p className="recording-subtext">"Speak in English, Hindi, or Hinglish..."</p>
            )}

            <button className="mic-stop-btn" onClick={stopRecording} id="mic-stop-btn">
              <MicOff size={22} />
              <span>Done Speaking • Get Clinical Guidance</span>
            </button>
          </div>
        )}

        {/* STAGE: PROCESSING */}
        {stage === 'processing' && (
          <div className="consultation-processing-state">
            <div className="spinner-loader"></div>
            <h3 className="processing-title">Understanding Your Health Concern...</h3>
            <div className="processing-steps-list">
              <div className="p-step active">
                <span className="step-check">✓</span>
                <span>Transcribing Microphone Audio & Detecting Language...</span>
              </div>
              <div className="p-step active">
                <span className="step-check">✓</span>
                <span>Extracting Symptoms, Duration & Severity...</span>
              </div>
              <div className="p-step active">
                <span className="step-check">✓</span>
                <span>Evaluating Protocol-Guided Clinical Triage...</span>
              </div>
              <div className="p-step active">
                <span className="step-check">✓</span>
                <span>Generating Voice Guidance & Facility Recommendation...</span>
              </div>
            </div>
          </div>
        )}

        {/* STAGE: CLARIFICATION NEEDED */}
        {stage === 'clarification' && (
          <div className="consultation-clarification-state" style={{ textAlign: 'center', padding: '32px 20px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Mic size={32} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
              We Couldn't Hear You Clearly
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', maxWidth: '440px', margin: '0 auto 24px', lineHeight: 1.5 }}>
              {result?.voice_response || "We couldn't understand your voice clearly. Please try speaking closer to your microphone or typing your health concern."}
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button className="mic-start-btn" onClick={resetConsultation} style={{ width: 'auto', padding: '12px 24px' }}>
                <RefreshCw size={18} />
                <span>Try Again</span>
              </button>
            </div>
          </div>
        )}

        {/* STAGE: ERROR */}
        {stage === 'error' && (
          <div className="consultation-error-state">
            <ShieldAlert size={48} className="text-red-600" />
            <h3>Consultation Error</h3>
            <p>{errorMessage || 'Could not process audio. Please try again.'}</p>
            <button className="retry-btn" onClick={resetConsultation}>
              <RefreshCw size={18} />
              <span>Try Again</span>
            </button>
          </div>
        )}

        {/* STAGE: COMPLETED & STRUCTURED CARE PLAN */}
        {stage === 'completed' && result && (
          <div className="consultation-result-state">
            {/* Top Case Header */}
            <div className="result-header-strip">
              <div>
                <span className="case-ref-tag">Case Reference: <strong>{result.case_code || 'VD-1042'}</strong></span>
                <span className="detected-lang-badge">
                  <Globe size={13} className="inline mr-1" />
                  {result.language_display || result.detected_language?.toUpperCase()}
                </span>
              </div>
              <button 
                className={`voice-replay-btn ${isPlayingAudio ? 'playing' : ''}`}
                onClick={playVoiceAgain}
                title="Play Spoken Voice Guidance Again"
              >
                <Volume2 size={18} />
                <span>{isPlayingAudio ? 'Speaking...' : 'Listen to Guidance'}</span>
              </button>
            </div>

            {/* Patient Transcript Box */}
            <div className="transcript-speech-bubble">
              <span className="bubble-label">Your Reported Concern:</span>
              <p className="bubble-text">"{result.transcript}"</p>
            </div>

            {/* Triage Decision Banner */}
            {(() => {
              const badge = getTriageBadge(result.triage_decision?.level);
              const BadgeIcon = badge.icon;
              return (
                <div className={`triage-banner-box ${badge.bg}`}>
                  <div className="banner-icon-area">
                    <BadgeIcon size={24} />
                  </div>
                  <div className="banner-text-area">
                    <span className="triage-level-tag">{badge.label}</span>
                    <h4 className="triage-reason-heading">{result.triage_decision?.reason}</h4>
                  </div>
                </div>
              );
            })()}

            {/* Spoken Guidance Text */}
            <div className="guidance-voice-box">
              <span className="guidance-label">Clinical Health Guidance:</span>
              <p className="guidance-text">
                {result.voice_response || result.voice_response_hi}
              </p>
            </div>

            {/* Extracted Symptoms Tags */}
            {result.extracted_symptoms && result.extracted_symptoms.length > 0 && (
              <div className="symptoms-detected-row">
                <span className="row-label">Assessed Symptoms:</span>
                <div className="tags-flex">
                  {result.extracted_symptoms.map((s, idx) => (
                    <span key={idx} className={`symptom-tag ${s.is_red_flag ? 'red-flag' : ''}`}>
                      {s.symptom_name ? s.symptom_name.replace('_', ' ') : s.hindi_term} {s.severity ? `(${s.severity})` : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Recommended Healthcare Facility Card with HARD INVARIANT CHECK */}
            {isFacilityMatchingDistrict ? (
              <div className="facility-recommendation-card">
                <div className="facility-card-header">
                  <Hospital size={20} className="text-teal-700" />
                  <h4>Recommended Healthcare Facility ({resolvedFacility.district})</h4>
                </div>
                <div className="facility-card-body">
                  <h5 className="facility-name">{resolvedFacility.name}</h5>
                  <p className="facility-address">{resolvedFacility.address}</p>
                  <div className="facility-contact-strip">
                    <a href={`tel:${resolvedFacility.phone_number}`} className="facility-call-btn">
                      <Phone size={15} />
                      <span>Call {resolvedFacility.phone_number}</span>
                    </a>
                    {result.triage_decision?.level === 4 && (
                      <a href="tel:108" className="emergency-call-pill">
                        <AlertTriangle size={15} />
                        <span>Emergency Helpline: 108</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="no-facility-notice-card">
                <div className="notice-header">
                  <Hospital size={20} className="text-amber-600" />
                  <h4>No Configured Healthcare Facility Found</h4>
                </div>
                <div className="notice-body">
                  <p>
                    No configured healthcare facility found in <strong>{district}</strong>.
                  </p>
                  <div className="notice-actions">
                    <a href="tel:108" className="emergency-call-pill">
                      <AlertTriangle size={15} />
                      <span>Emergency Helpline: 108</span>
                    </a>
                    {onNavigateToFacilities && (
                      <button 
                        onClick={onNavigateToFacilities} 
                        className="browse-all-facilities-btn"
                        type="button"
                      >
                        Browse All Facilities
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ASHA & Follow-up Coordination Card */}
            <div className="care-coordination-card">
              <div className="coordination-header">
                <UserCheck size={20} className="text-emerald-700" />
                <h4>Care Coordination & Follow-up</h4>
              </div>
              <div className="coordination-body">
                <p>
                  {result.asha_alert_sent
                    ? `✓ Community health worker in ${district} has been notified to assist with your recovery.`
                    : 'Self-care monitored. Contact your nearest Primary Health Centre if symptoms persist.'}
                </p>
                <span className="followup-time-badge">
                  24-Hour Reassessment Active
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="result-actions-footer">
              <button className="new-consultation-btn" onClick={resetConsultation}>
                <RefreshCw size={16} />
                <span>New Consultation</span>
              </button>
              <button className="view-cases-btn" onClick={onNavigateToCases}>
                <span>View in My Care</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
