from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Path
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.database.session import get_db
from backend.app.models import AshaWorker, Alert, CallSession, TriageResult, Patient
from backend.app.schemas.asha import AshaWorkerSchema, AlertSchema
from backend.app.services.asha_service import AshaService

router = APIRouter(prefix="/asha", tags=["ASHA Workers"])

@router.get("/workers", response_model=List[AshaWorkerSchema])
def list_workers(
    district: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(AshaWorker)
    if district:
        query = query.filter(AshaWorker.district.ilike(f"%{district}%"))
    return query.all()

@router.get("/workers/{worker_id}")
def get_worker_detail(
    worker_id: str = Path(...),
    exclude_demo: bool = False,
    db: Session = Depends(get_db)
):
    worker = db.query(AshaWorker).filter(AshaWorker.id == worker_id).first()
    if not worker:
        raise HTTPException(status_code=404, detail="ASHA Worker not found")

    # Aggregate worker-specific alert metrics
    alert_q = db.query(Alert).filter(Alert.asha_worker_id == worker.id)
    if exclude_demo:
        alert_q = alert_q.join(Alert.call_session).filter(CallSession.is_demo == False)
    alerts = alert_q.order_by(desc(Alert.sent_at)).all()
    
    total_alerts = len(alerts)
    emergency_alerts = sum(1 for a in alerts if a.triage_level == 4)
    hospital_alerts = sum(1 for a in alerts if a.triage_level == 3)
    phc_alerts = sum(1 for a in alerts if a.triage_level == 2)
    acknowledged_count = sum(1 for a in alerts if a.status == "acknowledged")

    recent_alerts = []
    for a in alerts[:8]:
        recent_alerts.append({
            "id": a.id,
            "call_session_id": a.call_session_id,
            "triage_level": a.triage_level,
            "message": a.message,
            "status": a.status,
            "sent_at": a.sent_at,
            "acknowledged_at": a.acknowledged_at
        })

    return {
        "worker": {
            "id": worker.id,
            "worker_code": worker.worker_code,
            "name": worker.name,
            "phone_number": worker.phone_number,
            "state": worker.state,
            "district": worker.district,
            "sub_district": worker.sub_district,
            "village": worker.village,
            "is_active": worker.is_active,
            "assigned_population": worker.assigned_population,
            "created_at": worker.created_at
        },
        "stats": {
            "total_alerts": total_alerts,
            "emergency_alerts": emergency_alerts,
            "hospital_alerts": hospital_alerts,
            "phc_alerts": phc_alerts,
            "acknowledged_count": acknowledged_count,
            "pending_count": total_alerts - acknowledged_count
        },
        "recent_alerts": recent_alerts
    }

@router.post("/workers/{worker_id}/test-alert")
async def send_test_alert(
    worker_id: str = Path(...),
    db: Session = Depends(get_db)
):
    worker = db.query(AshaWorker).filter(AshaWorker.id == worker_id).first()
    if not worker:
        raise HTTPException(status_code=404, detail="ASHA Worker not found")

    asha_service = AshaService(db)
    alert = await asha_service.trigger_triage_alert(
        call_session_id="TEST-SIM-" + worker.id[:6].upper(),
        triage_level=3,
        symptoms_str="तेज बुखार (High Fever) - Test Simulation",
        triage_category="hospital",
        district=worker.district,
        village=worker.village
    )
    return {"status": "success", "message": f"Test alert dispatched to {worker.name} ({worker.phone_number})", "alert": alert}

@router.get("/alerts", response_model=List[AlertSchema])
def list_alerts(
    district: Optional[str] = None,
    exclude_demo: bool = False,
    db: Session = Depends(get_db)
):
    query = db.query(Alert)
    if exclude_demo:
        query = query.join(Alert.call_session).filter(CallSession.is_demo == False)
    if district:
        if not exclude_demo:
            query = query.join(Alert.call_session)
        query = query.join(CallSession.patient).filter(Patient.district.ilike(f"%{district}%"))
    alerts = query.order_by(desc(Alert.sent_at)).limit(100).all()
    results = []
    for a in alerts:
        results.append(AlertSchema(
            id=a.id,
            call_session_id=a.call_session_id,
            asha_worker_id=a.asha_worker_id,
            worker_name=a.asha_worker.name if a.asha_worker else "Unassigned",
            worker_phone=a.asha_worker.phone_number if a.asha_worker else None,
            alert_type=a.alert_type,
            triage_level=a.triage_level,
            message=a.message,
            status=a.status,
            sent_at=a.sent_at,
            acknowledged_at=a.acknowledged_at
        ))
    return results

@router.post("/alerts/{alert_id}/acknowledge")
def acknowledge_alert(
    alert_id: str = Path(...),
    db: Session = Depends(get_db)
):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.status = "acknowledged"
    from datetime import datetime
    alert.acknowledged_at = datetime.utcnow()
    db.commit()
    return {"status": "success", "alert_id": alert_id, "state": "acknowledged"}
