from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from backend.app.ai.nlp.base import ExtractedSymptom, ClinicalExtractionResult
from backend.app.ai.triage.protocols import CLINICAL_PROTOCOLS_CATALOG, get_protocol_by_id, ClinicalProtocol
from backend.app.ai.triage.red_flags import evaluate_emergency_red_flags
from backend.app.ai.triage.response_generator import HealthResponseGenerator
from backend.app.utils.logger import logger

class TriageDecision(BaseModel):
    level: int  # 1 (Home Care), 2 (PHC), 3 (Hospital), 4 (Emergency)
    category: str # home_care, phc, hospital, emergency
    rule_id: str
    reason: str
    recommended_action: str
    voice_guidance_text: str
    urgency: str
    confidence: float = 1.0
    protocol: Optional[ClinicalProtocol] = None

class TriageEngine:
    """
    Deterministic clinical triage decision engine adhering to WHO IMCI & ICMR guidelines.
    Evaluates open-ended symptoms, checks emergency red flags, applies configured protocols,
    and returns patient-calibrated clinical guidance.
    """
    def __init__(self):
        self.response_gen = HealthResponseGenerator()

    def evaluate(
        self,
        extraction_result: ClinicalExtractionResult,
        language: str = "hi"
    ) -> TriageDecision:
        symptoms = extraction_result.symptoms
        active_symptoms = [s for s in symptoms if not s.is_negated]
        age_group = extraction_result.age_group
        is_pregnant = extraction_result.is_pregnant
        red_flags = extraction_result.detected_red_flags
        body_locations = extraction_result.body_locations
        summary = extraction_result.patient_facing_summary
        
        logger.info(f"[TriageEngine] Evaluating {len(active_symptoms)} active symptoms for age={age_group}, pregnant={is_pregnant}")

        # 1. Step 1: Emergency Red Flag Detection (LEVEL 4)
        is_emergency, emerg_rule_id, emerg_reason = evaluate_emergency_red_flags(
            active_symptoms, age_group=age_group, is_pregnant=is_pregnant
        )
        if is_emergency:
            proto = get_protocol_by_id(emerg_rule_id)
            voice_text = self.response_gen.generate_response(
                4, emerg_rule_id, active_symptoms, summary, language=language,
                age_group=age_group, is_pregnant=is_pregnant, body_locations=body_locations
            )
            return TriageDecision(
                level=4,
                category="emergency",
                rule_id=emerg_rule_id,
                reason=emerg_reason or proto.condition_description,
                recommended_action=proto.action_guidance_hi if language == "hi" else proto.action_guidance_en,
                voice_guidance_text=voice_text,
                urgency=proto.urgency,
                confidence=0.98,
                protocol=proto
            )

        # 2. Step 2: Acute Neurological / Sudden Sensory Event (LEVEL 3)
        if "acute_neurological_event" in red_flags or any(s.onset == "sudden" and s.name in ["dizziness", "blurred_vision"] for s in active_symptoms):
            proto = get_protocol_by_id("HOSP-NEURO-001")
            voice_text = self.response_gen.generate_response(
                3, "HOSP-NEURO-001", active_symptoms, summary, language=language,
                age_group=age_group, is_pregnant=is_pregnant, body_locations=body_locations
            )
            return TriageDecision(
                level=3,
                category="hospital",
                rule_id="HOSP-NEURO-001",
                reason="अचानक चक्कर और आंखों में धुंधलापन (Acute Sudden Dizziness & Vision Disturbance)",
                recommended_action=proto.action_guidance_hi if language == "hi" else proto.action_guidance_en,
                voice_guidance_text=voice_text,
                urgency="within_24h",
                confidence=0.94,
                protocol=proto
            )

        # 3. Step 3: Maternal Health Warning (LEVEL 3)
        if is_pregnant and active_symptoms:
            proto = get_protocol_by_id("HOSP-MAT-001")
            voice_text = self.response_gen.generate_response(
                3, "HOSP-MAT-001", active_symptoms, summary, language=language,
                age_group=age_group, is_pregnant=is_pregnant, body_locations=body_locations
            )
            return TriageDecision(
                level=3,
                category="hospital",
                rule_id="HOSP-MAT-001",
                reason="गर्भावस्था के दौरान जटिलता या बुखार/दर्द के लक्षण (Maternal Health Warning)",
                recommended_action=proto.action_guidance_hi if language == "hi" else proto.action_guidance_en,
                voice_guidance_text=voice_text,
                urgency="within_24h",
                confidence=0.95,
                protocol=proto
            )

        # 4. Step 4: Pediatric High Risk / Dehydration (LEVEL 3)
        if age_group == "child":
            vomit_or_diarrhea = any(s.name in ["vomiting", "diarrhea"] for s in active_symptoms)
            child_fever = next((s for s in active_symptoms if s.name == "fever"), None)
            if vomit_or_diarrhea:
                proto = get_protocol_by_id("HOSP-PED-001")
                voice_text = self.response_gen.generate_response(
                    3, "HOSP-PED-001", active_symptoms, summary, language=language,
                    age_group=age_group, is_pregnant=is_pregnant, body_locations=body_locations
                )
                return TriageDecision(
                    level=3,
                    category="hospital",
                    rule_id="HOSP-PED-001",
                    reason="बच्चे में दस्त/उल्टी से गंभीर डिहाइड्रेशन का जोखिम (Pediatric Dehydration)",
                    recommended_action=proto.action_guidance_hi if language == "hi" else proto.action_guidance_en,
                    voice_guidance_text=voice_text,
                    urgency="within_24h",
                    confidence=0.95,
                    protocol=proto
                )
            if child_fever and (child_fever.duration_val and child_fever.duration_val >= 3 or child_fever.severity == "severe"):
                proto = get_protocol_by_id("HOSP-FEV-001")
                voice_text = self.response_gen.generate_response(
                    3, "HOSP-FEV-001", active_symptoms, summary, language=language,
                    age_group=age_group, is_pregnant=is_pregnant, body_locations=body_locations
                )
                return TriageDecision(
                    level=3,
                    category="hospital",
                    rule_id="HOSP-FEV-001",
                    reason="बच्चे में 3+ दिन से बुखार (Pediatric Persistent Fever)",
                    recommended_action=proto.action_guidance_hi if language == "hi" else proto.action_guidance_en,
                    voice_guidance_text=voice_text,
                    urgency="within_24h",
                    confidence=0.92,
                    protocol=proto
                )

        # 5. Step 5: High Grade / Prolonged Fever (LEVEL 3)
        fever_sym = next((s for s in active_symptoms if s.name == "fever"), None)
        if fever_sym:
            if (fever_sym.duration_val and fever_sym.duration_val >= 5) or fever_sym.severity == "severe":
                proto = get_protocol_by_id("HOSP-FEV-001")
                voice_text = self.response_gen.generate_response(
                    3, "HOSP-FEV-001", active_symptoms, summary, language=language,
                    age_group=age_group, is_pregnant=is_pregnant, body_locations=body_locations
                )
                return TriageDecision(
                    level=3,
                    category="hospital",
                    rule_id="HOSP-FEV-001",
                    reason="5 दिन या उससे अधिक समय से तेज बुखार (Prolonged/High-Grade Fever)",
                    recommended_action=proto.action_guidance_hi if language == "hi" else proto.action_guidance_en,
                    voice_guidance_text=voice_text,
                    urgency="within_24h",
                    confidence=0.94,
                    protocol=proto
                )

        # 6. Step 6: Specialized Primary Health Centre (PHC) Protocols (LEVEL 2)
        # 6a. Abdominal / Stomach Pain
        abd_sym = next((s for s in active_symptoms if s.name in ["abdominal_pain", "stomach_pain"]), None)
        if abd_sym:
            proto = get_protocol_by_id("PHC-ABD-001")
            voice_text = self.response_gen.generate_response(
                2, "PHC-ABD-001", active_symptoms, summary, language=language,
                age_group=age_group, is_pregnant=is_pregnant, body_locations=body_locations
            )
            return TriageDecision(
                level=2,
                category="phc",
                rule_id="PHC-ABD-001",
                reason="पेट में दर्द / पेट से संबंधित तकलीफ (Abdominal Pain Evaluation)",
                recommended_action=proto.action_guidance_hi if language == "hi" else proto.action_guidance_en,
                voice_guidance_text=voice_text,
                urgency="within_48h",
                confidence=0.92,
                protocol=proto
            )

        # 6b. Genitourinary / Urinary Burning (Dysuria)
        uti_sym = next((s for s in active_symptoms if s.name in ["burning_urination", "painful_urination"]), None)
        if uti_sym:
            proto = get_protocol_by_id("PHC-UTI-001")
            voice_text = self.response_gen.generate_response(
                2, "PHC-UTI-001", active_symptoms, summary, language=language,
                age_group=age_group, is_pregnant=is_pregnant, body_locations=body_locations
            )
            return TriageDecision(
                level=2,
                category="phc",
                rule_id="PHC-UTI-001",
                reason="पेशाब में जलन / संभावित मूत्र संक्रमण (Dysuria / Urinary Evaluation)",
                recommended_action=proto.action_guidance_hi if language == "hi" else proto.action_guidance_en,
                voice_guidance_text=voice_text,
                urgency="within_48h",
                confidence=0.92,
                protocol=proto
            )

        # 6c. ENT / Ear Pain (Otalgia)
        ent_sym = next((s for s in active_symptoms if s.name in ["ear_pain", "ear_hurting"]), None)
        if ent_sym:
            proto = get_protocol_by_id("PHC-ENT-001")
            voice_text = self.response_gen.generate_response(
                2, "PHC-ENT-001", active_symptoms, summary, language=language,
                age_group=age_group, is_pregnant=is_pregnant, body_locations=body_locations
            )
            return TriageDecision(
                level=2,
                category="phc",
                rule_id="PHC-ENT-001",
                reason="कान में दर्द / कान की जांच (Otalgia / Ear Pain Evaluation)",
                recommended_action=proto.action_guidance_hi if language == "hi" else proto.action_guidance_en,
                voice_guidance_text=voice_text,
                urgency="within_48h",
                confidence=0.92,
                protocol=proto
            )

        # 6d. Dermatology / Rash & Itching
        derm_sym = next((s for s in active_symptoms if s.name in ["skin_rash", "itching", "arm_rash"]), None)
        if derm_sym:
            proto = get_protocol_by_id("PHC-DERM-001")
            voice_text = self.response_gen.generate_response(
                2, "PHC-DERM-001", active_symptoms, summary, language=language,
                age_group=age_group, is_pregnant=is_pregnant, body_locations=body_locations
            )
            return TriageDecision(
                level=2,
                category="phc",
                rule_id="PHC-DERM-001",
                reason="त्वचा पर चकत्ते और खुजली (Dermatological Rash & Itching Protocol)",
                recommended_action=proto.action_guidance_hi if language == "hi" else proto.action_guidance_en,
                voice_guidance_text=voice_text,
                urgency="within_48h",
                confidence=0.92,
                protocol=proto
            )

        # 6e. Moderate fever / headache
        if fever_sym and (fever_sym.duration_val is None or fever_sym.duration_val >= 2):
            proto = get_protocol_by_id("PHC-FEV-001")
            voice_text = self.response_gen.generate_response(
                2, "PHC-FEV-001", active_symptoms, summary, language=language,
                age_group=age_group, is_pregnant=is_pregnant, body_locations=body_locations
            )
            return TriageDecision(
                level=2,
                category="phc",
                rule_id="PHC-FEV-001",
                reason="2 से 4 दिन का बुखार या सिर दर्द (Moderate Fever / PHC Evaluation)",
                recommended_action=proto.action_guidance_hi if language == "hi" else proto.action_guidance_en,
                voice_guidance_text=voice_text,
                urgency="within_48h",
                confidence=0.90,
                protocol=proto
            )

        # 6f. Persistent Cough
        cough_sym = next((s for s in active_symptoms if s.name == "cough"), None)
        if cough_sym and (cough_sym.duration_val and cough_sym.duration_val >= 3 or cough_sym.severity in ["severe", "moderate"]):
            proto = get_protocol_by_id("PHC-URI-001")
            voice_text = self.response_gen.generate_response(
                2, "PHC-URI-001", active_symptoms, summary, language=language,
                age_group=age_group, is_pregnant=is_pregnant, body_locations=body_locations
            )
            return TriageDecision(
                level=2,
                category="phc",
                rule_id="PHC-URI-001",
                reason="लगातार खांसी या सीने में कफ (Persistent Cough)",
                recommended_action=proto.action_guidance_hi if language == "hi" else proto.action_guidance_en,
                voice_guidance_text=voice_text,
                urgency="within_48h",
                confidence=0.88,
                protocol=proto
            )

        # 6g. Diarrhea / Vomiting
        gi_sym = next((s for s in active_symptoms if s.name in ["diarrhea", "vomiting"]), None)
        if gi_sym:
            proto = get_protocol_by_id("PHC-GI-001")
            voice_text = self.response_gen.generate_response(
                2, "PHC-GI-001", active_symptoms, summary, language=language,
                age_group=age_group, is_pregnant=is_pregnant, body_locations=body_locations
            )
            return TriageDecision(
                level=2,
                category="phc",
                rule_id="PHC-GI-001",
                reason="दस्त या उल्टी के लक्षण (Gastrointestinal Symptoms)",
                recommended_action=proto.action_guidance_hi if language == "hi" else proto.action_guidance_en,
                voice_guidance_text=voice_text,
                urgency="within_48h",
                confidence=0.88,
                protocol=proto
            )

        # 7. Step 7: Home Care / Self-Care (LEVEL 1)
        if len(active_symptoms) == 1:
            sym = active_symptoms[0]
            if sym.name in ["cough", "body_ache", "weakness"] or (sym.name == "fever" and sym.duration_val in [0, 1] and sym.severity == "mild"):
                proto = get_protocol_by_id("HOME-COLD-001") if sym.name in ["cough", "fever"] else get_protocol_by_id("HOME-ACHE-001")
                voice_text = self.response_gen.generate_response(
                    1, proto.rule_id, active_symptoms, summary, language=language,
                    age_group=age_group, is_pregnant=is_pregnant, body_locations=body_locations
                )
                return TriageDecision(
                    level=1,
                    category="home_care",
                    rule_id=proto.rule_id,
                    reason="हल्के मौसमी लक्षण या थकान (Mild Symptoms / Self Care)",
                    recommended_action=proto.action_guidance_hi if language == "hi" else proto.action_guidance_en,
                    voice_guidance_text=voice_text,
                    urgency="routine",
                    confidence=0.85,
                    protocol=proto
                )

        # 8. Step 8: Safe Escalation / Fallback (LEVEL 2)
        proto = get_protocol_by_id("FALLBACK-SAFE-001")
        voice_text = self.response_gen.generate_response(
            2, "FALLBACK-SAFE-001", active_symptoms, summary, language=language,
            age_group=age_group, is_pregnant=is_pregnant, body_locations=body_locations
        )
        return TriageDecision(
            level=2,
            category="phc",
            rule_id="FALLBACK-SAFE-001",
            reason="सुरक्षात्मक परामर्श: लक्षणों की पुष्टि हेतु पीएचसी जांच अनुशंसित (Conservative Clinical Fallback)",
            recommended_action=proto.action_guidance_hi if language == "hi" else proto.action_guidance_en,
            voice_guidance_text=voice_text,
            urgency="within_48h",
            confidence=0.75,
            protocol=proto
        )
