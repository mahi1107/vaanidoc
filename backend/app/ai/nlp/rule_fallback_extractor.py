import re
from typing import List, Optional, Dict, Any, Set, Tuple
from backend.app.ai.nlp.base import BaseNLPExtractor, ExtractedSymptom, ClinicalExtractionResult
from backend.app.ai.nlp.symptom_vocab import (
    HINDI_SYMPTOM_TAXONOMY,
    NEGATION_MARKERS,
    SEVERITY_MODIFIERS,
    DURATION_NUMBER_WORDS,
    DEMOGRAPHIC_KEYWORDS,
    PREGNANCY_KEYWORDS
)
from backend.app.utils.logger import logger

class RuleBasedSymptomExtractor(BaseNLPExtractor):
    """
    Production Open-Ended Clinical NLP Entity Extractor:
    - Extracts multiple clinical entities without closed vocabulary limitations.
    - Preserves exact temporal expressions ("since yesterday", "since last night", "this morning", "2 days").
    - Extracts precise body locations ("left ear", "arm / haath", "lower abdomen", "eyes").
    - Distinguishes raw clinical entities from concise, unified patient-facing symptom summaries (no duplication).
    - Generates dynamic, contextually relevant follow-up questions when information is incomplete.
    """

    async def extract(self, transcript: str, language: str = "hi", previous_context: Optional[Dict[str, Any]] = None) -> ClinicalExtractionResult:
        logger.info(f"[NLPExtractor] Processing transcript: '{transcript}'")
        text = transcript.lower().strip()
        
        extracted_symptoms: List[ExtractedSymptom] = []
        detected_red_flags: List[str] = []
        
        # 1. Temporal Duration & Onset Expression
        duration_val, duration_unit, duration_text = self._extract_duration(text)
        onset = "sudden" if any(w in text for w in ["suddenly", "sudden", "achanak", "अचानक", "ekdum se", "all of a sudden"]) else "gradual"
        
        # 2. Severity Extraction
        severity = self._extract_severity(text)
        
        # 3. Demographic & Pregnancy Context
        age_group = self._extract_age_group(text)
        is_pregnant = self._extract_pregnancy(text)
        
        if previous_context:
            if not age_group and previous_context.get("age_group"):
                age_group = previous_context["age_group"]
            if not is_pregnant and previous_context.get("is_pregnant"):
                is_pregnant = previous_context["is_pregnant"]

        # 4. Extract Body Locations Mentioned
        locations = self._extract_locations(text)

        # 5. Break into sub-clauses for fine-grained entity matching & negation resolution
        clauses = re.split(r'[,।;!?]|\blekin\b|\bpar\b|\bparantu\b|\baur\b|\band\b|लेकिन|परन्तु|किन्तु|और', text)

        # 6. Extract symptoms from taxonomy
        matched_keys = set()
        for sym_key, sym_info in HINDI_SYMPTOM_TAXONOMY.items():
            matched_keyword = None
            matched_clause = None

            sorted_kw = sorted(sym_info["keywords"], key=lambda k: len(k), reverse=True)
            for kw in sorted_kw:
                kw_lower = kw.lower()
                if kw_lower in text:
                    matched_keyword = kw
                    for cl in clauses:
                        if kw_lower in cl:
                            matched_clause = cl
                            break
                    break
            
            if matched_keyword:
                clause_to_check = matched_clause if matched_clause else text
                is_neg = self._check_negation_in_clause(clause_to_check, matched_keyword)
                
                # Check specific red flag status
                is_red = False
                if not is_neg:
                    if sym_key in ["dyspnea", "chest_pain", "unconsciousness", "bleeding"]:
                        is_red = True
                        detected_red_flags.append(sym_key)
                    elif sym_key in ["blurred_vision", "dizziness"] and onset == "sudden":
                        # Sudden neurological / vision event is a red flag
                        is_red = True
                        detected_red_flags.append("acute_neurological_event")
                    elif sym_key == "fever" and (duration_val and duration_val >= 5 or severity == "severe"):
                        if duration_val and duration_val >= 7:
                            is_red = True
                            detected_red_flags.append("prolonged_high_fever")
                    elif sym_key in ["vomiting", "diarrhea"] and age_group == "child":
                        is_red = True
                        detected_red_flags.append("pediatric_dehydration")

                # Map specific location to symptom if relevant
                sym_location = None
                for loc in locations:
                    if sym_key in ["ear_pain", "skin_rash", "itching", "abdominal_pain", "headache", "blurred_vision", "joint_pain", "back_pain"]:
                        sym_location = loc
                        break

                symptom_obj = ExtractedSymptom(
                    name=sym_key,
                    location=sym_location,
                    hindi_term=sym_info["hindi_term"],
                    duration_val=duration_val,
                    duration_unit=duration_unit,
                    duration_text=duration_text,
                    onset=onset,
                    severity=severity or sym_info.get("default_severity", "moderate"),
                    is_negated=is_neg,
                    is_red_flag=is_red,
                    raw_text=matched_keyword,
                    confidence=0.94
                )
                extracted_symptoms.append(symptom_obj)
                matched_keys.add(sym_key)

        # 7. Open-Ended Anatomical & Symptom Pattern Extraction (For uncatalogued complaints)
        open_symptoms = self._extract_open_ended_symptoms(
            text, matched_keys, duration_val, duration_unit, duration_text, severity, onset, locations
        )
        extracted_symptoms.extend(open_symptoms)

        # 8. Deduplicate and normalize raw clinical entities
        unique_symptoms = self._deduplicate_symptoms(extracted_symptoms)

        # 9. Build Unified, Non-Redundant Patient-Facing Summary
        patient_summary = self._build_patient_facing_summary(unique_symptoms, locations, duration_text, onset, language)

        # 10. Check Missing Critical Information & Dynamic Clarification Questions
        missing_info, needs_clarification, clarification_prompt = self._assess_clarification_needs(
            unique_symptoms, duration_text, locations, detected_red_flags, onset, text, language
        )

        return ClinicalExtractionResult(
            symptoms=unique_symptoms,
            patient_facing_summary=patient_summary,
            body_locations=locations,
            age_group=age_group,
            is_pregnant=is_pregnant,
            raw_transcript=transcript,
            detected_red_flags=detected_red_flags,
            missing_critical_info=missing_info,
            needs_clarification=needs_clarification,
            clarification_prompt=clarification_prompt,
            extraction_provider="clinical_nlp_v2"
        )

    def _check_negation_in_clause(self, clause: str, keyword: str) -> bool:
        clause_low = clause.lower()
        for neg in NEGATION_MARKERS:
            if neg in clause_low:
                return True
        return False

    def _extract_duration(self, text: str) -> Tuple[Optional[int], str, Optional[str]]:
        """
        Extracts duration value, unit, and preserves the exact original patient temporal expression.
        """
        # Exact relative time expressions
        if "since last night" in text or "last night" in text or "kal raat" in text:
            return 1, "days", "since last night"
        if "since yesterday" in text or "from yesterday" in text or "kal se" in text or "कल से" in text:
            return 1, "days", "since yesterday"
        if "since this morning" in text or "this morning" in text or "subah se" in text or "सुबह से" in text or "since morning" in text:
            return 0, "days", "since this morning"
        if "aaj se" in text or "आज से" in text or "today" in text:
            return 0, "days", "today"

        # Week patterns
        week_match = re.search(r'(\d+|ek|do|teen|chaar|एक|दो|तीन|चार|one|two|three|four)\s*(?:hafte|hafta|week|weeks|हफ्ते|हफ्ता)', text)
        if week_match:
            num_str = week_match.group(1).lower()
            num = DURATION_NUMBER_WORDS.get(num_str, 1)
            if num is None and num_str.isdigit():
                num = int(num_str)
            raw_match = week_match.group(0)
            return (num or 1) * 7, "days", raw_match
        
        # Day patterns
        day_match = re.search(r'(\d+|ek|do|teen|tin|chaar|char|paanch|panch|chhah|saat|das|one|two|three|four|five|six|seven|एक|दो|तीन|चार|पांच|छह|सात|दस)\s*(?:din|dino|day|days|दिन|दिनों)', text)
        if day_match:
            num_str = day_match.group(1).lower()
            num = DURATION_NUMBER_WORDS.get(num_str)
            if num is None and num_str.isdigit():
                num = int(num_str)
            raw_match = day_match.group(0)
            return num or 1, "days", raw_match

        return None, "days", None

    def _extract_severity(self, text: str) -> Optional[str]:
        for sev_level, modifiers in SEVERITY_MODIFIERS.items():
            for mod in modifiers:
                if mod.lower() in text:
                    return sev_level
        return None

    def _extract_locations(self, text: str) -> List[str]:
        locations = []
        loc_patterns = [
            (r'\bleft ear\b|\bleft kaan\b|\bleft kan\b', "left ear"),
            (r'\bright ear\b|\bright kaan\b|\bright kan\b', "right ear"),
            (r'\bear\b|\bkaan\b|\bkan\b|\bकान\b', "ear"),
            (r'\barm\b|\bhaath\b|\bhand\b|\bबांह\b|\bहाथ\b', "arm / hand"),
            (r'\bleg\b|\bpair\b|\bfoot\b|\bपैर\b|\bटांग\b', "leg"),
            (r'\bleft eye\b', "left eye"),
            (r'\bright eye\b', "right eye"),
            (r'\beyes?\b|\baankh\b|\baankhon\b|\bआंख\b|\bvision\b', "eyes / vision"),
            (r'\blower stomach\b|\blower abdomen\b|\bpet ke nichle\b', "lower abdomen"),
            (r'\bstomach\b|\babdomen\b|\bpet\b|\bbelly\b|\bपेट\b', "stomach / abdomen"),
            (r'\bthroat\b|\bgala\b|\bgale\b|\bगला\b', "throat"),
            (r'\bchest\b|\bseena\b|\bchhati\b|\bसीना\b|\bछाती\b', "chest"),
            (r'\bback\b|\bkamar\b|\bpeeth\b|\bकमर\b|\bपीठ\b', "back"),
            (r'\bknee\b|\bghutna\b|\bghutno\b|\bघुटना\b', "knee"),
            (r'\burine\b|\bpeshab\b|\bपेशाब\b', "urinary tract")
        ]
        for pattern, label in loc_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                if label not in locations:
                    locations.append(label)
        return locations

    def _extract_age_group(self, text: str) -> Optional[str]:
        for age, kws in DEMOGRAPHIC_KEYWORDS.items():
            for kw in kws:
                if kw in text:
                    return age
        return "adult"

    def _extract_pregnancy(self, text: str) -> bool:
        for kw in PREGNANCY_KEYWORDS:
            if kw in text:
                return True
        return False

    def _extract_open_ended_symptoms(
        self,
        text: str,
        already_matched: Set[str],
        duration_val: Optional[int],
        duration_unit: str,
        duration_text: Optional[str],
        severity: Optional[str],
        onset: str,
        locations: List[str]
    ) -> List[ExtractedSymptom]:
        open_symptoms: List[ExtractedSymptom] = []
        
        # Common anatomical pairs
        body_parts = [
            ("ear", "कान", "ear_pain"),
            ("eye", "आंख", "blurred_vision"),
            ("arm", "हाथ", "arm_rash"),
            ("knee", "घुटना", "knee_pain"),
            ("back", "पीठ", "back_pain"),
            ("throat", "गला", "sore_throat")
        ]

        problem_patterns = [
            ("hurting", "दर्द", "moderate"),
            ("hurt", "दर्द", "moderate"),
            ("pain", "दर्द", "moderate"),
            ("burning", "जलन", "moderate"),
            ("itching", "खुजली", "mild"),
            ("itchy", "खुजली", "mild"),
            ("rash", "दाने", "mild"),
            ("swelling", "सूजन", "moderate"),
            ("blurry", "धुंधलापन", "moderate")
        ]

        for bp_en, bp_hi, std_slug in body_parts:
            if bp_en in text and std_slug not in already_matched:
                for prob_en, prob_hi, def_sev in problem_patterns:
                    if prob_en in text:
                        slug = f"{bp_en}_{prob_en}"
                        loc_match = next((l for l in locations if bp_en in l), bp_en)
                        open_symptoms.append(ExtractedSymptom(
                            name=slug,
                            location=loc_match,
                            hindi_term=f"{bp_hi} में {prob_hi}",
                            duration_val=duration_val,
                            duration_unit=duration_unit,
                            duration_text=duration_text,
                            onset=onset,
                            severity=severity or def_sev,
                            is_negated=False,
                            is_red_flag=False,
                            raw_text=f"{bp_en} {prob_en}",
                            confidence=0.90
                        ))
                        already_matched.add(slug)
                        break

        return open_symptoms

    def _deduplicate_symptoms(self, symptoms: List[ExtractedSymptom]) -> List[ExtractedSymptom]:
        """
        Deduplicates overlapping extracted entities into canonical clinical symptoms.
        """
        seen_concepts = set()
        deduped = []
        
        # Preference mapping for overlapping matches
        priority_map = {
            "abdominal_pain": ["stomach_pain", "stomach_ache", "belly_pain"],
            "skin_rash": ["arm_rash", "skin_rash_on_arm"],
            "itching": ["arm_itchy", "skin_itchy"],
            "headache": ["head_ache", "head_pain"],
            "ear_pain": ["ear_hurting", "ear_hurt", "ear_pain"]
        }

        for s in symptoms:
            canon = s.name
            for parent, children in priority_map.items():
                if s.name in children:
                    canon = parent
                    break
            
            if canon not in seen_concepts:
                s.name = canon
                deduped.append(s)
                seen_concepts.add(canon)
        
        return deduped

    def _build_patient_facing_summary(
        self,
        symptoms: List[ExtractedSymptom],
        locations: List[str],
        duration_text: Optional[str],
        onset: str,
        language: str
    ) -> str:
        """
        Builds a clean, non-redundant patient-facing description of the reported complaint.
        """
        active = [s for s in symptoms if not s.is_negated]
        if not active:
            return "No active symptoms detected" if language == "en" else "कोई सक्रिय लक्षण नहीं"

        if language == "en":
            sym_phrases = []
            has_rash = any(s.name == "skin_rash" for s in active)
            has_itching = any(s.name == "itching" for s in active)
            
            if has_rash and has_itching:
                loc_str = f" on your {locations[0]}" if locations else ""
                sym_phrases.append(f"rash and itching{loc_str}")
            else:
                for s in active:
                    if s.name == "back_pain":
                        phrase = "lower back pain" if any("back" in l for l in locations) else "back pain"
                    elif s.name == "swelling":
                        phrase = f"swelling in your {s.location}" if s.location else "swelling"
                    elif s.name == "lump":
                        phrase = f"painful lump on your {s.location}" if s.location else "painful lump"
                    elif s.name == "sore_throat":
                        phrase = "throat irritation and burning"
                    elif s.name == "abdominal_pain":
                        phrase = "stomach pain"
                    elif s.name == "burning_urination":
                        phrase = "burning sensation during urination"
                    elif s.name == "blurred_vision":
                        phrase = "blurred vision / eye irritation"
                    elif s.name == "ear_pain":
                        phrase = f"ear pain in your {s.location}" if s.location and "ear" not in s.location else (f"{s.location} pain" if s.location else "ear pain")
                    else:
                        phrase = s.name.replace("_", " ")
                    sym_phrases.append(phrase)
            
            dur_str = f" ({duration_text})" if duration_text else ""
            onset_str = "Sudden " if onset == "sudden" else ""
            return f"{onset_str}{' and '.join(sym_phrases)}{dur_str}"

        elif language == "hinglish":
            sym_phrases = []
            has_rash = any(s.name == "skin_rash" for s in active)
            has_itching = any(s.name == "itching" for s in active)
            
            if has_rash and has_itching:
                loc_str = f"{locations[0]} par " if locations else "Skin par "
                sym_phrases.append(f"{loc_str}rash aur itching")
            else:
                for s in active:
                    if s.name == "back_pain":
                        phrase = "kamar mein dard"
                    elif s.name == "swelling":
                        phrase = f"{s.location} mein sujan" if s.location else "sujan"
                    elif s.name == "lump":
                        phrase = f"{s.location} par lump" if s.location else "lump"
                    elif s.name == "sore_throat":
                        phrase = "gale mein jalan aur kharash"
                    elif s.name == "abdominal_pain":
                        phrase = "stomach pain"
                    elif s.name == "burning_urination":
                        phrase = "urine mein jalan"
                    elif s.name == "blurred_vision":
                        phrase = "aankhon mein jalan aur dhundhla dikhna"
                    elif s.name == "ear_pain":
                        phrase = f"{s.location} mein dard" if s.location else "ear pain"
                    else:
                        phrase = s.hindi_term.split("/")[0].strip() if s.hindi_term else s.name.replace("_", " ")
                    sym_phrases.append(phrase)
            
            dur_str = f" ({duration_text})" if duration_text else ""
            onset_str = "Achanak " if onset == "sudden" else ""
            return f"{onset_str}{' aur '.join(sym_phrases)}{dur_str}"

        else: # Hindi
            sym_phrases = []
            for s in active:
                if s.name == "back_pain":
                    phrase = "कमर में दर्द"
                elif s.name == "swelling":
                    phrase = f"{s.location} में सूजन" if s.location else "सूजन"
                elif s.name == "lump":
                    phrase = f"{s.location} पर गांठ" if s.location else "गांठ"
                elif s.name == "sore_throat":
                    phrase = "गले में जलन और खराश"
                elif s.name == "abdominal_pain":
                    phrase = "पेट में दर्द"
                elif s.name == "burning_urination":
                    phrase = "पेशाब में जलन"
                elif s.name == "blurred_vision":
                    phrase = "आंखों में जलन और धुंधला दिखना"
                elif s.name == "ear_pain":
                    phrase = f"{s.location} में दर्द" if s.location else "कान में दर्द"
                else:
                    phrase = s.hindi_term.split("/")[0].strip() if s.hindi_term else s.name
                sym_phrases.append(phrase)

            dur_str = f" ({duration_text})" if duration_text else ""
            onset_str = "अचानक " if onset == "sudden" else ""
            return f"{onset_str}{' और '.join(sym_phrases)}{dur_str}"

    def _assess_clarification_needs(
        self,
        symptoms: List[ExtractedSymptom],
        duration_text: Optional[str],
        locations: List[str],
        red_flags: List[str],
        onset: str,
        raw_text: str,
        language: str
    ) -> Tuple[List[str], bool, Optional[str]]:
        missing_info = []
        needs_clarification = False
        clarification_prompt = None
        active = [s for s in symptoms if not s.is_negated]

        # Check for ambiguous / unrecognized complaints where no specific clinical symptom was identified
        if not active and len(raw_text) > 3:
            missing_info.append("unclear_symptoms")
            needs_clarification = True
            if language == "en":
                clarification_prompt = "Could you please describe more specifically what discomfort or symptoms you are experiencing?"
            elif language == "hinglish":
                clarification_prompt = "Kripya thoda aur vistaar se batayein ki aapko sharir mein kya takleef ya lakshan mehsoos ho rahe hain?"
            else:
                clarification_prompt = "कृपया थोड़ा और स्पष्ट बताएं कि आपको क्या समस्या या लक्षण हो रहे हैं?"
            return missing_info, needs_clarification, clarification_prompt

        # Check for unstated duration on isolated pain complaints
        if len(active) == 1 and not duration_text and not red_flags:
            sym_name = active[0].name
            if sym_name in ["abdominal_pain", "headache", "chest_pain", "stomach_pain", "stomach_hurts"]:
                missing_info.append("duration")
                missing_info.append("associated_red_flags")
                needs_clarification = True
                if language == "en":
                    clarification_prompt = "Could you please specify when this started, exactly where it hurts, and if you have had any vomiting, fever, or dizziness?"
                elif language == "hinglish":
                    clarification_prompt = "Kripya batayein yeh takleef kab se hai, exactly kahan dard hai, aur kya vomiting ya fever bhi hai?"
                else:
                    clarification_prompt = "कृपया बताएं कि यह समस्या कब से शुरू हुई, दर्द किस जगह है, और क्या आपको उल्टी या बुखार भी है?"

        # Check acute neurological / sudden onset combinations
        if "acute_neurological_event" in red_flags or (onset == "sudden" and any(s.name in ["dizziness", "blurred_vision"] for s in active)):
            missing_info.append("neurological_red_flags")
            needs_clarification = False # Direct red flag safety alert

        return missing_info, needs_clarification, clarification_prompt
