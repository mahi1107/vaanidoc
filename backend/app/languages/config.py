from typing import Dict, Optional, List
from pydantic import BaseModel

class LanguagePrompts(BaseModel):
    greeting: str
    ask_symptoms: str
    clarify_repeat: str
    clarify_duration: str
    clarify_severity: str
    clarify_age: str
    emergency_warning: str
    triage_home_care: str
    triage_phc: str
    triage_hospital: str
    triage_emergency: str
    closing: str
    followup_greeting: str

class LanguageConfig(BaseModel):
    code: str
    name_english: str
    name_native: str
    script: str
    is_active: bool = False
    asr_model_name: str
    tts_model_name: str
    nlp_model_name: str
    prompts: LanguagePrompts
    sample_phrases: List[str] = []
