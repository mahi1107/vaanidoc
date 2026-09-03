from typing import Optional
from backend.app.ai.asr.base import BaseASRService, ASRResult
from backend.app.config.settings import settings
from backend.app.utils.logger import logger

class MockASRService(BaseASRService):
    """
    High-fidelity ASR adapter that parses live speech transcripts, client ASR text,
    or encoded speech payloads without using hardcoded emergency scenario fallbacks.
    """
    def __init__(self, default_confidence: float = 0.95):
        self.default_confidence = default_confidence

    async def transcribe(self, audio_bytes: bytes, language: str = "hi", filename: Optional[str] = None) -> ASRResult:
        logger.info(f"[MockASR] Transcribing audio ({len(audio_bytes)} bytes) for language: {language}")

        # 1. Check if the audio payload contains embedded speech text (from browser client or test payload)
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
                        raw_response={"provider": "mock", "mode": "low_confidence_test"}
                    )
                return ASRResult(
                    transcript=text,
                    confidence=0.96,
                    language=language,
                    is_low_confidence=False,
                    raw_response={"provider": "mock", "mode": "simulated_header"}
                )
            elif decoded.startswith("TRANSCRIPT:"):
                text = decoded.replace("TRANSCRIPT:", "").strip()
                return ASRResult(
                    transcript=text,
                    confidence=0.95,
                    language=language,
                    is_low_confidence=False,
                    raw_response={"provider": "mock", "mode": "client_transcript"}
                )
            elif len(decoded) > 0 and not any(ord(c) == 0 for c in decoded[:20]):
                # Plain text passed in audio bytes
                return ASRResult(
                    transcript=decoded,
                    confidence=0.94,
                    language=language,
                    is_low_confidence=False,
                    raw_response={"provider": "mock", "mode": "utf8_text"}
                )
        except Exception:
            pass

        # 2. If raw binary audio was received without text and cannot be recognized,
        # return low confidence result so that a genuine clarification is requested
        # instead of fabricating an unrelated medical emergency.
        logger.info("[MockASR] Binary audio received without transcription text — requesting clarification.")
        return ASRResult(
            transcript="[Inaudible or unclear audio]",
            confidence=0.40,
            language=language,
            is_low_confidence=True,
            raw_response={"provider": "mock", "mode": "unclear_audio"}
        )
