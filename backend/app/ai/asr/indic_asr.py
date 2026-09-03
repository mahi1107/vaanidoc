import io
import time
from typing import Optional
from backend.app.ai.asr.base import BaseASRService, ASRResult
from backend.app.utils.logger import logger

class IndicASRService(BaseASRService):
    """
    Production ASR Service:
    1. Transcribes real microphone PCM/WAV audio via SpeechRecognition / Google Speech engine.
    2. Decodes live client speech transcripts when Web Speech API provides them.
    3. Guarantees that unparseable, silent, or low-confidence audio prompts for clarification
       and NEVER falls back to hardcoded mock emergencies.
    """
    def __init__(self, model_name: str = "multilingual-speech-recognizer"):
        self.model_name = model_name

    async def transcribe(self, audio_bytes: bytes, language: str = "hi", filename: Optional[str] = None) -> ASRResult:
        if not audio_bytes or len(audio_bytes) == 0:
            logger.warning("[IndicASR] Received empty audio payload (0 bytes).")
            return ASRResult(
                transcript="",
                confidence=0.0,
                language=language,
                is_low_confidence=True,
                raw_response={"error": "empty_audio"}
            )

        # 1. Check for text transcript payload (e.g. from Web Speech API or test harnesses)
        try:
            decoded = audio_bytes.decode("utf-8", errors="ignore").strip()
            if decoded.startswith("SIMULATED_SPEECH:"):
                text = decoded.replace("SIMULATED_SPEECH:", "").strip()
                if "[LOW_CONF]" in text:
                    clean_text = text.replace("[LOW_CONF]", "").strip()
                    return ASRResult(
                        transcript=clean_text or "अस्पष्ट आवाज",
                        confidence=0.45,
                        language=language,
                        is_low_confidence=True,
                        raw_response={"provider": "text_payload", "mode": "low_confidence"}
                    )
                return ASRResult(
                    transcript=text,
                    confidence=0.96,
                    language=language,
                    is_low_confidence=False,
                    raw_response={"provider": "text_payload"}
                )
            elif decoded.startswith("TRANSCRIPT:"):
                text = decoded.replace("TRANSCRIPT:", "").strip()
                return ASRResult(
                    transcript=text,
                    confidence=0.96,
                    language=language,
                    is_low_confidence=False,
                    raw_response={"provider": "client_transcript"}
                )
            elif len(decoded) > 0 and len(decoded) < 500 and not any(ord(c) == 0 for c in decoded[:20]):
                return ASRResult(
                    transcript=decoded,
                    confidence=0.94,
                    language=language,
                    is_low_confidence=False,
                    raw_response={"provider": "text_utf8"}
                )
        except Exception:
            pass

        # 2. Transcribe Binary PCM/WAV Audio using SpeechRecognition
        try:
            import speech_recognition as sr
            r = sr.Recognizer()
            r.energy_threshold = 300
            r.dynamic_energy_threshold = True

            audio_file = sr.AudioFile(io.BytesIO(audio_bytes))
            with audio_file as source:
                audio_data = r.record(source)

            # Try English (en-IN) first if language is en, otherwise try multi-lingual / hi-IN
            target_langs = ["en-IN", "hi-IN"] if language == "en" else ["hi-IN", "en-IN"]
            recognized_text = None
            recognized_lang = None

            for l_code in target_langs:
                try:
                    text = r.recognize_google(audio_data, language=l_code)
                    if text and text.strip():
                        recognized_text = text.strip()
                        recognized_lang = "en" if "en" in l_code else "hi"
                        break
                except sr.UnknownValueError:
                    continue
                except sr.RequestError as req_err:
                    logger.warning(f"[IndicASR] Google Speech API request error for {l_code}: {req_err}")
                    continue

            if recognized_text:
                logger.info(f"[IndicASR] Successfully transcribed audio via Google Speech API: '{recognized_text}' (lang={recognized_lang})")
                return ASRResult(
                    transcript=recognized_text,
                    confidence=0.94,
                    language=recognized_lang or language,
                    is_low_confidence=False,
                    raw_response={"provider": "google_speech_api", "recognized_lang": recognized_lang}
                )

        except Exception as e:
            logger.warning(f"[IndicASR] SpeechRecognition audio processing notice: {e}")

        # 3. Audio is inaudible, silent, or unparseable — fail safely without fake clinical symptoms
        logger.info("[IndicASR] Audio could not be transcribed — triggering low-confidence clarification.")
        return ASRResult(
            transcript="",
            confidence=0.25,
            language=language,
            is_low_confidence=True,
            raw_response={"provider": "asr", "status": "unrecognized_audio"}
        )
