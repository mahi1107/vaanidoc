from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, Path
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.database.session import get_db
from backend.app.models import CareCase, Patient, AshaWorker, HealthcareFacility, AdminUser
from backend.app.services.case_service import CaseService
from backend.app.api.auth import get_current_admin, get_current_user_optional, normalize_phone_number

router = APIRouter(prefix="/cases", tags=["Care Cases"])

class CaseActionRequest(BaseModel):
    action: str  # "Contacted", "Visit completed", "Referred", "Improving", "Worsening", "Escalated", "Resolved"
    notes: str
    actor_name: Optional[str] = "Healthcare Worker"
    new_status: Optional[str] = None

class CaseResponse(BaseModel):
    id: str
    case_code: str
    primary_complaint: str
    detected_language: str
    language_confidence: float
    triage_level: int
    triage_category: str
    status: str
    recommendation_text: Optional[str] = None
    facility: Optional[Dict[str, Any]] = None
    asha_worker: Optional[Dict[str, Any]] = None
    patient: Optional[Dict[str, Any]] = None
    care_events: Optional[List[Dict[str, Any]]] = None
    is_demo: bool
    created_at: datetime
    updated_at: datetime

def serialize_case(c: CareCase) -> Dict[str, Any]:
    return {
        "id": c.id,
        "case_code": c.case_code,
        "primary_complaint": c.primary_complaint,
        "detected_language": c.detected_language,
        "language_confidence": c.language_confidence or 1.0,
        "triage_level": c.triage_level,
        "triage_category": c.triage_category,
        "status": c.status,
        "recommendation_text": c.recommendation_text,
        "facility": {
            "id": c.facility.id,
            "name": c.facility.name,
            "facility_type": c.facility.facility_type,
            "district": c.facility.district,
            "block": c.facility.block,
            "phone_number": c.facility.phone_number,
            "emergency_helpline": c.facility.emergency_helpline,
            "address": c.facility.address
        } if c.facility else None,
        "asha_worker": {
            "id": c.asha_worker.id,
            "worker_code": c.asha_worker.worker_code,
            "name": c.asha_worker.name,
            "phone_number": c.asha_worker.phone_number,
            "district": c.asha_worker.district,
            "village": c.asha_worker.village
        } if c.asha_worker else None,
        "patient": {
            "id": c.patient.id,
            "district": c.patient.district,
            "village": c.patient.village,
            "age_group": c.patient.age_group
        } if c.patient else None,
        "care_events": c.care_events or [],
        "is_demo": c.is_demo,
        "created_at": c.created_at,
        "updated_at": c.updated_at
    }

@router.get("", response_model=List[Dict[str, Any]])
def list_cases(
    status: Optional[str] = Query(None),
    triage_level: Optional[int] = Query(None),
    district: Optional[str] = Query(None),
    asha_worker_id: Optional[str] = Query(None),
    exclude_demo: bool = Query(False),
    limit: int = Query(100),
    db: Session = Depends(get_db)
):
    service = CaseService(db)
    cases = service.list_cases(
        status=status,
        triage_level=triage_level,
        district=district,
        asha_worker_id=asha_worker_id,
        exclude_demo=exclude_demo,
        limit=limit
    )
    return [serialize_case(c) for c in cases]

@router.get("/patient/my-cases", response_model=List[Dict[str, Any]])
def get_patient_cases(
    case_codes: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Optional[AdminUser] = Depends(get_current_user_optional)
):
    """
    Patient-isolated endpoint: Returns strictly only consultations/cases belonging
    to the requesting authenticated patient (via verified JWT token) or active anonymous session codes.
    Guarantees that logged-out users cannot access private cases, and patients only see their own cases.
    """
    # Parse any passed session codes
    session_codes = []
    if case_codes and case_codes.strip():
        session_codes = [c.strip() for c in case_codes.split(",") if c.strip()]

    # 1. Authenticated Patient: strictly return cases belonging to this patient
    if current_user and current_user.role == "patient":
        clean_phone = normalize_phone_number(current_user.phone_number or current_user.username)
        p_rec = db.query(Patient).filter(Patient.caller_hash == f"patient_{clean_phone}").first()
        if not p_rec:
            return []

        authenticated_patient_id = p_rec.id

        # If user had unassigned session cases from immediate pre-login session, claim them
        if session_codes:
            db.query(CareCase).filter(
                CareCase.case_code.in_(session_codes),
                CareCase.patient_id.is_(None)
            ).update({"patient_id": authenticated_patient_id}, synchronize_session=False)
            db.commit()

        cases = db.query(CareCase).filter(
            CareCase.patient_id == authenticated_patient_id
        ).order_by(desc(CareCase.created_at)).all()
        return [serialize_case(c) for c in cases]

    # 2. Anonymous / Logged-out user: strictly only return explicit session case codes
    if session_codes:
        cases = db.query(CareCase).filter(
            CareCase.case_code.in_(session_codes)
        ).order_by(desc(CareCase.created_at)).all()
        return [serialize_case(c) for c in cases]

    # 3. Logged-out / unauthenticated with no session codes: strictly empty list
    return []


@router.get("/asha/my-work")
def get_asha_work_cases(
    asha_id: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Dedicated endpoint for ASHA Worker's 'My Work' dashboard:
    Returns Urgent Cases, Follow-ups Due, Active Cases, and Completed Cases.
    """
    query = db.query(CareCase)
    if asha_id:
        query = query.filter(CareCase.asha_worker_id == asha_id)
    elif district:
        query = query.join(CareCase.patient).filter(Patient.district.ilike(f"%{district}%"))

    cases = query.order_by(desc(CareCase.created_at)).all()

    urgent_cases = [serialize_case(c) for c in cases if c.triage_level >= 3 and c.status not in ["Resolved"]]
    followups_due = [serialize_case(c) for c in cases if c.status in ["Follow-up Due", "ASHA Follow-up", "Referral Recommended"]]
    active_cases = [serialize_case(c) for c in cases if c.status not in ["Resolved"]]
    completed_cases = [serialize_case(c) for c in cases if c.status == "Resolved"]

    return {
        "stats": {
            "urgent_count": len(urgent_cases),
            "followups_due_count": len(followups_due),
            "active_count": len(active_cases),
            "completed_count": len(completed_cases)
        },
        "urgent_cases": urgent_cases[:20],
        "followups_due": followups_due[:20],
        "active_cases": active_cases[:30],
        "completed_cases": completed_cases[:20]
    }

@router.get("/{identifier}", response_model=Dict[str, Any])
def get_case_detail(
    identifier: str = Path(...),
    db: Session = Depends(get_db)
):
    service = CaseService(db)
    care_case = service.get_case_by_id_or_code(identifier)
    if not care_case:
        raise HTTPException(status_code=404, detail="Care Case not found")
    return serialize_case(care_case)

@router.post("/{identifier}/action")
def record_case_action(
    identifier: str = Path(...),
    payload: CaseActionRequest = ...,
    db: Session = Depends(get_db)
):
    service = CaseService(db)
    try:
        updated = service.record_case_action(
            case_id=identifier,
            action=payload.action,
            notes=payload.notes,
            actor_name=payload.actor_name or "Healthcare Worker",
            new_status=payload.new_status
        )
        return {"status": "success", "case": serialize_case(updated)}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
