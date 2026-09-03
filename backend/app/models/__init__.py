import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, Text, Integer, Float, JSON
from sqlalchemy.orm import relationship
from backend.app.database.session import Base

class Patient(Base):
    __tablename__ = "patients"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    # Anonymized session / phone hash - no direct plaintext PII stored unless necessary
    caller_hash = Column(String(64), index=True, nullable=True)
    district = Column(String(100), index=True, nullable=True)
    sub_district = Column(String(100), nullable=True)
    village = Column(String(100), nullable=True)
    age_group = Column(String(30), nullable=True) # e.g. "child", "adult", "elderly"
    gender = Column(String(20), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    call_sessions = relationship("CallSession", back_populates="patient", cascade="all, delete-orphan")


class CallSession(Base):
    __tablename__ = "call_sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_id = Column(String(36), ForeignKey("patients.id"), nullable=True)
    provider = Column(String(50), default="mock")  # mock, exotel, twilio
    provider_call_id = Column(String(100), index=True, nullable=True)
    caller_phone = Column(String(30), nullable=True)  # Masked e.g. +91-XXXXX-12345
    language = Column(String(10), default="hi")
    state = Column(String(50), default="GREETING")  # GREETING, LANGUAGE_SELECT, CHIEF_COMPLAINT, MISSING_INFO, TRIAGE, GUIDANCE, COMPLETED, TERMINATED
    started_at = Column(DateTime, default=datetime.utcnow, index=True)
    ended_at = Column(DateTime, nullable=True)
    duration_seconds = Column(Integer, default=0)
    audio_path = Column(String(255), nullable=True)
    status = Column(String(30), default="in_progress")  # incoming, active, processing, completed, failed, escalated
    is_demo = Column(Boolean, default=False, index=True) # True for developer simulator / test calls, False for real phone calls
    timeline_events = Column(JSON, nullable=True) # Auditable timeline list of {timestamp, stage, latency_ms, status}
    
    # Relationships
    patient = relationship("Patient", back_populates="call_sessions")
    transcripts = relationship("Transcript", back_populates="call_session", cascade="all, delete-orphan")
    symptoms = relationship("SymptomRecord", back_populates="call_session", cascade="all, delete-orphan")
    triage_results = relationship("TriageResult", back_populates="call_session", cascade="all, delete-orphan")
    followup = relationship("FollowUp", back_populates="call_session", uselist=False, cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="call_session", cascade="all, delete-orphan")
    audio_records = relationship("AudioMetadata", back_populates="call_session", cascade="all, delete-orphan")


class Transcript(Base):
    __tablename__ = "transcripts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    call_session_id = Column(String(36), ForeignKey("call_sessions.id"), nullable=False)
    turn_index = Column(Integer, default=0)
    speaker = Column(String(20), default="patient")  # patient, system
    raw_audio_url = Column(String(255), nullable=True)
    transcript = Column(Text, nullable=False)
    confidence = Column(Float, default=1.0)
    language = Column(String(10), default="hi")
    asr_provider = Column(String(50), default="mock")
    processing_ms = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    call_session = relationship("CallSession", back_populates="transcripts")


class SymptomRecord(Base):
    __tablename__ = "symptom_records"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    call_session_id = Column(String(36), ForeignKey("call_sessions.id"), nullable=False)
    symptom_name = Column(String(100), nullable=False, index=True) # e.g. fever, headache, cough, dyspnea
    hindi_term = Column(String(100), nullable=True) # e.g. बुखार, सिर दर्द
    duration_val = Column(Integer, nullable=True)
    duration_unit = Column(String(20), nullable=True) # days, hours, weeks
    severity = Column(String(30), default="moderate") # mild, moderate, severe, high
    is_negated = Column(Boolean, default=False)
    is_red_flag = Column(Boolean, default=False)
    raw_extracted_text = Column(String(255), nullable=True)
    confidence = Column(Float, default=1.0)
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    call_session = relationship("CallSession", back_populates="symptoms")


class TriageResult(Base):
    __tablename__ = "triage_results"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    call_session_id = Column(String(36), ForeignKey("call_sessions.id"), nullable=False)
    level = Column(Integer, nullable=False, index=True)  # 1 (Home Care), 2 (PHC), 3 (Hospital), 4 (Emergency)
    category = Column(String(50), nullable=False)  # home_care, phc, hospital, emergency
    rule_id = Column(String(100), nullable=False) # e.g. WHO-IMCI-RED-001, ICMR-FEVER-003
    reason = Column(Text, nullable=False)
    recommended_action = Column(Text, nullable=False)
    voice_guidance_text = Column(Text, nullable=False)
    urgency = Column(String(30), default="routine") # immediate, within_24h, within_48h, routine
    confidence = Column(Float, default=1.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    call_session = relationship("CallSession", back_populates="triage_results")


class FollowUp(Base):
    __tablename__ = "followups"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    call_session_id = Column(String(36), ForeignKey("call_sessions.id"), nullable=False)
    scheduled_for = Column(DateTime, nullable=False, index=True)
    completed_at = Column(DateTime, nullable=True)
    status = Column(String(30), default="scheduled")  # scheduled, due, completed, failed, cancelled
    outcome = Column(String(50), nullable=True)  # recovered, visited_phc, visited_hospital, escalated, no_response
    patient_response_text = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    call_session = relationship("CallSession", back_populates="followup")


class AshaWorker(Base):
    __tablename__ = "asha_workers"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    worker_code = Column(String(30), unique=True, index=True)
    name = Column(String(100), nullable=False)
    phone_number = Column(String(30), nullable=False)
    state = Column(String(100), default="Uttar Pradesh")
    district = Column(String(100), index=True, nullable=True)
    sub_district = Column(String(100), nullable=True)
    village = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)
    assigned_population = Column(Integer, default=1000)
    created_at = Column(DateTime, default=datetime.utcnow)

    alerts = relationship("Alert", back_populates="asha_worker")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    call_session_id = Column(String(36), ForeignKey("call_sessions.id"), nullable=False)
    asha_worker_id = Column(String(36), ForeignKey("asha_workers.id"), nullable=True)
    alert_type = Column(String(50), default="sms") # sms, ivr_escalation, dashboard_flag
    triage_level = Column(Integer, default=2)
    message = Column(Text, nullable=False)
    status = Column(String(30), default="sent") # pending, sent, delivered, acknowledged, resolved, failed
    sms_sid = Column(String(100), nullable=True)
    sent_at = Column(DateTime, default=datetime.utcnow)
    delivered_at = Column(DateTime, nullable=True)
    acknowledged_at = Column(DateTime, nullable=True)

    call_session = relationship("CallSession", back_populates="alerts")
    asha_worker = relationship("AshaWorker", back_populates="alerts")


class AudioMetadata(Base):
    __tablename__ = "audio_metadata"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    call_session_id = Column(String(36), ForeignKey("call_sessions.id"), nullable=False)
    audio_type = Column(String(20), default="inbound")  # inbound, outbound_tts, prompt
    file_path = Column(String(255), nullable=True)
    format = Column(String(20), default="wav")  # wav, mp3, ogg, pcm
    sample_rate_hz = Column(Integer, default=8000)  # Telephony standard 8000Hz
    duration_ms = Column(Integer, default=0)
    size_bytes = Column(Integer, default=0)
    retention_expiry = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    call_session = relationship("CallSession", back_populates="audio_records")


class HealthcareFacility(Base):
    __tablename__ = "healthcare_facilities"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(150), nullable=False)
    facility_type = Column(String(50), nullable=False)  # PHC, CHC, DISTRICT_HOSPITAL, EMERGENCY
    district = Column(String(100), index=True, nullable=True)
    block = Column(String(100), nullable=True)
    address = Column(Text, nullable=False)
    phone_number = Column(String(50), nullable=False)
    emergency_helpline = Column(String(30), default="108")
    verified = Column(Boolean, default=True)
    last_verified_at = Column(DateTime, default=datetime.utcnow)
    services_offered = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    cases = relationship("CareCase", back_populates="facility")


class CareCase(Base):
    __tablename__ = "care_cases"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    case_code = Column(String(30), unique=True, index=True, nullable=False)  # e.g. VD-1042
    patient_id = Column(String(36), ForeignKey("patients.id"), nullable=True)
    call_session_id = Column(String(36), ForeignKey("call_sessions.id"), nullable=True)
    primary_complaint = Column(String(255), nullable=False)
    detected_language = Column(String(20), default="hi")
    language_confidence = Column(Float, default=1.0)
    triage_level = Column(Integer, default=1, index=True)  # 1=Home, 2=PHC, 3=Hospital, 4=Emergency
    triage_category = Column(String(50), default="home_care")
    status = Column(String(50), default="New", index=True)  # New, Assessing, Referral Recommended, ASHA Follow-up, Follow-up Due, Resolved, Escalated
    recommendation_text = Column(Text, nullable=True)
    facility_id = Column(String(36), ForeignKey("healthcare_facilities.id"), nullable=True)
    asha_worker_id = Column(String(36), ForeignKey("asha_workers.id"), nullable=True)
    care_events = Column(JSON, nullable=True)  # list of {time, event, actor, notes, status}
    is_demo = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    patient = relationship("Patient", backref="care_cases")
    call_session = relationship("CallSession", backref="care_case")
    facility = relationship("HealthcareFacility", back_populates="cases")
    asha_worker = relationship("AshaWorker", backref="assigned_cases")


class AdminUser(Base):
    __tablename__ = "admin_users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String(50), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100), default="System Administrator")
    role = Column(String(30), default="admin") # admin, asha_worker, patient
    phone_number = Column(String(30), nullable=True)
    district = Column(String(100), nullable=True)
    asha_worker_id = Column(String(36), ForeignKey("asha_workers.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
