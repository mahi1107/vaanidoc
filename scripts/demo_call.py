#!/usr/bin/env python3
"""
VaaniDoc — Live Patient Call Simulation CLI Demo
Simulates end-to-end voice health guidance call:
Audio/Speech -> ASR -> Clinical NLP -> Deterministic Triage -> Hindi Voice Synthesis -> ASHA Worker SMS -> 24h Follow-up.
"""

import sys
import os
import asyncio
from datetime import datetime

# Add project root to PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from backend.app.database.session import SessionLocal, Base, engine
from backend.app.services.call_orchestrator import CallOrchestrator
from backend.app.languages.definitions import get_language_config

def print_header(title: str):
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)

async def run_demo(scenario_idx: int = 1):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    orchestrator = CallOrchestrator(db)

    scenarios = [
        {
            "title": "Scenario 1: Acute Fever & Headache (PHC Referral)",
            "speech": "मुझे तीन दिन से बहुत तेज बुखार है और सिर में दर्द हो रहा है।",
            "caller": "+91-98765-43210",
            "district": "Varanasi",
            "village": "Rustampur",
            "age": "adult"
        },
        {
            "title": "Scenario 2: Severe Chest Pain & Dyspnea (Level 4 Emergency)",
            "speech": "सीने में बहुत तेज दर्द हो रहा है और सांस लेने में भारी तकलीफ है, पसीना आ रहा है।",
            "caller": "+91-98765-11223",
            "district": "Mirzapur",
            "village": "Daranagar",
            "age": "adult"
        },
        {
            "title": "Scenario 3: Pediatric Persistent Diarrhea (Level 3 Hospital)",
            "speech": "बच्चे को कल से उल्टी और दस्त हो रहे हैं, बहुत ज्यादा कमजोरी है।",
            "caller": "+91-98765-99887",
            "district": "Chandauli",
            "village": "Alinagar",
            "age": "child"
        },
        {
            "title": "Scenario 4: Mild Cold (Level 1 Home Care)",
            "speech": "हल्की खांसी और जुकाम है एक दिन से, कोई तेज बुखार नहीं है।",
            "caller": "+91-98765-33445",
            "district": "Varanasi",
            "village": "Lohta",
            "age": "adult"
        }
    ]

    selected = scenarios[(scenario_idx - 1) % len(scenarios)]
    
    print_header(f"VAANIDOC VOICE HEALTH CALL DEMO — {selected['title']}")
    print(f"📞 Inbound Call from: {selected['caller']}")
    print(f"📍 Location: {selected['village']}, {selected['district']} (Uttar Pradesh)")
    print(f"🌐 Language: Hindi (हिन्दी)")
    print(f"⏱️  Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # 1. Initialize Call
    call = await orchestrator.initialize_call(
        caller_phone=selected["caller"],
        provider="mock",
        language="hi",
        district=selected["district"],
        village=selected["village"]
    )
    print(f"\n[1] 📡 IVR CONNECTED -> Call ID: {call.id}")
    
    # 2. Greeting
    lang_cfg = get_language_config("hi")
    print(f"[2] 🗣️  IVR GREETING: \"{lang_cfg.prompts.greeting}\"")

    # 3. Patient Spoken Input
    print(f"\n[3] 🎙️  PATIENT SPOKEN AUDIO: \"{selected['speech']}\"")
    print("      Processing through AI Pipeline (IndicASR -> IndicBERT/Clinical NER -> Triage -> IndicTTS)...")

    # 4. Pipeline Execution
    result = await orchestrator.process_speech_input(
        call_id=call.id,
        speech_text=selected["speech"],
        age_group=selected["age"]
    )

    # 5. Pipeline Stages Breakdown
    print("\n" + "-" * 70)
    print("  AI PIPELINE STAGE BREAKDOWN")
    print("-" * 70)
    
    print(f"[A] ASR Speech-to-Text:")
    print(f"    Transcript: \"{result['transcript']}\"")
    print(f"    Confidence: {result['asr_confidence'] * 100:.1f}%")

    print(f"\n[B] Clinical NLP Entity Extraction:")
    for sym in result["extracted_symptoms"]:
        neg_str = " (NEGATED)" if sym["is_negated"] else ""
        rf_str = " 🚨 [RED FLAG]" if sym["is_red_flag"] else ""
        print(f"    • Symptom: {sym['name']} ({sym['hindi_term']}){neg_str}{rf_str}")
        print(f"      Duration: {sym['duration_val']} {sym['duration_unit']} | Severity: {sym['severity']}")

    print(f"\n[C] Deterministic Clinical Triage Engine:")
    t_dec = result["triage_decision"]
    level_emojis = {1: "🟢", 2: "🔵", 3: "🟠", 4: "🔴"}
    print(f"    Triage Level : {level_emojis.get(t_dec['level'], '⚪')} LEVEL {t_dec['level']} — {t_dec['category'].upper()}")
    print(f"    Clinical Rule: {t_dec['rule_id']}")
    print(f"    Reason       : {t_dec['reason']}")
    print(f"    Action       : {t_dec['recommended_action']}")

    print(f"\n[D] Spoken Voice Guidance (Text-to-Speech):")
    print(f"    Response: \"{result['voice_response_hi']}\"")
    if result.get("audio_data_base64"):
        print(f"    Audio   : Telephony WAV synthesized ({len(result['audio_data_base64'])} bytes base64)")

    print(f"\n[E] Community Health Escalation (ASHA & Follow-up):")
    print(f"    ASHA Alert Dispatched: {'✅ YES' if result['asha_alert_sent'] else '⚪ Not Required (Home Care)'}")
    if result["asha_alert_message"]:
        print(f"    ASHA SMS Preview:\n    ---\n    {result['asha_alert_message'].replace(chr(10), chr(10) + '    ')}\n    ---")
    print(f"    24-Hour Follow-up Scheduled: {'✅ YES' if result['followup_scheduled'] else '❌'}")

    print_header("CALL COMPLETE — RECORD STORED IN VAANIDOC DATABASE")
    db.close()

if __name__ == "__main__":
    scenario = 1
    if len(sys.argv) > 1:
        try:
            scenario = int(sys.argv[1])
        except ValueError:
            scenario = 1
    asyncio.run(run_demo(scenario))
