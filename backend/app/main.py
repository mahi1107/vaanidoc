import os
import time
from contextlib import asynccontextmanager
from datetime import datetime
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import text

from backend.app.config.settings import settings
from backend.app.database.session import engine, Base, SessionLocal, get_db
from backend.app.api import api_router
from backend.app.models import AshaWorker, AdminUser, CallSession, Patient
from backend.app.utils.logger import logger

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables and default seed data
    logger.info(f"[Main] Initializing database tables on {settings.DATABASE_URL.split('@')[-1] if '@' in settings.DATABASE_URL else settings.DATABASE_URL}...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        from backend.app.models import HealthcareFacility
        from backend.app.services.facility_service import FacilityService

        # Ensure admin user exists with configured password
        from backend.app.api.auth import get_password_hash, verify_password
        admin = db.query(AdminUser).filter(AdminUser.username == settings.ADMIN_USERNAME).first()
        if not admin:
            logger.info("[Main] Initializing default administrator account...")
            admin = AdminUser(
                username=settings.ADMIN_USERNAME,
                hashed_password=get_password_hash(settings.ADMIN_PASSWORD),
                full_name="VaaniDoc Lead Administrator",
                role="admin",
                is_active=True
            )
            db.add(admin)
            db.commit()
        elif not verify_password(settings.ADMIN_PASSWORD, admin.hashed_password):
            logger.info("[Main] Synchronizing administrator password hash...")
            admin.hashed_password = get_password_hash(settings.ADMIN_PASSWORD)
            db.commit()

        # Seed initial ASHA workers if none exist
        if db.query(AshaWorker).count() == 0:
            logger.info("[Main] Seeding initial ASHA workers across UP districts...")
            w1 = AshaWorker(
                worker_code="ASHA-VAR-01",
                name="आशा कार्यकर्ता (Varanasi)",
                phone_number="+91-94512-21484",
                state="Uttar Pradesh",
                district="Varanasi",
                sub_district="Chiraigaon",
                village="Rustampur",
                is_active=True,
                assigned_population=1200
            )
            w2 = AshaWorker(
                worker_code="ASHA-MIR-01",
                name="आशा कार्यकर्ता (Mirzapur)",
                phone_number="+91-94512-58097",
                state="Uttar Pradesh",
                district="Mirzapur",
                sub_district="Chunar",
                village="Daranagar",
                is_active=True,
                assigned_population=1100
            )
            w3 = AshaWorker(
                worker_code="ASHA-CHA-01",
                name="आशा कार्यकर्ता (Chandauli)",
                phone_number="+91-94512-43416",
                state="Uttar Pradesh",
                district="Chandauli",
                sub_district="Sakaldiha",
                village="Alinagar",
                is_active=True,
                assigned_population=1350
            )
            db.add_all([w1, w2, w3])
            db.commit()

        # Ensure required ASHA staff accounts exist and are linked to their worker records
        asha_accounts = [
            ("asha_varanasi", "ASHA-VAR-01", "Varanasi", "आशा कार्यकर्ता (Varanasi)", "+91-94512-21484"),
            ("asha_mirzapur", "ASHA-MIR-01", "Mirzapur", "आशा कार्यकर्ता (Mirzapur)", "+91-94512-58097"),
        ]

        for username, worker_code, district, display_name, fallback_phone in asha_accounts:
            worker = db.query(AshaWorker).filter(
                (AshaWorker.worker_code == worker_code) | (AshaWorker.district == district)
            ).first()

            worker_id = worker.id if worker else None
            phone = worker.phone_number if worker else fallback_phone

            asha_user = db.query(AdminUser).filter(AdminUser.username == username).first()
            if not asha_user:
                logger.info(f"[Main] Creating ASHA login account '{username}' linked to {worker_code}...")
                asha_user = AdminUser(
                    username=username,
                    hashed_password=get_password_hash("asha123"),
                    full_name=display_name,
                    role="asha_worker",
                    phone_number=phone,
                    district=district,
                    asha_worker_id=worker_id,
                    is_active=True
                )
                db.add(asha_user)
                db.commit()
            else:
                updated = False
                if asha_user.asha_worker_id != worker_id and worker_id:
                    asha_user.asha_worker_id = worker_id
                    updated = True
                if not verify_password("asha123", asha_user.hashed_password):
                    asha_user.hashed_password = get_password_hash("asha123")
                    updated = True
                if updated:
                    db.commit()

        # Seed and sync verified healthcare facilities across India districts
        facility_srv = FacilityService(db)
        facility_srv.seed_initial_facilities()

    finally:
        db.close()
    
    yield
    logger.info("[Main] Shutting down application...")

app = FastAPI(
    title="VaaniDoc API",
    description="Voice-First AI Health Guidance and Triage Platform for Rural India",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
origins = [o.strip() for o in settings.CORS_ORIGINS.split(",")] if settings.CORS_ORIGINS != "*" else ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API v1 router
app.include_router(api_router, prefix=settings.API_V1_STR)

# Top-level Health Checks for Cloud Deployment Liveness/Readiness Probes
@app.get("/health", tags=["System Diagnostics"])
def health_check(db: Session = Depends(get_db)):
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

@app.get("/health/db", tags=["System Diagnostics"])
def health_check_db(db: Session = Depends(get_db)):
    start = time.perf_counter()
    try:
        db.execute(text("SELECT 1"))
        latency_ms = round((time.perf_counter() - start) * 1000, 2)
        call_count = db.query(CallSession).count()
        return {
            "status": "healthy",
            "database_url_type": "postgresql" if "postgres" in settings.DATABASE_URL else "sqlite",
            "latency_ms": latency_ms,
            "total_call_records": call_count
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "latency_ms": round((time.perf_counter() - start) * 1000, 2)
        }

@app.get("/health/ai", tags=["System Diagnostics"])
def health_check_ai():
    return {
        "status": "operational",
        "asr_provider": settings.ASR_PROVIDER,
        "nlp_provider": settings.NLP_PROVIDER,
        "tts_provider": settings.TTS_PROVIDER,
        "confidence_threshold": settings.ASR_CONFIDENCE_THRESHOLD
    }

@app.get("/health/telephony", tags=["System Diagnostics"])
def health_check_telephony():
    return {
        "status": "operational",
        "ivr_provider": settings.IVR_PROVIDER,
        "sms_provider": settings.SMS_PROVIDER,
        "exotel_configured": bool(settings.EXOTEL_ACCOUNT_SID and settings.EXOTEL_API_KEY),
        "twilio_configured": bool(settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN)
    }

@app.get("/", tags=["System Diagnostics"])
def root():
    return {
        "message": "Welcome to VaaniDoc AI Voice Health Guidance & Triage Platform",
        "documentation": "/docs",
        "health": "/health",
        "api_v1": settings.API_V1_STR
    }
