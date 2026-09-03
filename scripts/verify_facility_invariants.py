import sys
import os
import asyncio

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app.database.session import SessionLocal
from backend.app.services.facility_service import FacilityService
from backend.app.services.call_orchestrator import CallOrchestrator
from backend.app.ai.tts import MockTTSService

async def run_tests():
    db = SessionLocal()
    fac_service = FacilityService(db)
    fac_service.seed_initial_facilities()
    orchestrator = CallOrchestrator(db)
    orchestrator.tts = MockTTSService()

    tests = [
        {"desc": "Test 1: Vadodara Selection", "district": "Vadodara", "expected_district": "Vadodara"},
        {"desc": "Test 2: Varanasi Selection", "district": "Varanasi", "expected_district": "Varanasi"},
        {"desc": "Test 3: Change Varanasi -> Vadodara", "district": "Vadodara", "expected_district": "Vadodara"},
        {"desc": "Test 4: Change Vadodara -> Pune", "district": "Pune", "expected_district": "Pune"},
        {"desc": "Test 5: Change Pune -> Ahmedabad", "district": "Ahmedabad", "expected_district": "Ahmedabad"},
        {"desc": "Test 6: Change Ahmedabad -> New Delhi", "district": "New Delhi", "expected_district": "New Delhi"},
        {"desc": "Test 7: Unconfigured District (Alappuzha)", "district": "Alappuzha", "expected_district": None}
    ]

    print("================================================================================")
    print("HEALTHCARE FACILITY DISTRICT INVARIANT VERIFICATION REPORT")
    print("Invariant: selected district == facility district")
    print("================================================================================\n")

    all_passed = True

    for t in tests:
        dist = t["district"]
        print(f"--- {t['desc']} ---")
        
        # 1. Facility Service direct test
        fac_obj = fac_service.get_recommended_facility(triage_level=2, district=dist)
        
        # 2. End-to-end CallOrchestrator test
        call = await orchestrator.initialize_call(
            caller_phone="+91-98765-43210",
            provider="web",
            language="en",
            district=dist,
            village="Central Block",
            is_demo=False
        )
        res = await orchestrator.process_speech_input(
            call_id=call.id,
            speech_text="I have fever and headache for two days."
        )
        
        fac_rec = res.get("recommended_facility")
        
        stored_district = fac_obj.district if fac_obj else "None"
        returned_name = fac_rec.get("name") if fac_rec else "None"
        returned_dist = fac_rec.get("district") if fac_rec else "None"
        
        displayed_text = returned_name if fac_rec else f"No configured healthcare facility found in {dist}."
        
        print(f"selected district                 -> {dist}")
        print(f"backend received district         -> {call.patient.district}")
        print(f"facility returned                 -> {returned_name}")
        print(f"facility's actual stored district -> {stored_district}")
        print(f"displayed facility                -> {displayed_text}")
        
        if t["expected_district"] is not None:
            if not fac_rec:
                print(f"RESULT: FAILED - Expected facility in {t['expected_district']}, but got None")
                all_passed = False
            elif fac_rec["district"].strip().lower() != t["expected_district"].lower():
                print(f"RESULT: FAILED - Invariant violation! Facility district {fac_rec['district']} != {t['expected_district']}")
                all_passed = False
            else:
                print(f"RESULT: PASSED (Invariant satisfied: {dist} == {fac_rec['district']})\n")
        else:
            if fac_rec is not None:
                print(f"RESULT: FAILED - Expected None for unconfigured district, but got {fac_rec['name']} in {fac_rec['district']}")
                all_passed = False
            else:
                print(f"RESULT: PASSED (Correctly rejected/returned None without substituting another district)\n")

    print("================================================================================")
    if all_passed:
        print("ALL DISTRICT FACILITY INVARIANT TESTS PASSED WITH 100% DISTRICT ACCURACY!")
    else:
        print("SOME TESTS FAILED.")
    print("================================================================================")

if __name__ == "__main__":
    asyncio.run(run_tests())
