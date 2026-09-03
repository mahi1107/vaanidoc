from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class OverviewMetrics(BaseModel):
    total_calls: int
    calls_today: int
    active_cases: int
    emergency_cases: int
    hospital_referrals: int
    phc_referrals: int
    home_care_cases: int
    followups_pending: int
    asha_alerts_sent: int
    unique_patients: Optional[int] = 0

class TriageDistributionItem(BaseModel):
    level: int
    name: str
    category: str
    count: int
    percentage: float
    color: str

class SymptomTrendItem(BaseModel):
    symptom: str
    hindi_name: str
    count: int
    percentage: float

class LanguageDistributionItem(BaseModel):
    code: str
    name: str
    native_name: str
    count: int
    percentage: float

class CallsTimelineItem(BaseModel):
    date: str
    total: int
    emergency: int
    hospital: int
    phc: int
    home_care: int

class DistrictMetricItem(BaseModel):
    district: str
    total_calls: int
    emergency_cases: int
    phc_hospital_cases: int
    top_symptom: str
    active_asha_count: int
