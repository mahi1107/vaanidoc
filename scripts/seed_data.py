#!/usr/bin/env python3
"""
Seed realistic demographic & call session data into VaaniDoc database with CareCases and Facilities.
"""
import sys
import os
import random
from datetime import datetime, timedelta

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from backend.app.database.session import SessionLocal, Base, engine
from backend.app.models import (
    Patient, CallSession, Transcript, SymptomRecord, TriageResult, Alert, FollowUp, AshaWorker,
    CareCase, HealthcareFacility, AdminUser
)
from backend.app.api.auth import get_password_hash
from backend.app.services.facility_service import FacilityService
from backend.app.config.settings import settings

DISTRICTS = [
    {"district": "Varanasi", "sub": "Chiraigaon", "villages": ["Rustampur", "Lohta", "Kandwa", "Cholapur"]},
    {"district": "Mirzapur", "sub": "Chunar", "villages": ["Daranagar", "Kailahat", "Ahraura", "Narayanpur"]},
    {"district": "Chandauli", "sub": "Sakaldiha", "villages": ["Alinagar", "Dhanapur", "Baburi", "Mughalsarai Rural"]},
    {"district": "Jaunpur", "sub": "Shahganj", "villages": ["Kheta Sarai", "Badlapur", "Mariyahu", "Kerakat"]},
    {"district": "Ghazipur", "sub": "Zamania", "villages": ["Saidpur", "Mohammadabad", "Dildarnagar", "Jakhanian"]},
    {"district": "Sonbhadra", "sub": "Robertsganj", "villages": ["Ghorawal", "Dudhi", "Chopan", "Anpara"]}
]

SAMPLE_CALLS = [
    {
        "speech": "मुझे तीन दिन से बुखार है और सिर में दर्द हो रहा है।",
        "lang": "hi",
        "symptoms": [("fever", "बुखार", 3, "moderate", False), ("headache", "सिर दर्द", 3, "moderate", False)],
        "level": 2, "category": "phc", "rule_id": "PHC-FEV-001",
        "reason": "2 से 4 दिन का बुखार या सिर दर्द",
        "action": "प्राथमिक स्वास्थ्य केंद्र (PHC) जाकर जांच करवाएं।"
    },
    {
        "speech": "सीने में बहुत तेज दर्द है और सांस फूल रही है।",
        "lang": "hi",
        "symptoms": [("chest_pain", "सीने में दर्द", 0, "severe", True), ("dyspnea", "सांस लेने में तकलीफ", 0, "severe", True)],
        "level": 4, "category": "emergency", "rule_id": "EMERG-RED-001",
        "reason": "गंभीर सांस लेने में तकलीफ (Severe Dyspnea)",
        "action": "तुरंत 108 नंबर पर एम्बुलेंस बुलाएं।"
    },
    {
        "speech": "Mujhe two days se high fever hai aur vomiting ho rahi hai.",
        "lang": "hinglish",
        "symptoms": [("fever", "बुखार", 2, "severe", False), ("vomiting", "उल्टी", 1, "moderate", False)],
        "level": 3, "category": "hospital", "rule_id": "HOSP-FEV-001",
        "reason": "तेज बुखार और उल्टी के लक्षण (Hospital Referral)",
        "action": "सामुदायिक स्वास्थ्य केंद्र (CHC) या जिला अस्पताल जाएं।"
    },
    {
        "speech": "बच्चे को कल से उल्टी और दस्त हो रहे हैं, कमजोरी लग रही है।",
        "lang": "hi",
        "symptoms": [("vomiting", "उल्टी", 1, "moderate", True), ("diarrhea", "दस्त / पेचिश", 1, "moderate", True)],
        "level": 3, "category": "hospital", "rule_id": "HOSP-PED-001",
        "reason": "बच्चे में दस्त/उल्टी से गंभीर डिहाइड्रेशन का जोखिम",
        "action": "ओआरएस पिलाएं और जिला अस्पताल ले जाएं।"
    },
    {
        "speech": "हल्की खांसी और जुकाम है दो दिन से।",
        "lang": "hi",
        "symptoms": [("cough", "खांसी", 2, "mild", False)],
        "level": 1, "category": "home_care", "rule_id": "HOME-COLD-001",
        "reason": "हल्के मौसमी लक्षण या थकान",
        "action": "भरपूर आराम करें, गुनगुना पानी पिएं।"
    },
    {
        "speech": "I have had mild sore throat and body ache since yesterday.",
        "lang": "en",
        "symptoms": [("throat_pain", "गले में दर्द", 1, "mild", False), ("body_ache", "बदन दर्द", 1, "mild", False)],
        "level": 1, "category": "home_care", "rule_id": "HOME-ACHE-001",
        "reason": "Mild seasonal symptoms and general malaise",
        "action": "Rest well, drink plenty of warm liquids, and monitor temperature."
    }
]

def seed_database(num_records: int = 40):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    print(f"[*] Seeding {num_records} realistic clinical cases across 6 districts...")

    # Seed verified facilities
    fac_service = FacilityService(db)
    fac_service.seed_initial_facilities()

    # Seed Admin User
    if not db.query(AdminUser).filter(AdminUser.username == settings.ADMIN_USERNAME).first():
        admin = AdminUser(
            username=settings.ADMIN_USERNAME,
            hashed_password=get_password_hash(settings.ADMIN_PASSWORD),
            full_name="VaaniDoc Lead Administrator",
            role="admin",
            is_active=True
        )
        db.add(admin)

    # Ensure ASHA workers for each district
    asha_workers = []
    for dist_info in DISTRICTS:
        w_code = f"ASHA-{dist_info['district'][:3].upper()}-01"
        worker = db.query(AshaWorker).filter(AshaWorker.worker_code == w_code).first()
        if not worker:
            worker = AshaWorker(
                worker_code=w_code,
                name=f"आशा कार्यकर्ता ({dist_info['district']})",
                phone_number=f"+91-94512-{random.randint(10000, 99999)}",
                state="Uttar Pradesh",
                district=dist_info["district"],
                sub_district=dist_info["sub"],
                village=dist_info["villages"][0],
                is_active=True,
                assigned_population=random.randint(900, 1400)
            )
            db.add(worker)
            db.commit()
            db.refresh(worker)

            # Create ASHA portal login account
            asha_user = AdminUser(
                username=f"asha_{dist_info['district'].lower()}",
                hashed_password=get_password_hash("asha123"),
                full_name=f"आशा कार्यकर्ता ({dist_info['district']})",
                role="asha_worker",
                phone_number=worker.phone_number,
                district=dist_info["district"],
                asha_worker_id=worker.id,
                is_active=True
            )
            db.add(asha_user)
        asha_workers.append(worker)
    db.commit()

    now = datetime.utcnow()

    # Generate historical calls & persistent CareCases
    for i in range(num_records):
        dist_info = random.choice(DISTRICTS)
        village = random.choice(dist_info["villages"])
        proto_case = random.choice(SAMPLE_CALLS)
        days_ago = random.randint(0, 6)
        call_time = now - timedelta(days=days_ago, hours=random.randint(1, 20), minutes=random.randint(1, 55))

        patient = Patient(
            caller_hash=f"hash_{random.randint(100000, 999999)}",
            district=dist_info["district"],
            sub_district=dist_info["sub"],
            village=village,
            age_group="child" if "बच्चे" in proto_case["speech"] else "adult",
            created_at=call_time
        )
        db.add(patient)
        db.commit()
        db.refresh(patient)

        phone_num = f"+91-XXXXX-{random.randint(1000, 9999)}"
        call = CallSession(
            patient_id=patient.id,
            provider="web",
            provider_call_id=f"WEB-{int(call_time.timestamp())}-{i:02d}",
            caller_phone=phone_num,
            language=proto_case.get("lang", "hi"),
            state="COMPLETED",
            status="escalated" if proto_case["level"] >= 3 else "completed",
            duration_seconds=random.randint(25, 95),
            is_demo=True,
            timeline_events=[
                {"time": call_time.strftime("%I:%M:%S %p"), "stage": "Voice Consultation Completed", "status": "completed"},
                {"time": call_time.strftime("%I:%M:%S %p"), "stage": "Speech Recognition & Language Detection", "status": "completed"},
                {"time": call_time.strftime("%I:%M:%S %p"), "stage": f"Triage Protocol ({proto_case['rule_id']})", "status": "completed"}
            ],
            started_at=call_time,
            ended_at=call_time + timedelta(seconds=random.randint(25, 95))
        )
        db.add(call)
        db.commit()
        db.refresh(call)

        # Transcript
        t = Transcript(
            call_session_id=call.id,
            turn_index=1,
            speaker="patient",
            transcript=proto_case["speech"],
            confidence=0.96,
            language=proto_case.get("lang", "hi"),
            asr_provider="indic",
            processing_ms=180,
            created_at=call_time
        )
        db.add(t)

        # Symptoms
        for sym_name, hindi_term, dur, sev, is_red in proto_case["symptoms"]:
            sr = SymptomRecord(
                call_session_id=call.id,
                symptom_name=sym_name,
                hindi_term=hindi_term,
                duration_val=dur,
                duration_unit="days",
                severity=sev,
                is_negated=False,
                is_red_flag=is_red,
                raw_extracted_text=proto_case["speech"],
                confidence=0.95,
                created_at=call_time
            )
            db.add(sr)

        # Triage Result
        tr = TriageResult(
            call_session_id=call.id,
            level=proto_case["level"],
            category=proto_case["category"],
            rule_id=proto_case["rule_id"],
            reason=proto_case["reason"],
            recommended_action=proto_case["action"],
            voice_guidance_text=proto_case["action"],
            urgency="immediate" if proto_case["level"] == 4 else ("within_24h" if proto_case["level"] >= 2 else "routine"),
            confidence=0.98,
            created_at=call_time
        )
        db.add(tr)

        # Facility
        fac = fac_service.get_recommended_facility(proto_case["level"], district=dist_info["district"])

        # ASHA Worker
        dist_ashas = [a for a in asha_workers if a.district == dist_info["district"]]
        assigned_asha = dist_ashas[0] if dist_ashas else asha_workers[0]

        # Care Case
        case_status = "Escalated" if proto_case["level"] == 4 else ("Referral Recommended" if proto_case["level"] == 3 else ("ASHA Follow-up" if proto_case["level"] == 2 else "Resolved"))
        if days_ago == 0 and proto_case["level"] in [2, 3]:
            case_status = "Follow-up Due"

        care_case = CareCase(
            case_code=f"VD-{1000 + i + 1}",
            patient_id=patient.id,
            call_session_id=call.id,
            primary_complaint=proto_case["speech"],
            detected_language=proto_case.get("lang", "hi"),
            language_confidence=0.95,
            triage_level=proto_case["level"],
            triage_category=proto_case["category"],
            status=case_status,
            recommendation_text=proto_case["action"],
            facility_id=fac.id if fac else None,
            asha_worker_id=assigned_asha.id if assigned_asha else None,
            is_demo=True,
            care_events=[
                {
                    "time": call_time.strftime("%d %b %Y, %I:%M %p"),
                    "event": "Voice Consultation Completed",
                    "actor": "VaaniDoc AI Triage",
                    "notes": f"Evaluated Level {proto_case['level']} ({proto_case['category']}).",
                    "status": case_status
                }
            ],
            created_at=call_time,
            updated_at=call_time
        )
        db.add(care_case)

        # Follow-up (Level 2, 3, 4)
        if proto_case["level"] >= 2:
            followup_time = call_time + timedelta(hours=24)
            f_status = "completed" if days_ago >= 2 else ("due" if days_ago == 1 else "scheduled")
            follow = FollowUp(
                call_session_id=call.id,
                scheduled_for=followup_time,
                status=f_status,
                outcome="visited_phc" if f_status == "completed" else None,
                patient_response_text="हालत में सुधार है, पीएचसी जाकर दवा ली।" if f_status == "completed" else None,
                created_at=call_time
            )
            db.add(follow)

            # ASHA Alert
            alert = Alert(
                call_session_id=call.id,
                asha_worker_id=assigned_asha.id if assigned_asha else None,
                alert_type="sms",
                triage_level=proto_case["level"],
                message=f"VaaniDoc Alert ({proto_case['category'].upper()}): Village {village} ({dist_info['district']}). Symptoms: {proto_case['reason']}.",
                status="delivered" if days_ago > 0 else "sent",
                sent_at=call_time
            )
            db.add(alert)

    db.commit()
    db.close()
    print(f"[+] Successfully seeded {num_records} health records, CareCases, and Facilities into database.")

if __name__ == "__main__":
    seed_database(40)
