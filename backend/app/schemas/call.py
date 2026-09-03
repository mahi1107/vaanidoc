from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
from backend.app.schemas.triage import SymptomRecordSchema, TriageResultSchema

class TranscriptSchema(BaseModel):
    id: str
    turn_index: int
    speaker: str
    transcript: str
    confidence: float
    language: str
    created_at: datetime

    class Config:
        from_attributes = True

class CallSessionCreate(BaseModel):
    caller_phone: Optional[str] = "+91-98765-43210"
    language: str = "hi"
    district: Optional[str] = None
    sub_district: Optional[str] = None
    village: Optional[str] = None
    provider: str = "web"
    is_demo: bool = False

class SimulateCallRequest(BaseModel):
    patient_speech: str = "मुझे तीन दिन से बहुत तेज बुखार है और सिर में दर्द हो रहा है।"
    language: str = "hi"
    caller_phone: Optional[str] = "+91-98765-43210"
    district: Optional[str] = None
    village: Optional[str] = None
    age_group: Optional[str] = "adult" # child, adult, elderly
    is_pregnant: bool = False
    emulate_low_asr_confidence: bool = False
    is_demo: bool = False

class CallSessionSummary(BaseModel):
    id: str
    provider: str
    caller_phone: Optional[str] = None
    language: str
    state: str
    status: str
    duration_seconds: int
    started_at: datetime
    ended_at: Optional[datetime] = None
    triage_level: Optional[int] = None
    triage_category: Optional[str] = None
    top_symptom: Optional[str] = None
    district: Optional[str] = None
    is_demo: bool = False

    class Config:
        from_attributes = True

class CallSessionDetail(BaseModel):
    id: str
    patient_id: Optional[str] = None
    provider: str
    provider_call_id: Optional[str] = None
    caller_phone: Optional[str] = None
    language: str
    state: str
    status: str
    duration_seconds: int
    started_at: datetime
    ended_at: Optional[datetime] = None
    district: Optional[str] = None
    village: Optional[str] = None
    is_demo: bool = False
    timeline_events: Optional[List[Dict[str, Any]]] = None
    transcripts: List[TranscriptSchema] = Field(default_factory=list)
    symptoms: List[SymptomRecordSchema] = Field(default_factory=list)
    triage_results: List[TriageResultSchema] = Field(default_factory=list)
    audio_url: Optional[str] = None

    class Config:
        from_attributes = True

class SimulateCallResponse(BaseModel):
    call_id: str
    status: str = "completed"
    case_code: Optional[str] = None
    case_id: Optional[str] = None
    transcript: str
    detected_language: Optional[str] = "hi"
    language_confidence: Optional[float] = 0.95
    language_display: Optional[str] = "Hindi"
    asr_confidence: float
    extracted_symptoms: List[Dict[str, Any]]
    triage_decision: Dict[str, Any]
    voice_response: Optional[str] = None
    voice_response_hi: Optional[str] = None
    audio_data_base64: Optional[str] = None
    recommended_facility: Optional[Dict[str, Any]] = None
    care_case: Optional[Dict[str, Any]] = None
    asha_alert_sent: bool
    asha_alert_message: Optional[str] = None
    followup_scheduled: bool
    timeline_events: Optional[List[Dict[str, Any]]] = None
