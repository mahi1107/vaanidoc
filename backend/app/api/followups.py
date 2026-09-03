from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Path, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.database.session import get_db
from backend.app.models import FollowUp, CallSession, Patient
from backend.app.schemas.asha import FollowUpSchema, FollowUpCompleteRequest
from backend.app.services.followup_service import FollowUpService

router = APIRouter(prefix="/followups", tags=["Follow-ups"])

@router.get("", response_model=List[FollowUpSchema])
def list_followups(
    status: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    exclude_demo: bool = Query(False),
    db: Session = Depends(get_db)
):
    query = db.query(FollowUp)
    if exclude_demo:
        query = query.join(FollowUp.call_session).filter(CallSession.is_demo == False)
    if district:
        if not exclude_demo:
            query = query.join(FollowUp.call_session)
        query = query.join(CallSession.patient).filter(Patient.district.ilike(f"%{district}%"))
    if status:
        query = query.filter(FollowUp.status == status)
    return query.order_by(desc(FollowUp.created_at)).limit(100).all()

@router.post("/{followup_id}/complete", response_model=FollowUpSchema)
def complete_followup(
    payload: FollowUpCompleteRequest,
    followup_id: str = Path(...),
    db: Session = Depends(get_db)
):
    service = FollowUpService(db)
    res = service.complete_followup(
        followup_id=followup_id,
        outcome=payload.outcome,
        patient_response_text=payload.patient_response_text,
        notes=payload.notes
    )
    if not res:
        raise HTTPException(status_code=404, detail="Follow-up record not found")
    return res

@router.post("/{followup_id}/reschedule", response_model=FollowUpSchema)
def reschedule_followup(
    followup_id: str = Path(...),
    hours: int = Query(24),
    db: Session = Depends(get_db)
):
    followup = db.query(FollowUp).filter(FollowUp.id == followup_id).first()
    if not followup:
        raise HTTPException(status_code=404, detail="Follow-up record not found")
    
    followup.scheduled_for = datetime.utcnow() + timedelta(hours=hours)
    followup.status = "pending"
    db.commit()
    db.refresh(followup)
    return followup

@router.post("/{followup_id}/call-now")
def trigger_call_now(
    followup_id: str = Path(...),
    db: Session = Depends(get_db)
):
    followup = db.query(FollowUp).filter(FollowUp.id == followup_id).first()
    if not followup:
        raise HTTPException(status_code=404, detail="Follow-up record not found")
    
    # Simulate automated IVR follow-up check call
    return {
        "status": "success",
        "message": f"Automated follow-up voice call initiated for session {followup.call_session_id}",
        "ivr_dialogue": {
            "prompt_hi": "नमस्ते, यह वाणी-डॉक से 24 घंटे बाद का फॉलो-अप चेक है। क्या आपकी तबियत में अब कुछ सुधार है?",
            "expected_input": "हाँ (Yes) / नहीं (No)"
        }
    }
