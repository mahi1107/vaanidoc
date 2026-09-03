import asyncio
import sys
import json
from backend.app.database.session import SessionLocal
from backend.app.services.call_orchestrator import CallOrchestrator

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

TEST_CASES = [
    ("TEST 1", "I have stomach pain since yesterday."),
    ("TEST 2", "Mujhe urine karte waqt jalan ho rahi hai."),
    ("TEST 3", "My left ear has been hurting since last night."),
    ("TEST 4", "Mujhe haath par red rash ho gaya hai aur bahut itching hai."),
    ("TEST 5", "I suddenly feel dizzy and my vision is blurry.")
]

async def run_tests():
    db = SessionLocal()
    try:
        orchestrator = CallOrchestrator(db)
        
        for name, utterance in TEST_CASES:
            call = await orchestrator.initialize_call(
                caller_phone="+91-98765-43210",
                provider="web",
                language="en",
                district="Varanasi",
                village="Rustampur",
                is_demo=False
            )
            
            res = await orchestrator.process_speech_input(
                call_id=call.id,
                speech_text=utterance
            )
            
            symptoms = res.get("extracted_symptoms", [])
            sym_list = []
            dur_list = []
            loc_list = []
            sev_list = []
            red_list = []
            
            for s in symptoms:
                sym_name = s.get("name")
                hindi_term = s.get("hindi_term", "")
                sym_list.append(f"{sym_name} ({hindi_term})")
                if s.get("duration_text"):
                    dur_list.append(s.get("duration_text"))
                if s.get("location"):
                    loc_list.append(s.get("location"))
                if s.get("severity"):
                    sev_list.append(f"{sym_name}: {s.get('severity')}")
                if s.get("is_red_flag"):
                    red_list.append(sym_name)
                    
            dur_display = ", ".join(set(dur_list)) if dur_list else "Not explicitly specified / ongoing"
            loc_display = ", ".join(set(loc_list)) if loc_list else "General / Not localized"
            sev_display = ", ".join(set(sev_list)) if sev_list else "moderate"
            red_display = ", ".join(set(red_list)) if red_list else "None detected"
            
            print(f"=== {name} ===")
            print(f"Actual transcript: \"{res['transcript']}\"")
            print(f"Detected language: {res['detected_language']} ({res.get('language_display', res['detected_language'])})")
            print(f"All symptoms: {', '.join(sym_list) if sym_list else 'None'}")
            print(f"Duration: {dur_display}")
            print(f"Body location: {loc_display}")
            print(f"Severity if actually stated: {sev_display}")
            print(f"Red flags: {red_display}")
            print(f"Whether clarification is needed: {'YES' if res['status'] == 'clarification_needed' else 'NO'}")
            print(f"Triage decision: Level {res['triage_decision']['level']} ({res['triage_decision']['category'].upper()}) — Rule: {res['triage_decision']['rule_id']} ({res['triage_decision']['reason']})")
            print(f"Patient-facing response: \"{res['voice_response']}\"")
            print("=" * 70)
            print()
            
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(run_tests())
