import asyncio
import sys
import json
import sqlite3
from backend.app.database.session import SessionLocal
from backend.app.services.call_orchestrator import CallOrchestrator
from backend.app.models import CallSession, CareCase, Alert, SymptomRecord

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

async def run_final_validation():
    db = SessionLocal()
    results = {}
    
    try:
        orchestrator = CallOrchestrator(db)
        
        # ══════════════════════════════════════════════════════════════
        # 1. OPEN-ENDED COMPLAINTS TEST
        # ══════════════════════════════════════════════════════════════
        open_ended_inputs = [
            ("OE-1", "My lower back has been hurting since yesterday."),
            ("OE-2", "I have a burning sensation in my throat when I swallow."),
            ("OE-3", "My ankle is swollen after I fell."),
            ("OE-4", "I have been feeling unusually tired for the past week."),
            ("OE-5", "There is a painful lump on my neck."),
            ("OE-6", "Mujhe subah se aankhon mein jalan aur paani aa raha hai."),
            ("OE-7", "Mujhe raat se kamar mein dard hai aur chalne mein dikkat ho rahi hai.")
        ]
        
        oe_passed = True
        print("\n" + "="*80)
        print("1. OPEN-ENDED COMPLAINTS VALIDATION")
        print("="*80)
        for code, text in open_ended_inputs:
            call = await orchestrator.initialize_call(caller_phone="+91-98765-43210", provider="web", language="en")
            res = await orchestrator.process_speech_input(call_id=call.id, speech_text=text)
            symptoms = res.get("extracted_symptoms", [])
            sym_names = [s.get("name") for s in symptoms]
            
            print(f"[{code}] Transcript: \"{text}\"")
            print(f"       Language: {res['detected_language']} | Status: {res['status']}")
            print(f"       Symptoms: {', '.join(sym_names) or 'General'}")
            print(f"       Response: \"{res['voice_response']}\"")
            print("-" * 70)
            if not symptoms and res['status'] != 'clarification_needed':
                oe_passed = False
        results["open_ended"] = "PASS" if oe_passed else "FAIL"

        # ══════════════════════════════════════════════════════════════
        # 2. UNKNOWN / AMBIGUOUS INPUT TEST
        # ══════════════════════════════════════════════════════════════
        print("\n" + "="*80)
        print("2. UNKNOWN / AMBIGUOUS INPUT TEST")
        print("="*80)
        ambig_text = "I don't feel right and something has been bothering me."
        call_ambig = await orchestrator.initialize_call(caller_phone="+91-98765-43210", provider="web", language="en")
        res_ambig = await orchestrator.process_speech_input(call_id=call_ambig.id, speech_text=ambig_text)
        print(f"Transcript: \"{ambig_text}\"")
        print(f"Status: {res_ambig['status']}")
        print(f"Extracted Symptoms: {res_ambig['extracted_symptoms']}")
        print(f"Clarification Prompt: \"{res_ambig['voice_response']}\"")
        
        ambig_pass = (res_ambig['status'] == "clarification_needed" and len(res_ambig['extracted_symptoms']) == 0)
        results["unknown_complaints"] = "PASS" if ambig_pass else "FAIL"
        print(f"Unknown Input Result: {results['unknown_complaints']}")

        # ══════════════════════════════════════════════════════════════
        # 3. FOLLOW-UP QUESTION TEST
        # ══════════════════════════════════════════════════════════════
        print("\n" + "="*80)
        print("3. FOLLOW-UP QUESTION TEST (INCOMPLETE COMPLAINT)")
        print("="*80)
        incompl_text = "My stomach hurts."
        call_incompl = await orchestrator.initialize_call(caller_phone="+91-98765-43210", provider="web", language="en")
        res_incompl = await orchestrator.process_speech_input(call_id=call_incompl.id, speech_text=incompl_text)
        print(f"Transcript: \"{incompl_text}\"")
        print(f"Status: {res_incompl['status']}")
        print(f"Clarification Prompt: \"{res_incompl['voice_response']}\"")
        
        followup_pass = (res_incompl['status'] == "clarification_needed" and "Could you please specify" in res_incompl['voice_response'])
        results["followup_questions"] = "PASS" if followup_pass else "FAIL"
        print(f"Follow-up Question Result: {results['followup_questions']}")

        # ══════════════════════════════════════════════════════════════
        # 4. MULTI-SYMPTOM TEST
        # ══════════════════════════════════════════════════════════════
        print("\n" + "="*80)
        print("4. MULTI-SYMPTOM TEST")
        print("="*80)
        multi_text = "I have fever, vomiting, stomach pain and I feel very weak."
        call_multi = await orchestrator.initialize_call(caller_phone="+91-98765-43210", provider="web", language="en")
        res_multi = await orchestrator.process_speech_input(call_id=call_multi.id, speech_text=multi_text)
        multi_syms = {s.get("name") for s in res_multi.get("extracted_symptoms", [])}
        print(f"Transcript: \"{multi_text}\"")
        print(f"Extracted Symptoms: {multi_syms}")
        
        expected_syms = {"fever", "vomiting", "abdominal_pain", "weakness"}
        multi_pass = expected_syms.issubset(multi_syms)
        results["multi_symptom"] = "PASS" if multi_pass else "FAIL"
        print(f"Multi-symptom Result: {results['multi_symptom']} (Found: {multi_syms})")

        # ══════════════════════════════════════════════════════════════
        # 5. LANGUAGE DETECTION TEST
        # ══════════════════════════════════════════════════════════════
        print("\n" + "="*80)
        print("5. LANGUAGE TEST")
        print("="*80)
        call_en = await orchestrator.initialize_call(caller_phone="+91-98765-43210", provider="web", language="hi") # deliberately pass dummy init lang
        res_en = await orchestrator.process_speech_input(call_id=call_en.id, speech_text="I have stomach pain for two days.")
        
        call_hi = await orchestrator.initialize_call(caller_phone="+91-98765-43210", provider="web", language="en")
        res_hi = await orchestrator.process_speech_input(call_id=call_hi.id, speech_text="मुझे दो दिन से पेट दर्द हो रहा है।")
        
        call_hinglish = await orchestrator.initialize_call(caller_phone="+91-98765-43210", provider="web", language="en")
        res_hinglish = await orchestrator.process_speech_input(call_id=call_hinglish.id, speech_text="Mujhe two days se stomach pain ho raha hai.")
        
        results["english"] = "PASS" if res_en["detected_language"] == "en" else "FAIL"
        results["hindi"] = "PASS" if res_hi["detected_language"] == "hi" else "FAIL"
        results["hinglish"] = "PASS" if res_hinglish["detected_language"] == "hinglish" else "FAIL"
        print(f"English: {res_en['detected_language']} -> {results['english']}")
        print(f"Hindi: {res_hi['detected_language']} -> {results['hindi']}")
        print(f"Hinglish: {res_hinglish['detected_language']} -> {results['hinglish']}")

        # ══════════════════════════════════════════════════════════════
        # 6. CONSULTATION ISOLATION TEST
        # ══════════════════════════════════════════════════════════════
        print("\n" + "="*80)
        print("6. CONSULTATION ISOLATION TEST")
        print("="*80)
        call_A = await orchestrator.initialize_call(caller_phone="+91-98765-11111", provider="web", language="en")
        res_A = await orchestrator.process_speech_input(call_id=call_A.id, speech_text="My left ear has been hurting since last night.")
        
        call_B = await orchestrator.initialize_call(caller_phone="+91-98765-22222", provider="web", language="en")
        res_B = await orchestrator.process_speech_input(call_id=call_B.id, speech_text="Mujhe haath par red rash ho gaya hai.")
        
        isolation_pass = (
            call_A.id != call_B.id and
            res_A.get("case_code") != res_B.get("case_code") and
            res_A["transcript"] != res_B["transcript"] and
            res_A["extracted_symptoms"] != res_B["extracted_symptoms"] and
            res_A["detected_language"] != res_B["detected_language"]
        )
        results["isolation"] = "PASS" if isolation_pass else "FAIL"
        print(f"Consultation A: ID={call_A.id[:8]}, Case={res_A.get('case_code')}, Lang={res_A['detected_language']}, Symptoms={[s['name'] for s in res_A['extracted_symptoms']]}")
        print(f"Consultation B: ID={call_B.id[:8]}, Case={res_B.get('case_code')}, Lang={res_B['detected_language']}, Symptoms={[s['name'] for s in res_B['extracted_symptoms']]}")
        print(f"Isolation Result: {results['isolation']}")

        # ══════════════════════════════════════════════════════════════
        # 7. ASHA NOTIFICATION INTEGRITY
        # ══════════════════════════════════════════════════════════════
        print("\n" + "="*80)
        print("7. ASHA NOTIFICATION INTEGRITY TEST")
        print("="*80)
        alert_rec = db.query(Alert).filter(Alert.call_session_id == call_A.id).first()
        asha_pass = (alert_rec is not None and res_A["asha_alert_sent"] == True)
        results["asha_integrity"] = "PASS" if asha_pass else "FAIL"
        print(f"ASHA Alert in DB for Call A: ID={alert_rec.id if alert_rec else None}, Status={alert_rec.status if alert_rec else 'None'}")
        print(f"ASHA Notification Integrity: {results['asha_integrity']}")

        # ══════════════════════════════════════════════════════════════
        # 8. NO INVENTED INFORMATION
        # ══════════════════════════════════════════════════════════════
        print("\n" + "="*80)
        print("8. NO INVENTED INFORMATION CHECK")
        print("="*80)
        no_invented_pass = True
        # For stomach pain, verify fever/vomiting/cough are NOT present
        sym_names_A = [s["name"] for s in res_A["extracted_symptoms"]]
        if any(unrelated in sym_names_A for unrelated in ["fever", "cough", "vomiting", "diarrhea"]):
            no_invented_pass = False
        results["no_invented"] = "PASS" if no_invented_pass else "FAIL"
        print(f"No Invented Information: {results['no_invented']}")

        # ══════════════════════════════════════════════════════════════
        # FINAL REPORT SUMMARY
        # ══════════════════════════════════════════════════════════════
        all_passed = all(v == "PASS" for v in results.values())
        print("\n" + "="*80)
        print(f"FINAL VALIDATION STATUS: {'PASS' if all_passed else 'FAIL'}")
        print("="*80)
        for k, v in results.items():
            print(f"  {k}: {v}")
            
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(run_final_validation())
