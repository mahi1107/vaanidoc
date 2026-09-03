import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database.session import SessionLocal
from backend.app.models import CallSession, Patient, AudioMetadata
from backend.app.telephony.audio import (
    get_audio_capture_service,
    MockAudioService,
    ExotelAudioService,
    TwilioAudioService,
    AudioRetentionManager
)

client = TestClient(app)

@pytest.mark.asyncio
async def test_audio_capture_service_abstraction():
    # 1. Factory initialization
    mock_svc = get_audio_capture_service("mock")
    assert isinstance(mock_svc, MockAudioService)

    exo_svc = get_audio_capture_service("exotel")
    assert isinstance(exo_svc, ExotelAudioService)

    tw_svc = get_audio_capture_service("twilio")
    assert isinstance(tw_svc, TwilioAudioService)

    # 2. Mock telephony audio generation & metadata
    captured = await mock_svc.capture_from_url("https://media.telecom.in/recordings/call_123.wav")
    assert captured.format == "wav"
    assert captured.sample_rate_hz == 8000
    assert captured.channels == 1
    assert captured.duration_ms > 0
    assert captured.size_bytes > 0
    assert captured.retention_expiry is not None

def test_audio_retention_manager():
    db = SessionLocal()
    now = datetime.utcnow()
    
    # Create mock session
    patient = Patient(caller_hash="hash_test_123", age_group="adult", district="Varanasi", village="Rustampur")
    db.add(patient)
    db.commit()

    call = CallSession(
        patient_id=patient.id,
        provider="exotel",
        provider_call_id="EXO-RET-TEST-001",
        caller_phone="+91-99999-00001",
        language="hi",
        state="COMPLETED",
        is_demo=False
    )
    db.add(call)
    db.commit()

    # Create 1 expired audio record and 1 active audio record
    expired_meta = AudioMetadata(
        call_session_id=call.id,
        file_path="http://media.exotel.com/rec1.wav",
        sample_rate_hz=8000,
        duration_ms=4000,
        size_bytes=64000,
        retention_expiry=now - timedelta(days=1)
    )
    active_meta = AudioMetadata(
        call_session_id=call.id,
        file_path="http://media.exotel.com/rec2.wav",
        sample_rate_hz=8000,
        duration_ms=4000,
        size_bytes=64000,
        retention_expiry=now + timedelta(days=7)
    )
    db.add(expired_meta)
    db.add(active_meta)
    db.commit()

    retention_mgr = AudioRetentionManager(db)
    cleaned = retention_mgr.cleanup_expired_audio()
    assert cleaned >= 1

    # Verify active remains
    active_check = db.query(AudioMetadata).filter(AudioMetadata.id == active_meta.id).first()
    assert active_check is not None

    db.close()

def test_active_calls_api_endpoint():
    # Fetch active calls
    resp = client.get("/api/calls/active?exclude_demo=false")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)

    # Fetch with exclude_demo=true
    prod_resp = client.get("/api/calls/active?exclude_demo=true")
    assert prod_resp.status_code == 200
    prod_data = prod_resp.json()
    for c in prod_data:
        assert c["is_demo"] is False
