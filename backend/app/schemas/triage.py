from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel

class SymptomRecordSchema(BaseModel):
    id: str
    symptom_name: str
    hindi_term: Optional[str] = None
    duration_val: Optional[int] = None
    duration_unit: Optional[str] = "days"
    severity: str = "moderate"
    is_negated: bool = False
    is_red_flag: bool = False
    confidence: float = 1.0
    created_at: datetime

    class Config:
        from_attributes = True

class TriageResultSchema(BaseModel):
    id: str
    level: int
    category: str
    rule_id: str
    reason: str
    recommended_action: str
    voice_guidance_text: str
    urgency: str
    confidence: float
    created_at: datetime

    class Config:
        from_attributes = True
