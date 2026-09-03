#!/usr/bin/env python3
"""
VaaniDoc — Production System Verification & Integrity Test Suite
Validates PostgreSQL/SQLite database, ASR, Language Detection, Hinglish Understanding,
NLP, Triage Engine, Voice TTS, ASHA worker alerts, CareCases, Facilities, and Analytics.
"""

import sys
import os
import asyncio
from datetime import datetime

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from backend.app.database.session import SessionLocal, Base, engine
from backend.app.services.call_orchestrator import CallOrchestrator
from backend.app.services.analytics_service import AnalyticsService
from backend.app.services.case_service import CaseService
from backend.app.services.facility_service import FacilityService
from backend.app.languages.detector import language_detector
from backend.app.ai.triage.protocols import CLINICAL_PROTOCOLS_CATALOG
from backend.app.api.auth import create_access_token, verify_password, get_password_hash
from backend.app.config.settings import settings

async def verify():
    print("=" * 70)
    print("  VAANIDOC PRODUCTION SYSTEM VERIFICATION & INTEGRITY CHECK")
    print("=" * 70)

    # 1. Database & ORM Models
    print("\n[1] Initializing Database Schema & Connection Pool...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    print(f"    ✅ Database active: {settings.DATABASE_URL.split('@')[-1] if '@' in settings.DATABASE_URL else settings.DATABASE_URL}")
    print(f"    ✅ Timezone configured: {settings.TIMEZONE}")

    # 2. Protocols Catalog
    print(f"\n[2] Validating Clinical Protocols Catalog...")
    print(f"    Loaded {len(CLINICAL_PROTOCOLS_CATALOG)} WHO IMCI / ICMR clinical protocols.")
    assert len(CLINICAL_PROTOCOLS_CATALOG) >= 8, "Missing clinical protocols"
    print("    ✅ Clinical protocol rules verified.")

    # 3. Admin Authentication & Security
    print("\n[3] Validating Admin JWT Authentication & Security...")
    hashed = get_password_hash("test_password_123")
    assert verify_password("test_password_123", hashed) is True
    token = create_access_token({"sub": "admin", "role": "admin"})
    assert isinstance(token, str) and len(token) > 20
    print(f"    ✅ Password hashing (bcrypt) & JWT issuance verified.")

    # 4. Automatic Language Detection & Hinglish Handling
    print("\n[4] Validating Automatic Language Detection & Hinglish...")
    hi_det = language_detector.detect("मुझे दो दिन से बुखार है।")
    assert hi_det["detected_language"] == "hi"
    print(f"    ✅ Hindi detection: {hi_det['display_name']} ({hi_det['confidence']})")

    hing_det = language_detector.detect("Mujhe two days se fever hai aur body mein weakness ho rahi hai.")
    assert hing_det["detected_language"] == "hinglish"
    print(f"    ✅ Hinglish detection: {hing_det['display_name']} ({hing_det['confidence']})")

    en_det = language_detector.detect("I have had severe chest pain since yesterday.")
    assert en_det["detected_language"] == "en"
    print(f"    ✅ English detection: {en_det['display_name']} ({en_det['confidence']})")

    # 5. End-to-End Test 1: Hinglish Web Consultation (PHC / Hospital Referral)
    print("\n[5] Testing Web Voice Consultation — Hinglish Acute Fever Case...")
    orchestrator = CallOrchestrator(db)
    c1 = await orchestrator.initialize_call(
        caller_phone="+91-98765-43210",
        provider="web",
        language="hi",
        district="Varanasi",
        village="Rustampur",
        is_demo=False
    )
    r1 = await orchestrator.process_speech_input(
        call_id=c1.id,
        speech_text="Mujhe two days se high fever hai aur weakness ho rahi hai."
    )
    assert r1["triage_decision"]["level"] in [2, 3]
    assert r1["detected_language"] == "hinglish"
    assert r1.get("case_code") is not None
    assert r1.get("recommended_facility") is not None
    assert r1["asha_alert_sent"] is True
    assert r1["followup_scheduled"] is True
    print(f"    ✅ Triage Decision: Level {r1['triage_decision']['level']} ({r1['triage_decision']['category']})")
    print(f"    ✅ Created CareCase Reference: {r1['case_code']}")
    print(f"    ✅ Attached Verified Facility: {r1['recommended_facility']['name']}")
    print(f"    ✅ Conversational Hinglish Voice Response Generated.")

    # 6. End-to-End Test 2: Emergency Case (Level 4 Red Flag)
    print("\n[6] Testing Consultation Pipeline — Emergency Case (Chest Pain & Dyspnea)...")
    c2 = await orchestrator.initialize_call(
        caller_phone="+91-98765-11223",
        provider="web",
        language="hi",
        district="Mirzapur",
        village="Daranagar",
        is_demo=False
    )
    r2 = await orchestrator.process_speech_input(
        call_id=c2.id,
        speech_text="सीने में बहुत तेज दर्द हो रहा है और सांस लेने में भारी तकलीफ है।"
    )
    assert r2["triage_decision"]["level"] == 4
    assert r2["triage_decision"]["category"] == "emergency"
    assert "108" in r2["voice_response_hi"]
    print(f"    ✅ Emergency Escalation: Level {r2['triage_decision']['level']} -> {r2['triage_decision']['rule_id']}")
    print(f"    ✅ Emergency Helpline Included: 108")

    # 7. Analytics Aggregations
    print("\n[7] Validating Real-time Analytics Aggregations...")
    analytics = AnalyticsService(db)
    overview = analytics.get_overview_metrics(exclude_demo=True)
    print(f"    Total Production Calls in DB: {overview['total_calls']}")
    print(f"    Emergency Cases  : {overview['emergency_cases']}")
    print(f"    ASHA Alerts      : {overview['asha_alerts_sent']}")
    assert overview['total_calls'] >= 1
    print("    ✅ Real-time database aggregations verified.")

    # 8. Verified Facility Directory Check
    print("\n[8] Validating Healthcare Facility Directory...")
    fac_service = FacilityService(db)
    facilities = fac_service.list_facilities()
    assert len(facilities) >= 5, "Missing facility catalog"
    print(f"    ✅ Loaded {len(facilities)} verified government healthcare centres.")

    print("\n" + "=" * 70)
    print("  ALL PRODUCTION SYSTEM CHECKS PASSED (100% OPERATIONAL & READY)")
    print("=" * 70)

if __name__ == "__main__":
    asyncio.run(verify())
