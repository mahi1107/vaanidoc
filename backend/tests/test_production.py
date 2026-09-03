import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.config.settings import settings
from backend.app.api.auth import create_access_token, get_password_hash, verify_password

client = TestClient(app)

def test_auth_login_and_token():
    # Login with valid default admin credentials
    response = client.post(
        "/api/auth/login",
        json={"username": settings.ADMIN_USERNAME, "password": settings.ADMIN_PASSWORD}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    token = data["access_token"]

    # Verify protected /api/auth/me endpoint
    me_resp = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert me_resp.status_code == 200
    me_data = me_resp.json()
    assert me_data["username"] == settings.ADMIN_USERNAME
    assert me_data["role"] == "admin"

def test_auth_invalid_login():
    response = client.post(
        "/api/auth/login",
        json={"username": "admin", "password": "wrong_password"}
    )
    assert response.status_code == 401

def test_system_diagnostics_health_checks():
    # Root health
    h_resp = client.get("/health")
    assert h_resp.status_code == 200
    h_data = h_resp.json()
    assert h_data["status"] == "healthy"
    assert h_data["timezone"] == "Asia/Kolkata"
    assert "server_time_utc" in h_data

    # DB Health
    db_resp = client.get("/health/db")
    assert db_resp.status_code == 200
    assert db_resp.json()["status"] == "healthy"

    # AI Health
    ai_resp = client.get("/health/ai")
    assert ai_resp.status_code == 200
    assert ai_resp.json()["status"] == "operational"

    # Telephony Health
    tel_resp = client.get("/health/telephony")
    assert tel_resp.status_code == 200
    assert tel_resp.json()["status"] == "operational"

def test_twilio_voice_webhooks():
    # 1. Incoming Call Webhook (Twilio form post)
    in_resp = client.post(
        "/api/webhooks/twilio/incoming",
        data={"CallSid": "CA_TEST_12345", "From": "+919876543210", "To": "+910000000000"}
    )
    assert in_resp.status_code == 200
    assert "application/xml" in in_resp.headers["content-type"]
    assert "<Response>" in in_resp.text
    assert "<Gather" in in_resp.text

    # 2. Gather Speech Callback Webhook
    gather_resp = client.post(
        "/api/webhooks/twilio/gather",
        data={"CallSid": "CA_TEST_12345", "SpeechResult": "मुझे तीन दिन से तेज बुखार है"}
    )
    assert gather_resp.status_code == 200
    assert "<Say" in gather_resp.text
    assert "<Hangup/>" in gather_resp.text

    # 3. Status Callback Webhook
    stat_resp = client.post(
        "/api/webhooks/twilio/status",
        data={"CallSid": "CA_TEST_12345", "CallStatus": "completed", "CallDuration": "45"}
    )
    assert stat_resp.status_code == 200
    assert stat_resp.json()["status"] == "received"

def test_exotel_passthru_webhooks():
    # 1. Incoming Passthru Call (Exotel query params)
    in_resp = client.get(
        "/api/webhooks/exotel/incoming?CallSid=EXO_TEST_9988&From=%2B919876543210"
    )
    assert in_resp.status_code == 200
    assert "select_passthru" in in_resp.json()

    # 2. Process Speech Callback
    proc_resp = client.get(
        "/api/webhooks/exotel/process?CallSid=EXO_TEST_9988&SpeechResult=सीने+में+दर्द+है"
    )
    assert proc_resp.status_code == 200
    assert "exotel_action" in proc_resp.json()

    # 3. Status Webhook
    stat_resp = client.get(
        "/api/webhooks/exotel/status?CallSid=EXO_TEST_9988&DialCallDuration=38"
    )
    assert stat_resp.status_code == 200
    assert stat_resp.json()["status"] == "ok"
