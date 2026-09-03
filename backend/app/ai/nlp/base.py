from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class ExtractedSymptom(BaseModel):
    name: str  # standard name (e.g. abdominal_pain, skin_rash, burning_urination)
    category: Optional[str] = None # gastrointestinal, dermatology, ent, neurology, urinary, etc.
    location: Optional[str] = None # e.g. "left ear", "arm / hand", "lower abdomen", "head"
    hindi_term: Optional[str] = None
    duration_val: Optional[int] = None
    duration_unit: Optional[str] = "days"
    duration_text: Optional[str] = None # e.g. "since yesterday", "since last night", "this morning", "2 days"
    onset: Optional[str] = "gradual" # sudden, gradual, ongoing
    severity: str = "moderate"  # mild, moderate, severe
    is_negated: bool = False
    is_red_flag: bool = False
    raw_text: Optional[str] = None
    confidence: float = 1.0

class ClinicalExtractionResult(BaseModel):
    symptoms: List[ExtractedSymptom] = Field(default_factory=list)
    patient_facing_summary: Optional[str] = None
    body_locations: List[str] = Field(default_factory=list)
    age_group: Optional[str] = None  # child, adult, elderly
    is_pregnant: bool = False
    raw_transcript: str
    detected_red_flags: List[str] = Field(default_factory=list)
    missing_critical_info: List[str] = Field(default_factory=list) # e.g. ["duration", "exact_location", "red_flags"]
    needs_clarification: bool = False
    clarification_prompt: Optional[str] = None
    extraction_provider: str = "clinical_nlp"

class BaseNLPExtractor(ABC):
    @abstractmethod
    async def extract(self, transcript: str, language: str = "hi", previous_context: Optional[Dict[str, Any]] = None) -> ClinicalExtractionResult:
        """Extract structured symptoms, severity, duration, body locations, and patient context."""
        pass
