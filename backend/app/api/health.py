import time
from datetime import datetime
from typing import Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from backend.app.config.settings import settings
from backend.app.database.session import get_db
from backend.app.models import CallSession, Patient, AshaWorker
from backend.app.ai.asr import get_asr_service
from backend.app.ai.nlp import get_nlp_service
from backend.app.ai.tts import get_tts_service
from backend.app.ivr import get_ivr_provider
from backend.app.sms import get_sms_provider

router = APIRouter(prefix="/health", tags=["Health & Diagnostics"])

@router.get("")
def health_overview(db: Session = Depends(get_db)):
    """
    General service health summary.
    """
    db_ok = False
    try:
        db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False

    return {
        "status": "healthy" if db_ok else "degraded",
        "app_name": settings.APP_NAME,
        "environment": settings.APP_ENV,
        "timezone": settings.TIMEZONE,
        "server_time_utc": datetime.utcnow().isoformat() + "Z",
        "database_connected": db_ok,
        "providers": {
            "asr": settings.ASR_PROVIDER,
            "nlp": settings.NLP_PROVIDER,
            "tts": settings.TTS_PROVIDER,
            "ivr": settings.IVR_PROVIDER,
            "sms": settings.SMS_PROVIDER
        },
        "safety_disclaimer": "VaaniDoc is an AI Health Guidance & Triage System (not medical diagnosis). Emergency symptoms are conservatively escalated."
    }

@router.get("/db")
def health_db(db: Session = Depends(get_db)):
    """
    PostgreSQL / Database connection, pool health, and record count checks.
    """
    start = time.perf_counter()
    try:
        db.execute(text("SELECT 1"))
        latency_ms = round((time.perf_counter() - start) * 1000, 2)
        
        call_count = db.query(CallSession).count()
        patient_count = db.query(Patient).count()
        asha_count = db.query(AshaWorker).count()
        
        return {
            "status": "healthy",
            "database_url_type": "postgresql" if "postgres" in settings.DATABASE_URL else "sqlite",
            "latency_ms": latency_ms,
            "records": {
                "call_sessions": call_count,
                "patients": patient_count,
                "asha_workers": asha_count
            }
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "latency_ms": round((time.perf_counter() - start) * 1000, 2)
        }

@router.get("/ai")
def health_ai():
    """
    Inspect AI pipeline status (ASR, NLP, TTS).
    """
    asr = get_asr_service()
    nlp = get_nlp_service()
    tts = get_tts_service()

    return {
        "status": "operational",
        "asr": {
            "provider": settings.ASR_PROVIDER,
            "confidence_threshold": settings.ASR_CONFIDENCE_THRESHOLD,
            "status": "ready"
        },
        "nlp": {
            "provider": settings.NLP_PROVIDER,
            "symptom_vocab_size": 35,
            "supported_languages": len(settings.SUPPORTED_LANGUAGES),
            "status": "ready"
        },
        "tts": {
            "provider": settings.TTS_PROVIDER,
            "telephony_format": "8kHz Mono PCM/WAV",
            "status": "ready"
        }
    }

@router.get("/telephony")
def health_telephony():
    """
    Inspect telecom provider configuration (Exotel, Twilio).
    """
    ivr = get_ivr_provider()
    sms = get_sms_provider()

    exotel_configured = bool(settings.EXOTEL_ACCOUNT_SID and settings.EXOTEL_API_KEY and settings.EXOTEL_API_TOKEN)
    twilio_configured = bool(settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN and settings.TWILIO_PHONE_NUMBER)

    return {
        "status": "operational",
        "active_ivr_provider": settings.IVR_PROVIDER,
        "active_sms_provider": settings.SMS_PROVIDER,
        "exotel": {
            "configured": exotel_configured,
            "subdomain": settings.EXOTEL_SUBDOMAIN,
            "phone_number": settings.EXOTEL_PHONE_NUMBER or "Not configured"
        },
        "twilio": {
            "configured": twilio_configured,
            "account_sid_present": bool(settings.TWILIO_ACCOUNT_SID),
            "phone_number": settings.TWILIO_PHONE_NUMBER or "Not configured"
        },
        "public_webhook_ready": True
    }
