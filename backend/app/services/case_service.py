import random
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import zoneinfo
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.models import CareCase, Patient, CallSession, AshaWorker, HealthcareFacility
from backend.app.utils.logger import logger

def get_ist_time_str(dt: Optional[datetime] = None) -> str:
    if dt is None:
        dt = datetime.now(timezone.utc)
    try:
        ist_tz = zoneinfo.ZoneInfo("Asia/Kolkata")
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        ist_dt = dt.astimezone(ist_tz)
        return ist_dt.strftime("%d %b %Y, %I:%M %p")
    except Exception:
        return dt.strftime("%Y-%m-%d %H:%M")

class CaseService:
    def __init__(self, db: Session):
        self.db = db

    def generate_case_code(self) -> str:
        """Generates unique human-readable case reference e.g. VD-1042."""
        count = self.db.query(CareCase).count()
        code = f"VD-{1000 + count + 1}"
        # Guarantee uniqueness
        while self.db.query(CareCase).filter(CareCase.case_code == code).first():
            code = f"VD-{random.randint(1000, 9999)}"
        return code

    def create_case_from_consultation(
        self,
        patient_id: Optional[str],
        call_session_id: str,
        primary_complaint: str,
        detected_language: str,
        language_confidence: float,
        triage_level: int,
        triage_category: str,
        recommendation_text: str,
        facility_id: Optional[str] = None,
        asha_worker_id: Optional[str] = None,
        is_demo: bool = False
    ) -> CareCase:
        case_code = self.generate_case_code()
        
        # Initial status based on triage
        if triage_level == 4:
            initial_status = "Escalated"
        elif triage_level == 3:
            initial_status = "Referral Recommended"
        elif triage_level == 2:
            initial_status = "ASHA Follow-up"
        else:
            initial_status = "Assessing"

        now = datetime.utcnow()
        care_events = [
            {
                "time": get_ist_time_str(now),
                "timestamp_utc": now.isoformat() + "Z",
                "event": "Voice Consultation Completed",
                "actor": "VaaniDoc AI Triage",
                "notes": f"Detected {detected_language.upper()} speech. Evaluated Level {triage_level} ({triage_category.upper()}).",
                "status": initial_status
            }
        ]

        if facility_id:
            fac = self.db.query(HealthcareFacility).filter(HealthcareFacility.id == facility_id).first()
            if fac:
                care_events.append({
                    "time": get_ist_time_str(now),
                    "timestamp_utc": now.isoformat() + "Z",
                    "event": "Healthcare Facility Navigation Attached",
                    "actor": "Facility Directory",
                    "notes": f"Recommended: {fac.name} ({fac.facility_type}) in {fac.district}",
                    "status": initial_status
                })

        if asha_worker_id:
            asha = self.db.query(AshaWorker).filter(AshaWorker.id == asha_worker_id).first()
            if asha:
                care_events.append({
                    "time": get_ist_time_str(now),
                    "timestamp_utc": now.isoformat() + "Z",
                    "event": "ASHA Community Worker Assigned",
                    "actor": "Care Coordinator",
                    "notes": f"Assigned to {asha.name} ({asha.worker_code}, {asha.phone_number})",
                    "status": initial_status
                })

        care_case = CareCase(
            case_code=case_code,
            patient_id=patient_id,
            call_session_id=call_session_id,
            primary_complaint=primary_complaint,
            detected_language=detected_language,
            language_confidence=language_confidence,
            triage_level=triage_level,
            triage_category=triage_category,
            status=initial_status,
            recommendation_text=recommendation_text,
            facility_id=facility_id,
            asha_worker_id=asha_worker_id,
            care_events=care_events,
            is_demo=is_demo,
            created_at=now,
            updated_at=now
        )
        self.db.add(care_case)
        self.db.commit()
        self.db.refresh(care_case)
        logger.info(f"[CaseService] Created CareCase {care_case.case_code} (Status: {care_case.status})")
        return care_case

    def list_cases(
        self,
        status: Optional[str] = None,
        triage_level: Optional[int] = None,
        district: Optional[str] = None,
        asha_worker_id: Optional[str] = None,
        exclude_demo: bool = False,
        limit: int = 50
    ) -> List[CareCase]:
        query = self.db.query(CareCase)
        if exclude_demo:
            query = query.filter(CareCase.is_demo == False)
        if status and status != "all":
            query = query.filter(CareCase.status == status)
        if triage_level:
            query = query.filter(CareCase.triage_level == triage_level)
        if asha_worker_id:
            query = query.filter(CareCase.asha_worker_id == asha_worker_id)
        if district:
            query = query.join(CareCase.patient).filter(Patient.district.ilike(f"%{district}%"))

        return query.order_by(desc(CareCase.created_at)).limit(limit).all()

    def get_case_by_id_or_code(self, identifier: str) -> Optional[CareCase]:
        return self.db.query(CareCase).filter(
            (CareCase.id == identifier) | (CareCase.case_code == identifier)
        ).first()

    def get_patient_cases(self, patient_id: str) -> List[CareCase]:
        return self.db.query(CareCase).filter(
            CareCase.patient_id == patient_id
        ).order_by(desc(CareCase.created_at)).all()

    def record_case_action(
        self,
        case_id: str,
        action: str, # "Contacted", "Visit completed", "Referred", "Improving", "Worsening", "Escalated", "Resolved"
        notes: str,
        actor_name: str = "ASHA Worker",
        new_status: Optional[str] = None
    ) -> CareCase:
        care_case = self.get_case_by_id_or_code(case_id)
        if not care_case:
            raise ValueError(f"Case {case_id} not found")

        now = datetime.utcnow()
        events = list(care_case.care_events or [])

        # Infer status if not provided
        if not new_status:
            if action in ["Resolved", "Improving"]:
                new_status = "Resolved"
            elif action in ["Escalated", "Worsening"]:
                new_status = "Escalated"
            elif action == "Referred":
                new_status = "Referral Recommended"
            elif action in ["Contacted", "Visit completed"]:
                new_status = "Follow-up Due"
            else:
                new_status = care_case.status

        events.append({
            "time": get_ist_time_str(now),
            "timestamp_utc": now.isoformat() + "Z",
            "event": f"Action Recorded: {action}",
            "actor": actor_name,
            "notes": notes,
            "status": new_status
        })

        care_case.status = new_status
        care_case.care_events = events
        care_case.updated_at = now
        self.db.commit()
        self.db.refresh(care_case)
        logger.info(f"[CaseService] Case {care_case.case_code} updated: Action '{action}' -> Status '{new_status}'")
        return care_case
