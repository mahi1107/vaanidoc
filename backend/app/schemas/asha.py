from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel

class AshaWorkerSchema(BaseModel):
    id: str
    worker_code: str
    name: str
    phone_number: str
    state: str
    district: str
    sub_district: str
    village: str
    is_active: bool
    assigned_population: int
    created_at: datetime

    class Config:
        from_attributes = True

class AlertSchema(BaseModel):
    id: str
    call_session_id: str
    asha_worker_id: Optional[str] = None
    worker_name: Optional[str] = None
    worker_phone: Optional[str] = None
    alert_type: str
    triage_level: int
    message: str
    status: str
    sent_at: datetime
    acknowledged_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class FollowUpSchema(BaseModel):
    id: str
    call_session_id: str
    scheduled_for: datetime
    completed_at: Optional[datetime] = None
    status: str
    outcome: Optional[str] = None
    patient_response_text: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class FollowUpCompleteRequest(BaseModel):
    outcome: str = "recovered"  # recovered, visited_phc, visited_hospital, escalated, no_response
    patient_response_text: Optional[str] = "अब काफी बेहतर महसूस हो रहा है।"
    notes: Optional[str] = "Patient reports resolution of fever after resting and hydration."
