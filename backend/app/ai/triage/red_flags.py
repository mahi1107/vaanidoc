from typing import List, Optional, Tuple
from backend.app.ai.nlp.base import ExtractedSymptom

def evaluate_emergency_red_flags(
    symptoms: List[ExtractedSymptom],
    age_group: Optional[str] = None,
    is_pregnant: bool = False
) -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Evaluates symptoms for immediate Level 4 emergency red flags.
    Returns: (is_emergency, rule_id, emergency_reason)
    """
    active_symptoms = [s for s in symptoms if not s.is_negated]
    active_names = {s.name for s in active_symptoms}

    # 1. Severe respiratory distress
    if "dyspnea" in active_names:
        return True, "EMERG-RED-001", "गंभीर सांस लेने में तकलीफ (Severe Dyspnea)"

    # 2. Acute severe chest pain
    if "chest_pain" in active_names:
        return True, "EMERG-RED-002", "सीने में तेज दर्द / संभावित हृदय आपातकाल (Acute Chest Pain)"

    # 3. Altered mental status / Unconsciousness
    if "unconsciousness" in active_names:
        return True, "EMERG-RED-003", "बेहोशी या गंभीर मूर्छा (Altered Mental Status)"

    # 4. Severe hemorrhage / bleeding
    if "bleeding" in active_names:
        for s in active_symptoms:
            if s.name == "bleeding" and s.severity in ["severe", "moderate"]:
                return True, "EMERG-RED-004", "अत्यधिक रक्तस्राव (Severe Bleeding)"

    return False, None, None
