from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import desc

from datetime import datetime
from backend.app.database.session import get_db
from backend.app.models import CallSession, Patient, Transcript, SymptomRecord, TriageResult, CareCase, AdminUser
from backend.app.schemas.call import (
    CallSessionSummary,
    CallSessionDetail,
    SimulateCallRequest,
    SimulateCallResponse,
    CallSessionCreate
)
from backend.app.services.call_orchestrator import CallOrchestrator
from backend.app.api.auth import get_current_user_optional, normalize_phone_number
from backend.app.utils.logger import logger

router = APIRouter(prefix="/calls", tags=["Calls & Voice Consultations"])

@router.post("/consultation", response_model=SimulateCallResponse)
async def start_web_consultation(
    payload: SimulateCallRequest,
    db: Session = Depends(get_db),
    current_user: Optional[AdminUser] = Depends(get_current_user_optional)
):
    """
    Web Voice Consultation: Initiates session, runs ASR, auto language detection (Hinglish/Hindi/English),
    NLP symptom extraction, WHO/ICMR triage, TTS audio generation, CareCase creation & facility attachment.
    """
    orchestrator = CallOrchestrator(db)
    
    # Associate with authenticated patient if available
    caller_phone = payload.caller_phone or (current_user.phone_number if current_user else "+91-98765-43210")
    patient_id = None
    if current_user and current_user.role == "patient":
        # Find patient record with strict matching
        clean_p = normalize_phone_number(current_user.phone_number or current_user.username)
        p_rec = db.query(Patient).filter(Patient.caller_hash == f"patient_{clean_p}").first()
        if not p_rec:
            p_rec = Patient(
                caller_hash=f"patient_{clean_p}",
                district=payload.district or current_user.district or "Varanasi",
                village=payload.village or "Local Area",
                created_at=datetime.utcnow()
            )
            db.add(p_rec)
            db.commit()
            db.refresh(p_rec)
        patient_id = p_rec.id

    call = await orchestrator.initialize_call(
        caller_phone=caller_phone,
        provider="web",
        language=payload.language or "en",
        district=payload.district or (current_user.district if current_user and current_user.district else None),
        village=payload.village or "Local Area",
        is_demo=payload.is_demo,
        patient_id=patient_id
    )

    res = await orchestrator.process_speech_input(
        call_id=call.id,
        speech_text=payload.patient_speech,
        emulate_low_asr_confidence=payload.emulate_low_asr_confidence,
        age_group=payload.age_group,
        is_pregnant=payload.is_pregnant
    )

    return res

@router.post("/process-audio", response_model=SimulateCallResponse)
async def process_browser_audio(
    file: UploadFile = File(...),
    transcript: Optional[str] = Form(None),
    district: Optional[str] = Form(None),
    village: Optional[str] = Form("Local Area"),
    age_group: Optional[str] = Form("adult"),
    is_pregnant: Optional[bool] = Form(False),
    is_demo: Optional[bool] = Form(False),
    patient_id: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: Optional[AdminUser] = Depends(get_current_user_optional)
):
    """
    Primary Web Endpoint: Accepts real browser microphone audio (PCM/WAV/WebM) and optional live transcript,
    detects language, extracts symptoms, triages, synthesizes voice response in the patient's language,
    creates persistent CareCase VD-XXXX, and attaches recommended local facility.
    """
    orchestrator = CallOrchestrator(db)
    audio_bytes = await file.read()

    # Determine authenticated patient ID
    resolved_patient_id = patient_id
    caller_phone = "+91-98765-43210"
    if current_user and current_user.role == "patient":
        clean_p = normalize_phone_number(current_user.phone_number or current_user.username)
        caller_phone = clean_p
        p_rec = db.query(Patient).filter(Patient.caller_hash == f"patient_{clean_p}").first()
        if not p_rec:
            p_rec = Patient(
                caller_hash=f"patient_{clean_p}",
                district=district or current_user.district or "Varanasi",
                village=village or "Local Area",
                created_at=datetime.utcnow()
            )
            db.add(p_rec)
            db.commit()
            db.refresh(p_rec)
        resolved_patient_id = p_rec.id

    call = await orchestrator.initialize_call(
        caller_phone=caller_phone,
        provider="web",
        language="en",
        district=district or (current_user.district if current_user and current_user.district else None),
        village=village or "Local Area",
        is_demo=is_demo or False,
        patient_id=resolved_patient_id
    )

    # Use live transcript from client speech recognition if provided, otherwise transcribe audio
    speech_text_to_process = transcript.strip() if transcript and transcript.strip() else None

    res = await orchestrator.process_speech_input(
        call_id=call.id,
        speech_text=speech_text_to_process,
        audio_bytes=audio_bytes if not speech_text_to_process else None,
        age_group=age_group,
        is_pregnant=is_pregnant
    )
    return res


@router.post("/simulate", response_model=SimulateCallResponse)
async def simulate_call(
    payload: SimulateCallRequest,
    db: Session = Depends(get_db)
):
    """
    Developer Call Simulator: runs complete patient health call from speech to ASR -> NLP -> Triage -> TTS -> ASHA alert -> Followup.
    Marked with is_demo=True.
    """
    orchestrator = CallOrchestrator(db)
    
    call = await orchestrator.initialize_call(
        caller_phone=payload.caller_phone or "+91-98765-43210",
        provider="mock",
        language=payload.language or "hi",
        district=payload.district or "Varanasi",
        village=payload.village or "Rustampur",
        is_demo=True
    )

    res = await orchestrator.process_speech_input(
        call_id=call.id,
        speech_text=payload.patient_speech,
        emulate_low_asr_confidence=payload.emulate_low_asr_confidence,
        age_group=payload.age_group,
        is_pregnant=payload.is_pregnant
    )

    return res

@router.post("/incoming", response_model=CallSessionSummary)
async def incoming_call(
    payload: CallSessionCreate,
    db: Session = Depends(get_db)
):
    orchestrator = CallOrchestrator(db)
    call = await orchestrator.initialize_call(
        caller_phone=payload.caller_phone,
        provider=payload.provider,
        language=payload.language,
        district=payload.district or "Varanasi",
        village=payload.village or "Rustampur",
        is_demo=payload.is_demo
    )
    
    return CallSessionSummary(
        id=call.id,
        provider=call.provider,
        caller_phone=call.caller_phone,
        language=call.language,
        state=call.state,
        status=call.status,
        duration_seconds=call.duration_seconds,
        started_at=call.started_at,
        district=payload.district,
        is_demo=call.is_demo
    )

@router.post("/{call_id}/audio", response_model=SimulateCallResponse)
async def upload_call_audio(
    call_id: str,
    file: UploadFile = File(...),
    age_group: Optional[str] = Form("adult"),
    is_pregnant: Optional[bool] = Form(False),
    db: Session = Depends(get_db)
):
    orchestrator = CallOrchestrator(db)
    audio_bytes = await file.read()
    
    res = await orchestrator.process_speech_input(
        call_id=call_id,
        audio_bytes=audio_bytes,
        age_group=age_group,
        is_pregnant=is_pregnant
    )
    return res

@router.get("/active", response_model=List[CallSessionDetail])
def get_active_calls(
    district: Optional[str] = Query(None),
    exclude_demo: bool = Query(False),
    db: Session = Depends(get_db)
):
    query = db.query(CallSession).filter(CallSession.state != "COMPLETED")
    if exclude_demo:
        query = query.filter(CallSession.is_demo == False)
    if district:
        query = query.join(CallSession.patient).filter(Patient.district.ilike(f"%{district}%"))
    
    active_calls = query.order_by(desc(CallSession.started_at)).limit(20).all()
    results = []
    for call in active_calls:
        results.append(CallSessionDetail(
            id=call.id,
            patient_id=call.patient_id,
            provider=call.provider,
            provider_call_id=call.provider_call_id,
            caller_phone=call.caller_phone,
            language=call.language,
            state=call.state,
            status=call.status,
            duration_seconds=call.duration_seconds,
            started_at=call.started_at,
            ended_at=call.ended_at,
            district=call.patient.district if call.patient else None,
            village=call.patient.village if call.patient else None,
            is_demo=call.is_demo if hasattr(call, "is_demo") else False,
            timeline_events=call.timeline_events,
            transcripts=call.transcripts,
            symptoms=call.symptoms,
            triage_results=call.triage_results,
            audio_url=call.audio_path
        ))
    return results

@router.get("", response_model=List[CallSessionSummary])
def list_calls(
    skip: int = 0,
    limit: int = 50,
    provider: Optional[str] = None,
    language: Optional[str] = None,
    status: Optional[str] = None,
    district: Optional[str] = None,
    triage_level: Optional[int] = None,
    exclude_demo: bool = Query(False),
    db: Session = Depends(get_db)
):
    query = db.query(CallSession)
    if exclude_demo:
        query = query.filter(CallSession.is_demo == False)
    if district:
        query = query.join(CallSession.patient).filter(Patient.district.ilike(f"%{district}%"))
    if provider:
        query = query.filter(CallSession.provider == provider)
    if language:
        query = query.filter(CallSession.language == language)
    if status:
        query = query.filter(CallSession.status == status)

    calls = query.order_by(desc(CallSession.started_at)).offset(skip).limit(limit).all()
    
    summaries = []
    for c in calls:
        t_res = c.triage_results[0] if c.triage_results else None
        top_sym = c.symptoms[0].hindi_term if c.symptoms and c.symptoms[0].hindi_term else (c.symptoms[0].symptom_name if c.symptoms else None)
        
        if triage_level is not None and (not t_res or t_res.level != triage_level):
            continue

        summaries.append(CallSessionSummary(
            id=c.id,
            provider=c.provider,
            caller_phone=c.caller_phone,
            language=c.language,
            state=c.state,
            status=c.status,
            duration_seconds=c.duration_seconds,
            started_at=c.started_at,
            ended_at=c.ended_at,
            triage_level=t_res.level if t_res else None,
            triage_category=t_res.category if t_res else None,
            top_symptom=top_sym,
            district=c.patient.district if c.patient else None,
            is_demo=c.is_demo if hasattr(c, "is_demo") else False
        ))
    return summaries

@router.get("/{call_id}", response_model=CallSessionDetail)
def get_call_detail(
    call_id: str,
    db: Session = Depends(get_db)
):
    call = db.query(CallSession).filter(CallSession.id == call_id).first()
    if not call:
        raise HTTPException(status_code=404, detail="Call session not found")
        
    return CallSessionDetail(
        id=call.id,
        patient_id=call.patient_id,
        provider=call.provider,
        provider_call_id=call.provider_call_id,
        caller_phone=call.caller_phone,
        language=call.language,
        state=call.state,
        status=call.status,
        duration_seconds=call.duration_seconds,
        started_at=call.started_at,
        ended_at=call.ended_at,
        district=call.patient.district if call.patient else None,
        village=call.patient.village if call.patient else None,
        is_demo=call.is_demo if hasattr(call, "is_demo") else False,
        timeline_events=call.timeline_events,
        transcripts=call.transcripts,
        symptoms=call.symptoms,
        triage_results=call.triage_results,
        audio_url=call.audio_path
    )
