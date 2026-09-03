from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.database.session import get_db, Base, engine
from backend.app.models import CallSession, Patient, Transcript, SymptomRecord, TriageResult, Alert, FollowUp, AshaWorker
from backend.app.services.asha_service import AshaService
from backend.app.services.followup_service import FollowUpService
from backend.app.utils.logger import logger

router = APIRouter(prefix="/demo", tags=["Demo Control Center"])

@router.post("/reset")
def reset_demo_data(db: Session = Depends(get_db)):
    """
    Clears current simulation sessions and restores clean realistic demo seed state.
    """
    logger.info("[DemoControl] Resetting demo database to fresh seed state...")
    try:
        # Delete dependent tables
        db.query(Alert).delete()
        db.query(FollowUp).delete()
        db.query(TriageResult).delete()
        db.query(SymptomRecord).delete()
        db.query(Transcript).delete()
        db.query(CallSession).delete()
        db.query(Patient).delete()
        db.query(AshaWorker).delete()
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"[DemoControl] Error clearing tables: {e}")

    # Re-seed realistic cases
    from scripts.seed_data import seed_database
    seed_database(35)
    return {"status": "success", "message": "Demo data reset successfully with 35 realistic health cases across 6 districts."}

@router.post("/sample-alert")
async def generate_sample_alert(db: Session = Depends(get_db)):
    """
    Generates a sample emergency / hospital ASHA worker alert.
    """
    latest_call = db.query(CallSession).first()
    call_id = latest_call.id if latest_call else "DEMO-CALL-01"
    
    asha_service = AshaService(db)
    alert = await asha_service.trigger_triage_alert(
        call_session_id=call_id,
        triage_level=3,
        symptoms_str="तेज बुखार (Fever), सिर दर्द (Headache)",
        triage_category="hospital",
        district="Varanasi",
        village="Rustampur"
    )
    return {"status": "success", "alert": alert}

@router.post("/sample-followup")
def generate_sample_followup(db: Session = Depends(get_db)):
    """
    Generates a sample 24-hour follow-up check.
    """
    latest_call = db.query(CallSession).first()
    call_id = latest_call.id if latest_call else "DEMO-CALL-01"
    
    followup_service = FollowUpService(db)
    followup = followup_service.schedule_24h_followup(call_id)
    return {"status": "success", "followup": followup}
