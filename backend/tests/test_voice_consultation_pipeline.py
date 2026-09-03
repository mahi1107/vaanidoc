import pytest
import io
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.languages.detector import language_detector

client = TestClient(app)

def test_language_detection_precision():
    # 1. English User Prompt from bug report
    en_res = language_detector.detect("I have fever from 2 days and have cold. What should I do?")
    assert en_res["detected_language"] == "en"
    assert en_res["display_name"] == "English"

    # 2. English variant
    en_res2 = language_detector.detect("I have had fever for two days and I have a cold. What should I do?")
    assert en_res2["detected_language"] == "en"

    # 3. Pure Hindi prompt
    hi_res = language_detector.detect("मुझे दो दिन से बुखार है और सर्दी है, क्या करूँ?")
    assert hi_res["detected_language"] == "hi"

    # 4. Hinglish prompt
    hing_res = language_detector.detect("Mujhe two days se fever hai aur weakness ho rahi hai.")
    assert hing_res["detected_language"] == "hinglish"

def test_english_consultation_end_to_end():
    # User's exact test sentence: "I have fever from 2 days and have cold. What should I do?"
    payload = {
        "patient_speech": "I have fever from 2 days and have cold. What should I do?",
        "district": "Varanasi",
        "village": "Rustampur",
        "language": "en",
        "is_demo": False
    }
    response = client.post("/api/calls/consultation", json=payload)
    assert response.status_code == 200
    data = response.json()

    # 1. Transcript must match what the user said
    assert "fever" in data["transcript"].lower()
    assert "cold" in data["transcript"].lower()

    # 2. Language must be English
    assert data["detected_language"] == "en"

    # 3. Triage level must NOT be emergency (Level 4) or dyspnea/chest pain!
    assert data["triage_decision"]["level"] in [1, 2] # Home care or PHC follow-up
    symptom_names = [s.get("name") or s.get("symptom_name") for s in data["extracted_symptoms"]]
    assert "dyspnea" not in symptom_names
    assert "chest_pain" not in symptom_names

    # 4. Symptoms must identify fever and/or cold
    assert "fever" in symptom_names or "cold" in symptom_names

    # 5. Case code must be generated and valid
    assert data["case_code"].startswith("VD-")

    # 6. Recommendation must be present in English
    assert len(data["voice_response"]) > 20

def test_hindi_consultation_end_to_end():
    payload = {
        "patient_speech": "मुझे दो दिन से बुखार है और सर्दी है, क्या करूँ?",
        "district": "Gorakhpur",
        "village": "Sahjanwa",
        "language": "hi",
        "is_demo": False
    }
    response = client.post("/api/calls/consultation", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["detected_language"] == "hi"
    assert data["triage_decision"]["level"] in [1, 2]
    assert data["case_code"].startswith("VD-")
    symptom_names = [s.get("name") or s.get("symptom_name") for s in data["extracted_symptoms"]]
    assert "fever" in symptom_names or "cold" in symptom_names

def test_process_browser_audio_with_transcript():
    audio_content = b"RIFF....WAVEfmt ...."
    files = {"file": ("consultation.wav", io.BytesIO(audio_content), "audio/wav")}
    data = {
        "transcript": "I have headache and feeling feverish since yesterday",
        "district": "Varanasi",
        "age_group": "adult",
        "is_demo": "false"
    }
    response = client.post("/api/calls/process-audio", files=files, data=data)
    assert response.status_code == 200
    res_data = response.json()

    assert "headache" in res_data["transcript"].lower()
    assert res_data["detected_language"] == "en"
    assert res_data["case_code"].startswith("VD-")
