import pytest
from httpx import AsyncClient, ASGITransport
from backend.app.main import app
from backend.app.database.session import engine, Base

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield

@pytest.mark.asyncio
async def test_health_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "healthy"
        assert data["app_name"] == "VaaniDoc"

@pytest.mark.asyncio
async def test_simulate_call_pipeline():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = {
            "patient_speech": "मुझे तीन दिन से बहुत तेज बुखार है और सिर दर्द हो रहा है।",
            "language": "hi",
            "caller_phone": "+91-98765-43210",
            "district": "Varanasi",
            "village": "Rustampur",
            "age_group": "adult"
        }
        res = await ac.post("/api/calls/simulate", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert "call_id" in data
        assert data["status"] == "completed"
        assert len(data["extracted_symptoms"]) >= 1
        assert data["triage_decision"]["level"] in [2, 3]
        assert data["asha_alert_sent"] is True
        assert data["followup_scheduled"] is True

@pytest.mark.asyncio
async def test_analytics_endpoints():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/analytics/overview")
        assert res.status_code == 200
        data = res.json()
        assert "total_calls" in data

        res_triage = await ac.get("/api/analytics/triage")
        assert res_triage.status_code == 200
        assert len(res_triage.json()) == 4

        res_protocols = await ac.get("/api/triage/protocols")
        assert res_protocols.status_code == 200
        assert len(res_protocols.json()) > 0
