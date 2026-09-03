import base64
import time
from datetime import datetime, timezone
import zoneinfo
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session

from backend.app.models import (
    CallSession, Patient, Transcript, SymptomRecord, TriageResult, Alert, FollowUp, AudioMetadata
)
from backend.app.ai.asr import get_asr_service
from backend.app.ai.nlp import get_nlp_service
from backend.app.ai.triage import TriageEngine
from backend.app.ai.tts import get_tts_service
from backend.app.languages.detector import language_detector
from backend.app.languages.definitions import get_language_config
from backend.app.services.asha_service import AshaService
from backend.app.services.followup_service import FollowUpService
from backend.app.services.facility_service import FacilityService
from backend.app.services.case_service import CaseService
from backend.app.config.settings import settings
from backend.app.utils.logger import logger

def get_ist_time_str(dt: Optional[datetime] = None) -> str:
    if dt is None:
        dt = datetime.now(timezone.utc)
    try:
        ist_tz = zoneinfo.ZoneInfo("Asia/Kolkata")
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        ist_dt = dt.astimezone(ist_tz)
        return ist_dt.strftime("%I:%M:%S %p")
    except Exception:
        return dt.strftime("%H:%M:%S")

class CallOrchestrator:
    def __init__(self, db: Session):
        self.db = db
        self.asr = get_asr_service()
        self.nlp = get_nlp_service()
        self.triage_engine = TriageEngine()
        self.tts = get_tts_service()
        self.asha_service = AshaService(db)
        self.followup_service = FollowUpService(db)
        self.facility_service = FacilityService(db)
        self.case_service = CaseService(db)

    async def initialize_call(
        self,
        caller_phone: str = "+91-98765-43210",
        provider: str = "web",
        provider_call_id: Optional[str] = None,
        language: str = "hi",
        district: Optional[str] = None,
        village: Optional[str] = None,
        is_demo: bool = False,
        patient_id: Optional[str] = None
    ) -> CallSession:
        start_utc = datetime.utcnow()
        
        # Link existing patient or create anonymous patient record
        patient = None
        if patient_id:
            patient = self.db.query(Patient).filter(Patient.id == patient_id).first()
            if patient:
                if district:
                    patient.district = district
                if village:
                    patient.village = village
                self.db.commit()
                self.db.refresh(patient)
        
        if not patient:
            patient = Patient(
                district=district,
                village=village,
                created_at=start_utc
            )
            self.db.add(patient)
            self.db.commit()
            self.db.refresh(patient)

        # Mask caller phone for privacy
        masked_phone = caller_phone
        if len(caller_phone) >= 10:
            masked_phone = f"+91-XXXXX-{caller_phone[-4:]}"

        initial_timeline = [
            {
                "time": get_ist_time_str(start_utc),
                "timestamp_utc": start_utc.isoformat() + "Z",
                "stage": "Voice Consultation Initialized",
                "status": "completed",
                "details": f"Connected via {provider.upper()} interface ({district}, {village})"
            },
            {
                "time": get_ist_time_str(start_utc),
                "timestamp_utc": start_utc.isoformat() + "Z",
                "stage": "Microphone Audio Ready",
                "status": "completed",
                "details": "Ready for patient natural speech input"
            }
        ]

        call = CallSession(
            patient_id=patient.id,
            provider=provider,
            provider_call_id=provider_call_id or f"WEB-{int(start_utc.timestamp())}",
            caller_phone=masked_phone,
            language=language,
            state="LISTENING",
            status="active",
            is_demo=is_demo,
            timeline_events=initial_timeline,
            started_at=start_utc
        )
        self.db.add(call)
        self.db.commit()
        self.db.refresh(call)

        logger.info(f"[CallOrchestrator] Consultation initialized: ID={call.id}, Provider={provider}, Demo={is_demo}")
        return call

    async def process_speech_input(
        self,
        call_id: str,
        speech_text: Optional[str] = None,
        audio_bytes: Optional[bytes] = None,
        emulate_low_asr_confidence: bool = False,
        age_group: Optional[str] = "adult",
        is_pregnant: bool = False
    ) -> Dict[str, Any]:
        """
        Executes end-to-end voice consultation pipeline:
        1. ASR (Speech-to-Text) from real browser microphone audio or speech payload.
        2. Automatic Language Detection (Hindi, English, Hinglish with code-switching).
        3. Clinical NLP Entity & Symptom Extraction (duration, severity, negation, red flags).
        4. Deterministic WHO/ICMR Protocol Triage.
        5. Spoken Response Generation in conversational language (Hinglish/Hindi/English).
        6. Real TTS Audio Synthesis.
        7. Persistent CareCase creation & Healthcare Facility recommendation.
        8. ASHA Community Health Alert & Follow-up scheduling.
        """
        call = self.db.query(CallSession).filter(CallSession.id == call_id).first()
        if not call:
            raise ValueError(f"Call session {call_id} not found")

        timeline = list(call.timeline_events or [])
        district = call.patient.district if (call.patient and call.patient.district) else None
        village = call.patient.village if call.patient else "Rustampur"

        # 1. ASR Phase
        asr_start = time.perf_counter()
        audio_received = audio_bytes is not None and len(audio_bytes) > 0
        audio_size = len(audio_bytes) if audio_received else 0
        audio_duration_sec = round(audio_size / 32000.0, 2) if audio_received else 0.0

        if audio_received:
            # If client provided speech text alongside audio, pass it encoded
            if speech_text and speech_text.strip():
                asr_payload = f"TRANSCRIPT:{speech_text.strip()}".encode("utf-8")
                asr_res = await self.asr.transcribe(asr_payload, language=call.language)
            else:
                asr_res = await self.asr.transcribe(audio_bytes, language=call.language)
            # Store audio metadata record
            audio_rec = AudioMetadata(
                call_session_id=call.id,
                audio_type="inbound",
                format="wav",
                sample_rate_hz=16000 if audio_size > 20000 else 8000,
                duration_ms=max(1000, int(audio_size / 32)),
                size_bytes=audio_size,
                created_at=datetime.utcnow()
            )
            self.db.add(audio_rec)
        elif speech_text is not None and speech_text.strip():
            mock_payload = f"SIMULATED_SPEECH:{'[LOW_CONF] ' if emulate_low_asr_confidence else ''}{speech_text}".encode("utf-8")
            asr_res = await self.asr.transcribe(mock_payload, language=call.language)
        else:
            asr_res = await self.asr.transcribe(b"", language=call.language)

        asr_duration_ms = int((time.perf_counter() - asr_start) * 1000)

        # 2. Automatic Language Detection
        clean_transcript = (asr_res.transcript or "").strip()
        lang_detection = language_detector.detect(clean_transcript)
        detected_lang = lang_detection.get("detected_language", "en")
        lang_confidence = lang_detection.get("confidence", 0.9)
        call.language = detected_lang

        # Structured Development Diagnostic Log
        logger.info(
            f"\n=================================\n"
            f"CONSULTATION ID: {call.id}\n"
            f"AUDIO RECEIVED: {'true' if audio_received else 'false'}\n"
            f"AUDIO SIZE: {audio_size} bytes\n"
            f"AUDIO DURATION: {audio_duration_sec} seconds\n"
            f"AUDIO FORMAT: 16kHz PCM WAV\n"
            f"ASR TRANSCRIPT: \"{clean_transcript}\"\n"
            f"=================================\n"
        )

        # Record transcript in DB
        turn_count = self.db.query(Transcript).filter(Transcript.call_session_id == call.id).count()
        t_record = Transcript(
            call_session_id=call.id,
            turn_index=turn_count + 1,
            speaker="patient",
            transcript=clean_transcript or "[Unclear speech]",
            confidence=asr_res.confidence,
            language=detected_lang,
            asr_provider=settings.ASR_PROVIDER,
            processing_ms=asr_duration_ms,
            created_at=datetime.utcnow()
        )
        self.db.add(t_record)
        self.db.commit()

        timeline.append({
            "time": get_ist_time_str(),
            "timestamp_utc": datetime.utcnow().isoformat() + "Z",
            "stage": "Speech Recognition & Language Detection",
            "status": "completed",
            "latency_ms": asr_duration_ms,
            "details": f"Transcript: \"{clean_transcript[:45]}...\" | Detected: {lang_detection.get('display_name', detected_lang)} ({int(lang_confidence*100)}%)"
        })

        # Check for empty audio or Low Confidence threshold (Fail safely without fabricating fake symptoms)
        if not clean_transcript or asr_res.is_low_confidence or asr_res.confidence < settings.ASR_CONFIDENCE_THRESHOLD:
            clarify_text = "Unable to understand your voice. Please try again."

            tts_res = await self.tts.synthesize(clarify_text, language=detected_lang)
            call.state = "MISSING_INFO"
            timeline.append({
                "time": get_ist_time_str(),
                "timestamp_utc": datetime.utcnow().isoformat() + "Z",
                "stage": "Low Confidence - Clarification Requested",
                "status": "action_required",
                "details": "Requested patient repetition in natural conversational tone"
            })
            call.timeline_events = timeline
            self.db.commit()
            
            return {
                "call_id": call.id,
                "status": "clarification_needed",
                "transcript": clean_transcript or "Unable to understand your voice. Please try again.",
                "detected_language": detected_lang,
                "language_confidence": lang_confidence,
                "language_display": lang_detection.get("display_name", "English"),
                "asr_confidence": asr_res.confidence,
                "extracted_symptoms": [],
                "triage_decision": {
                    "level": 0,
                    "category": "repeat_required",
                    "reason": "Unable to understand your voice. Please try again.",
                    "rule_id": "ASR-CLARIFY-001"
                },
                "voice_response": clarify_text,
                "audio_data_base64": base64.b64encode(tts_res.audio_bytes).decode("utf-8") if tts_res.audio_bytes else None,
                "care_case": None,
                "recommended_facility": None,
                "asha_alert_sent": False,
                "followup_scheduled": False,
                "timeline_events": timeline
            }

        # 3. Clinical NLP Extraction Phase
        nlp_start = time.perf_counter()
        prev_context = {"age_group": age_group, "is_pregnant": is_pregnant}
        nlp_res = await self.nlp.extract(clean_transcript, language=detected_lang, previous_context=prev_context)
        nlp_duration_ms = int((time.perf_counter() - nlp_start) * 1000)

        
        # Save symptom records in DB
        symptoms_saved = []
        for s in nlp_res.symptoms:
            s_record = SymptomRecord(
                call_session_id=call.id,
                symptom_name=s.name,
                hindi_term=s.hindi_term,
                duration_val=s.duration_val,
                duration_unit=s.duration_unit,
                severity=s.severity,
                is_negated=s.is_negated,
                is_red_flag=s.is_red_flag,
                raw_extracted_text=s.raw_text,
                confidence=s.confidence,
                created_at=datetime.utcnow()
            )
            self.db.add(s_record)
            symptoms_saved.append(s.dict())
        self.db.commit()

        active_sym_names = [s.hindi_term or s.name for s in nlp_res.symptoms if not s.is_negated]
        timeline.append({
            "time": get_ist_time_str(),
            "timestamp_utc": datetime.utcnow().isoformat() + "Z",
            "stage": "Clinical NLP Symptom Extraction Completed",
            "status": "completed",
            "latency_ms": nlp_duration_ms,
            "details": f"Extracted {len(active_sym_names)} clinical entities: {', '.join(active_sym_names) or 'General check'}"
        })

        # Check if clinical clarification is required before triage
        if nlp_res.needs_clarification and nlp_res.clarification_prompt:
            clarify_text = nlp_res.clarification_prompt
            tts_res = await self.tts.synthesize(clarify_text, language=detected_lang)
            call.state = "MISSING_INFO"
            timeline.append({
                "time": get_ist_time_str(),
                "timestamp_utc": datetime.utcnow().isoformat() + "Z",
                "stage": "Clinical Clarification Requested",
                "status": "action_required",
                "details": f"Follow-up question asked: '{clarify_text}'"
            })
            call.timeline_events = timeline
            self.db.commit()

            return {
                "call_id": call.id,
                "status": "clarification_needed",
                "transcript": clean_transcript,
                "detected_language": detected_lang,
                "language_confidence": lang_confidence,
                "language_display": lang_detection.get("display_name", "English"),
                "asr_confidence": asr_res.confidence,
                "extracted_symptoms": symptoms_saved,
                "triage_decision": {
                    "level": 0,
                    "category": "clarification_needed",
                    "reason": "Additional clinical information required before safe assessment",
                    "rule_id": "CLARIFY-REQ-001"
                },
                "voice_response": clarify_text,
                "audio_data_base64": base64.b64encode(tts_res.audio_bytes).decode("utf-8") if tts_res.audio_bytes else None,
                "care_case": None,
                "recommended_facility": None,
                "asha_alert_sent": False,
                "followup_scheduled": False,
                "timeline_events": timeline
            }

        # 4. Clinical Triage Phase
        triage_start = time.perf_counter()
        triage_decision = self.triage_engine.evaluate(nlp_res, language=detected_lang)
        triage_duration_ms = int((time.perf_counter() - triage_start) * 1000)

        timeline.append({
            "time": get_ist_time_str(),
            "timestamp_utc": datetime.utcnow().isoformat() + "Z",
            "stage": "Deterministic Protocol Triage Evaluated",
            "status": "completed",
            "latency_ms": triage_duration_ms,
            "details": f"Level {triage_decision.level} ({triage_decision.category.upper()}) via {triage_decision.rule_id}"
        })

        # 5. Healthcare Facility Recommendation
        facility = None
        if district and district.strip():
            facility = self.facility_service.get_recommended_facility(
                triage_level=triage_decision.level,
                district=district.strip()
            )
            # Strict safety invariant: verify facility district matches requested district
            if facility and (not facility.district or facility.district.strip().lower() != district.strip().lower()):
                logger.error(f"[CallOrchestrator] HARD INVARIANT VIOLATION: Facility {facility.name} (district={facility.district}) does not match patient district {district}. Rejecting recommendation.")
                facility = None

        facility_dict = None
        if facility and district and facility.district and facility.district.strip().lower() == district.strip().lower():
            facility_dict = {
                "id": facility.id,
                "name": facility.name,
                "facility_type": facility.facility_type,
                "district": facility.district,
                "block": facility.block,
                "address": facility.address,
                "phone_number": facility.phone_number,
                "emergency_helpline": facility.emergency_helpline,
                "services_offered": facility.services_offered
            }

        # 6. ASHA Community Worker Alert (Levels 2, 3, 4)
        symptoms_str = ", ".join(active_sym_names) or "सामान्य लक्षण"
        asha_alert = await self.asha_service.trigger_triage_alert(
            call_session_id=call.id,
            triage_level=triage_decision.level,
            symptoms_str=symptoms_str,
            triage_category=triage_decision.category,
            district=district,
            village=village
        )

        asha_worker_id = asha_alert.asha_worker_id if asha_alert else None

        if asha_alert:
            timeline.append({
                "time": get_ist_time_str(),
                "timestamp_utc": datetime.utcnow().isoformat() + "Z",
                "stage": "ASHA Community Health Alert Dispatched",
                "status": "completed",
                "details": f"Alert dispatched for Level {triage_decision.level} triage case in {village}"
            })
            # Append ASHA notification confirmation only when alert was successfully sent (Levels 2 & 3)
            if triage_decision.level in [2, 3]:
                triage_decision.voice_guidance_text = self.triage_engine.response_gen.append_asha_confirmation(
                    triage_decision.voice_guidance_text,
                    language=detected_lang
                )

        # Save Triage Result in DB
        t_res_record = TriageResult(
            call_session_id=call.id,
            level=triage_decision.level,
            category=triage_decision.category,
            rule_id=triage_decision.rule_id,
            reason=triage_decision.reason,
            recommended_action=triage_decision.recommended_action,
            voice_guidance_text=triage_decision.voice_guidance_text,
            urgency=triage_decision.urgency,
            confidence=triage_decision.confidence,
            created_at=datetime.utcnow()
        )
        self.db.add(t_res_record)

        # 7. Response Voice Generation (TTS)
        tts_start = time.perf_counter()
        tts_res = await self.tts.synthesize(triage_decision.voice_guidance_text, language=detected_lang)
        tts_duration_ms = int((time.perf_counter() - tts_start) * 1000)

        timeline.append({
            "time": get_ist_time_str(),
            "timestamp_utc": datetime.utcnow().isoformat() + "Z",
            "stage": "Spoken Voice Guidance (TTS) Generated",
            "status": "completed",
            "latency_ms": tts_duration_ms,
            "details": f"Synthesized {len(tts_res.audio_bytes)} bytes audio guidance in {detected_lang}"
        })

        # 8. Schedule Follow-up (24 hours)
        followup = self.followup_service.schedule_24h_followup(call.id)
        if followup:
            timeline.append({
                "time": get_ist_time_str(),
                "timestamp_utc": datetime.utcnow().isoformat() + "Z",
                "stage": "24-Hour Follow-up Scheduled",
                "status": "completed",
                "details": f"Automated reassessment scheduled for {get_ist_time_str(followup.scheduled_for)}"
            })

        # 9. Create Persistent CareCase (VD-XXXX)
        primary_complaint = asr_res.transcript[:200] if asr_res.transcript else "Health Consultation"
        care_case = self.case_service.create_case_from_consultation(
            patient_id=call.patient_id,
            call_session_id=call.id,
            primary_complaint=primary_complaint,
            detected_language=detected_lang,
            language_confidence=lang_confidence,
            triage_level=triage_decision.level,
            triage_category=triage_decision.category,
            recommendation_text=triage_decision.recommended_action,
            facility_id=facility.id if facility else None,
            asha_worker_id=asha_worker_id,
            is_demo=call.is_demo
        )

        # 10. Complete Call Session
        call.state = "COMPLETED"
        call.status = "escalated" if triage_decision.level >= 3 else "completed"
        call.ended_at = datetime.utcnow()
        call.duration_seconds = max(18, int((call.ended_at - call.started_at).total_seconds()) or 24)

        timeline.append({
            "time": get_ist_time_str(call.ended_at),
            "timestamp_utc": call.ended_at.isoformat() + "Z",
            "stage": "Care Case Created & Session Completed",
            "status": "completed",
            "details": f"Case Reference: {care_case.case_code} | Duration: {call.duration_seconds}s"
        })
        call.timeline_events = timeline
        self.db.commit()

        logger.info(f"[CallOrchestrator] Consultation {call.id} resolved: Case={care_case.case_code}, Level={triage_decision.level} ({triage_decision.category})")

        return {
            "call_id": call.id,
            "status": "completed",
            "case_code": care_case.case_code,
            "case_id": care_case.id,
            "transcript": asr_res.transcript,
            "detected_language": detected_lang,
            "language_confidence": lang_confidence,
            "language_display": lang_detection.get("display_name", "Hinglish" if detected_lang == "hinglish" else "Hindi"),
            "asr_confidence": asr_res.confidence,
            "extracted_symptoms": symptoms_saved,
            "triage_decision": {
                "level": triage_decision.level,
                "category": triage_decision.category,
                "rule_id": triage_decision.rule_id,
                "reason": triage_decision.reason,
                "recommended_action": triage_decision.recommended_action,
                "urgency": triage_decision.urgency,
                "confidence": triage_decision.confidence
            },
            "voice_response": triage_decision.voice_guidance_text,
            "voice_response_hi": triage_decision.voice_guidance_text,
            "audio_data_base64": base64.b64encode(tts_res.audio_bytes).decode("utf-8") if tts_res.audio_bytes else None,
            "recommended_facility": facility_dict,
            "care_case": {
                "id": care_case.id,
                "case_code": care_case.case_code,
                "status": care_case.status,
                "triage_level": care_case.triage_level,
                "primary_complaint": care_case.primary_complaint,
                "recommendation": care_case.recommendation_text,
                "created_at": care_case.created_at
            },
            "asha_alert_sent": asha_alert is not None,
            "asha_alert_message": asha_alert.message if asha_alert else None,
            "followup_scheduled": followup is not None,
            "timeline_events": timeline
        }
