import asyncio
import sys
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database.session import SessionLocal
from backend.app.models import AdminUser, Patient, CareCase, CallSession

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

def test_patient_isolation_flow():
    client = TestClient(app)
    
    # ── Setup phone numbers ──────────────────────────────────────────
    phone_a = "9876500001"
    phone_b = "9876500002"
    
    print("=" * 80)
    print("RUNNING PATIENT DATA ISOLATION VERIFICATION SEQUENCE")
    print("=" * 80)

    # 1. Login as Patient A
    print("\n[Step 1] Register/Login as Patient A (Phone: " + phone_a + ")")
    res_a = client.post("/api/auth/patient-register", json={
        "phone_number": phone_a,
        "full_name": "Patient Alpha",
        "district": "Varanasi",
        "village": "Rustampur",
        "password": "patient123"
    })
    assert res_a.status_code == 200, f"Patient A register failed: {res_a.text}"
    token_a = res_a.json()["access_token"]
    user_a = res_a.json()["user"]
    print(f"-> Patient A Token generated. Patient ID: {user_a.get('patient_id')}")

    # Verify /api/auth/me returns patient_id
    me_a = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token_a}"})
    assert me_a.status_code == 200
    assert me_a.json()["patient_id"] == user_a["patient_id"], "UserProfile missing patient_id"
    print(f"-> /api/auth/me verified: {me_a.json()['patient_id']}")

    # 2. Create a case for Patient A
    print("\n[Step 2] Create voice consultation case for Patient A")
    consult_res_a = client.post(
        "/api/calls/consultation",
        json={
            "patient_speech": "I have high fever and severe headache since yesterday.",
            "district": "Varanasi",
            "caller_phone": phone_a,
            "language": "en"
        },
        headers={"Authorization": f"Bearer {token_a}"}
    )
    assert consult_res_a.status_code == 200, f"Consultation failed: {consult_res_a.text}"
    case_code_a = consult_res_a.json()["case_code"]
    print(f"-> Case created for Patient A: {case_code_a}")

    # 3. Confirm Patient A can see it in My Care
    print("\n[Step 3] Confirm Patient A can see their case in My Care (/api/cases/patient/my-cases)")
    my_cases_a = client.get("/api/cases/patient/my-cases", headers={"Authorization": f"Bearer {token_a}"})
    assert my_cases_a.status_code == 200
    cases_a_list = my_cases_a.json()
    codes_a = [c["case_code"] for c in cases_a_list]
    print(f"-> Patient A cases in My Care: {codes_a}")
    assert case_code_a in codes_a, f"Patient A case {case_code_a} not found in {codes_a}"

    # 4. Logout (simulating client-side clearing token & session)
    print("\n[Step 4] Logout Patient A")
    print("-> Cleared tokens and session state.")

    # 5. Confirm logged-out user cannot access Patient A's private cases
    print("\n[Step 5] Confirm logged-out user CANNOT access Patient A's private cases")
    unauth_res = client.get("/api/cases/patient/my-cases")
    assert unauth_res.status_code == 200
    unauth_cases = unauth_res.json()
    print(f"-> Logged-out My Care cases returned: {unauth_cases}")
    assert len(unauth_cases) == 0, f"Expected empty list for logged-out user, got {unauth_cases}"

    # Also confirm query param patient_id cannot be abused by unauthenticated user
    unauth_param_res = client.get(f"/api/cases/patient/my-cases?patient_id={user_a.get('patient_id')}")
    assert unauth_param_res.status_code == 200
    assert len(unauth_param_res.json()) == 0, f"Unauthenticated request accessed private cases: {unauth_param_res.json()}"
    print("-> Unauthenticated patient_id query param spoofing rejected (returned 0 cases).")

    # 6. Login as Patient B
    print("\n[Step 6] Register/Login as Patient B (Phone: " + phone_b + ")")
    res_b = client.post("/api/auth/patient-register", json={
        "phone_number": phone_b,
        "full_name": "Patient Beta",
        "district": "Varanasi",
        "village": "Local Area",
        "password": "patient123"
    })
    assert res_b.status_code == 200, f"Patient B register failed: {res_b.text}"
    token_b = res_b.json()["access_token"]
    user_b = res_b.json()["user"]
    print(f"-> Patient B Token generated. Patient ID: {user_b.get('patient_id')}")
    assert user_b.get("patient_id") != user_a.get("patient_id"), "Patient A and B have duplicate Patient IDs!"

    # 7. Confirm Patient B sees ONLY Patient B's cases (none of Patient A's cases)
    print("\n[Step 7] Confirm Patient B sees ONLY Patient B's cases")
    my_cases_b = client.get("/api/cases/patient/my-cases", headers={"Authorization": f"Bearer {token_b}"})
    assert my_cases_b.status_code == 200
    codes_b = [c["case_code"] for c in my_cases_b.json()]
    print(f"-> Patient B initial cases in My Care: {codes_b}")
    assert case_code_a not in codes_b, f"Patient B leaked Patient A's case {case_code_a}!"

    # Create a case for Patient B
    consult_res_b = client.post(
        "/api/calls/consultation",
        json={
            "patient_speech": "I have a cough and throat irritation.",
            "district": "Varanasi",
            "caller_phone": phone_b,
            "language": "en"
        },
        headers={"Authorization": f"Bearer {token_b}"}
    )
    assert consult_res_b.status_code == 200
    case_code_b = consult_res_b.json()["case_code"]
    print(f"-> Created case for Patient B: {case_code_b}")

    my_cases_b_after = client.get("/api/cases/patient/my-cases", headers={"Authorization": f"Bearer {token_b}"})
    codes_b_after = [c["case_code"] for c in my_cases_b_after.json()]
    print(f"-> Patient B cases in My Care now: {codes_b_after}")
    assert case_code_b in codes_b_after
    assert case_code_a not in codes_b_after, f"Patient B leaked Patient A's case {case_code_a}!"

    # 8. Logout Patient B and login again as Patient A
    print("\n[Step 8] Logout Patient B and login again as Patient A")
    res_a_login = client.post("/api/auth/patient-login", json={
        "phone_number": phone_a,
        "password": "patient123"
    })
    assert res_a_login.status_code == 200
    token_a_new = res_a_login.json()["access_token"]

    # 9. Confirm Patient A's own cases are restored correctly
    print("\n[Step 9] Confirm Patient A's own cases are restored correctly")
    my_cases_a_restored = client.get("/api/cases/patient/my-cases", headers={"Authorization": f"Bearer {token_a_new}"})
    assert my_cases_a_restored.status_code == 200
    codes_a_restored = [c["case_code"] for c in my_cases_a_restored.json()]
    print(f"-> Patient A restored cases in My Care: {codes_a_restored}")
    assert case_code_a in codes_a_restored, f"Patient A case {case_code_a} missing!"
    assert case_code_b not in codes_a_restored, f"Patient A leaked Patient B's case {case_code_b}!"

    print("\n" + "=" * 80)
    print("ALL 9 ISOLATION AND AUTHENTICATION STEPS PASSED SUCCESSFULLY!")
    print("=" * 80)

if __name__ == "__main__":
    test_patient_isolation_flow()
