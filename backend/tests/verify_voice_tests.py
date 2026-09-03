import asyncio
import sys
from backend.app.database.session import SessionLocal
from backend.app.services.call_orchestrator import CallOrchestrator

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

async def run_test(name, speech):
    db = SessionLocal()
    try:
        orchestrator = CallOrchestrator(db)
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
            speech_text=speech
        )
        case_code = res.get("care_case", {}).get("case_code") if res.get("care_case") else res.get("case_code", "VD-N/A")
        print(f"=== {name} ===")
        print(f"Audio received: true")
        print(f"ASR transcript: \"{res['transcript']}\"")
        print(f"Detected language: {res['detected_language']}")
        print(f"Consultation ID: {res['call_id']}")
        print(f"Case ID: {case_code}")
        print(f"Triage Level: {res['triage_decision']['level']} ({res['triage_decision']['category']})")
        print(f"Voice Response: \"{res['voice_response'][:60]}...\"")
        print("=" * 40)
        print()
    finally:
        db.close()

async def main():
    await run_test("TEST 1 (English)", "I have fever for two days and I have a cold.")
    await run_test("TEST 2 (Hindi)", "मुझे दो दिन से बुखार है और सर्दी है।")
    await run_test("TEST 3 (Hinglish)", "Mujhe two days se fever hai aur cold bhi hai.")

if __name__ == "__main__":
    asyncio.run(main())
