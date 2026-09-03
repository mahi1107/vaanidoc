from datetime import datetime, timedelta
from typing import Optional, List
from sqlalchemy.orm import Session
from backend.app.models import FollowUp, CallSession
from backend.app.utils.logger import logger

class FollowUpService:
    def __init__(self, db: Session):
        self.db = db

    def schedule_24h_followup(self, call_session_id: str) -> FollowUp:
        scheduled_time = datetime.utcnow() + timedelta(hours=24)
        
        # Check if already exists
        existing = self.db.query(FollowUp).filter(FollowUp.call_session_id == call_session_id).first()
        if existing:
            return existing

        followup = FollowUp(
            call_session_id=call_session_id,
            scheduled_for=scheduled_time,
            status="pending",
            outcome=None,
            created_at=datetime.utcnow()
        )
        self.db.add(followup)
        self.db.commit()
        self.db.refresh(followup)
        logger.info(f"[FollowUpService] Scheduled 24h follow-up for call {call_session_id} at {scheduled_time}")
        return followup

    def complete_followup(
        self,
        followup_id: str,
        outcome: str,
        patient_response_text: Optional[str] = None,
        notes: Optional[str] = None
    ) -> Optional[FollowUp]:
        followup = self.db.query(FollowUp).filter(FollowUp.id == followup_id).first()
        if not followup:
            return None

        followup.status = "completed"
        followup.outcome = outcome
        followup.patient_response_text = patient_response_text
        followup.notes = notes
        followup.completed_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(followup)
        logger.info(f"[FollowUpService] Completed follow-up {followup_id} with outcome={outcome}")
        return followup
