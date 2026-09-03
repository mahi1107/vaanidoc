import asyncio
import sys
import json
from backend.app.database.session import SessionLocal
from backend.app.services.call_orchestrator import CallOrchestrator

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

TEST_CASES = [
    ("TEST 1", "मुझे 2 दिन से पेट दर्द हो रहा है।"),
    ("TEST 2", "I have a headache and feel dizzy since yesterday."),
    ("TEST 3", "Mujhe urine karte time burning hoti hai aur lower stomach mein pain hai."),
    ("TEST 4", "I have a skin rash on my arm and it is very itchy."),
    ("TEST 5", "Since this morning my vision is blurry and I feel weak.")
]

async def run_all_tests():
    db = SessionLocal()
    try:
        orchestrator = CallOrchestrator(db)
        
        for name, text in TEST_CASES:
            call = await orchestrator.initialize_call(
                caller_phone="+91-98765-43210",
                provider="web",
                language="hi",
                district="Varanasi",
                village="Rustampur",
                is_demo=False
            )
            
            res = await orchestrator.process_speech_input(
                call_id=call.id,
                speech_text=text
            )
            
            symptoms = res.get("extracted_symptoms", [])
            sym_list = [f"{s.get('name')} ({s.get('hindi_term', s.get('name'))})" for s in symptoms]
            duration_info = f"{symptoms[0].get('duration_val')} {symptoms[0].get('duration_unit')}" if symptoms and symptoms[0].get('duration_val') is not None else "Not specified / Immediate"
            
            print(f"=== {name} ===")
            print(f"Original transcript: {res['transcript']}")
            print(f"Detected language: {res['detected_language']}")
            print(f"All extracted symptoms: {', '.join(sym_list) if sym_list else 'None'}")
            print(f"Duration: {duration_info}")
            print(f"Other extracted context: age_group={res.get('extracted_age_group', 'adult')}, pregnant=False")
            print(f"Whether clarification is needed: {'YES' if res['status'] == 'clarification_needed' else 'NO'}")
            print(f"Triage/protocol decision: Level {res['triage_decision']['level']} ({res['triage_decision']['category']}) - Rule: {res['triage_decision']['rule_id']}")
            print(f"Final recommendation: {res['voice_response']}")
            print("-" * 60)
            print()
            
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(run_all_tests())
