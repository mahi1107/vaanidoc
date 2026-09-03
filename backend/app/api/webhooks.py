from typing import Optional, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Request, Depends, Response, Query
from sqlalchemy.orm import Session
import httpx

from backend.app.database.session import get_db
from backend.app.models import CallSession, AudioMetadata
from backend.app.ivr import get_ivr_provider, IVRCallEvent
from backend.app.telephony.audio import get_audio_capture_service
from backend.app.services.call_orchestrator import CallOrchestrator
from backend.app.utils.logger import logger

router = APIRouter(prefix="/webhooks", tags=["Telephony Webhooks"])

# ============================================================================
# TWILIO VOICE WEBHOOKS
# ============================================================================

@router.post("/twilio/incoming")
async def twilio_incoming(request: Request, db: Session = Depends(get_db)):
    """
    Twilio Voice incoming call webhook.
    Invoked when a real patient dials the VaaniDoc virtual phone number.
    """
    form_data = await request.form()
    call_sid = form_data.get("CallSid", "unknown")
    from_number = form_data.get("From", "+91-unknown")
    to_number = form_data.get("To", "+91-unknown")

    logger.info(f"[Twilio Webhook] Incoming real phone call: {call_sid} from {from_number}")

    orchestrator = CallOrchestrator(db)
    call = await orchestrator.initialize_call(
        caller_phone=from_number,
        provider="twilio",
        provider_call_id=call_sid,
        language="hi",
        is_demo=False
    )

    ivr = get_ivr_provider("twilio")
    event = IVRCallEvent(call_sid=call_sid, from_number=from_number, to_number=to_number)
    twiml = ivr.handle_incoming_call(event)

    return Response(content=twiml, media_type="application/xml")


@router.post("/twilio/gather")
async def twilio_gather(request: Request, db: Session = Depends(get_db)):
    """
    Twilio Voice SpeechResult / Recording webhook callback.
    Invoked when the caller finishes speaking their health symptoms.
    """
    form_data = await request.form()
    call_sid = form_data.get("CallSid", "")
    speech_result = form_data.get("SpeechResult", "")
    recording_url = form_data.get("RecordingUrl", None)

    logger.info(f"[Twilio Webhook] Gather SpeechResult for {call_sid}: '{speech_result}', RecordingUrl: {recording_url}")

    call = db.query(CallSession).filter(CallSession.provider_call_id == call_sid).first()
    ivr = get_ivr_provider("twilio")
    
    if not call:
        return Response(content='<Response><Say language="hi-IN">कॉल सत्र समाप्त हो गया है।</Say><Hangup/></Response>', media_type="application/xml")

    audio_bytes = None
    if recording_url:
        audio_service = get_audio_capture_service("twilio")
        captured = await audio_service.capture_from_url(recording_url, call_sid=call_sid)
        audio_bytes = captured.audio_bytes

        # Persist AudioMetadata
        meta = AudioMetadata(
            call_session_id=call.id,
            file_path=recording_url,
            format=captured.format,
            sample_rate_hz=captured.sample_rate_hz,
            duration_ms=captured.duration_ms,
            size_bytes=captured.size_bytes,
            retention_expiry=captured.retention_expiry
        )
        db.add(meta)
        db.commit()

    orchestrator = CallOrchestrator(db)
    res = await orchestrator.process_speech_input(
        call_id=call.id,
        speech_text=speech_result if speech_result else None,
        audio_bytes=audio_bytes
    )

    twiml = ivr.build_guidance_and_hangup(res["voice_response_hi"], language=call.language)
    return Response(content=twiml, media_type="application/xml")


@router.post("/twilio/status")
async def twilio_status(request: Request, db: Session = Depends(get_db)):
    """
    Twilio Call Status Webhook (completed, busy, no-answer, failed).
    """
    form_data = await request.form()
    call_sid = form_data.get("CallSid", "")
    call_status = form_data.get("CallStatus", "completed")
    call_duration = form_data.get("CallDuration", None)

    logger.info(f"[Twilio Webhook] Status update for {call_sid}: {call_status}, Duration: {call_duration}s")

    call = db.query(CallSession).filter(CallSession.provider_call_id == call_sid).first()
    if call:
        if call_duration and call_duration.isdigit():
            call.duration_seconds = int(call_duration)
        if call_status in ["completed", "canceled", "failed"]:
            call.ended_at = datetime.utcnow()
            call.state = "COMPLETED"
        db.commit()

    return {"status": "received"}


# ============================================================================
# EXOTEL PASSTHRU WEBHOOKS (Indian Telecom)
# ============================================================================

@router.get("/exotel/incoming")
@router.post("/exotel/incoming")
async def exotel_incoming(request: Request, db: Session = Depends(get_db)):
    """
    Exotel Passthru Applet incoming call webhook.
    """
    params = dict(request.query_params)
    if not params:
        try:
            form = await request.form()
            params = dict(form)
        except Exception:
            params = {}

    call_sid = params.get("CallSid", f"EXO-{int(datetime.utcnow().timestamp())}")
    from_number = params.get("From", params.get("CallFrom", "+91-unknown"))
    to_number = params.get("To", params.get("CallTo", ""))

    logger.info(f"[Exotel Webhook] Incoming call: {call_sid} from {from_number}")

    orchestrator = CallOrchestrator(db)
    call = await orchestrator.initialize_call(
        caller_phone=from_number,
        provider="exotel",
        provider_call_id=call_sid,
        language="hi",
        is_demo=False
    )

    ivr = get_ivr_provider("exotel")
    event = IVRCallEvent(call_sid=call_sid, from_number=from_number, to_number=to_number)
    return ivr.handle_incoming_call(event)


@router.get("/exotel/process")
@router.post("/exotel/process")
async def exotel_process(request: Request, db: Session = Depends(get_db)):
    """
    Exotel Passthru Applet speech/audio recording callback.
    """
    params = dict(request.query_params)
    if not params:
        try:
            form = await request.form()
            params = dict(form)
        except Exception:
            params = {}

    call_sid = params.get("CallSid", "")
    recording_url = params.get("RecordingUrl", None)
    speech_text = params.get("SpeechResult", params.get("Digits", None))

    logger.info(f"[Exotel Webhook] Process callback for {call_sid}: Recording={recording_url}, Text={speech_text}")

    call = db.query(CallSession).filter(CallSession.provider_call_id == call_sid).first()
    ivr = get_ivr_provider("exotel")
    
    if not call:
        return ivr.build_guidance_and_hangup("सत्र समाप्त हो गया है।")

    audio_bytes = None
    if recording_url:
        audio_service = get_audio_capture_service("exotel")
        captured = await audio_service.capture_from_url(recording_url, call_sid=call_sid)
        audio_bytes = captured.audio_bytes

        # Persist AudioMetadata
        meta = AudioMetadata(
            call_session_id=call.id,
            file_path=recording_url,
            format=captured.format,
            sample_rate_hz=captured.sample_rate_hz,
            duration_ms=captured.duration_ms,
            size_bytes=captured.size_bytes,
            retention_expiry=captured.retention_expiry
        )
        db.add(meta)
        db.commit()

    orchestrator = CallOrchestrator(db)
    res = await orchestrator.process_speech_input(
        call_id=call.id,
        speech_text=speech_text,
        audio_bytes=audio_bytes
    )

    return ivr.build_guidance_and_hangup(res["voice_response_hi"], language=call.language)


@router.get("/exotel/status")
@router.post("/exotel/status")
async def exotel_status(request: Request, db: Session = Depends(get_db)):
    """
    Exotel Call Status & CDR Webhook.
    """
    params = dict(request.query_params)
    if not params:
        try:
            form = await request.form()
            params = dict(form)
        except Exception:
            params = {}

    call_sid = params.get("CallSid", "")
    duration = params.get("DialCallDuration", params.get("CallDuration", None))

    logger.info(f"[Exotel Webhook] Status update for {call_sid}, Duration: {duration}")

    call = db.query(CallSession).filter(CallSession.provider_call_id == call_sid).first()
    if call:
        if duration and str(duration).isdigit():
            call.duration_seconds = int(duration)
        call.ended_at = datetime.utcnow()
        call.state = "COMPLETED"
        db.commit()

    return {"status": "ok"}
