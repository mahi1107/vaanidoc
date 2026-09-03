import io
import re
from backend.app.ai.tts.base import BaseTTSService, TTSResult
from backend.app.ai.tts.mock_tts import MockTTSService
from backend.app.utils.logger import logger

class IndicTTSService(BaseTTSService):
    """
    Real Indic TTS service using gTTS (Google Text-to-Speech) / Indic models for multi-lingual audio generation,
    with telephony WAV fallback.
    """
    def __init__(self, model_name: str = "indic-tts"):
        self.model_name = model_name
        self.fallback = MockTTSService()

    async def synthesize(self, text: str, language: str = "hi") -> TTSResult:
        try:
            from gtts import gTTS
            # Determine correct gTTS language code
            if language == "en":
                lang_code = "en"
            elif language in ["hi", "hinglish"]:
                lang_code = "hi"
            elif language in ["bn", "ta", "te", "mr", "gu", "kn", "ml", "ur", "pa"]:
                lang_code = language
            else:
                lang_code = "en" if re.search(r'^[a-zA-Z\s.,!?]+$', text) else "hi"

            tts = gTTS(text=text, lang=lang_code, slow=False)
            fp = io.BytesIO()
            tts.write_to_fp(fp)
            fp.seek(0)
            audio_bytes = fp.read()
            
            word_count = max(1, len(text.split()))
            duration_sec = max(2.0, word_count * 0.4)
            
            logger.info(f"[IndicTTS] Synthesized {len(audio_bytes)} bytes of audio in '{lang_code}' using gTTS.")
            return TTSResult(
                audio_bytes=audio_bytes,
                audio_format="mp3",
                duration_seconds=duration_sec,
                text=text,
                language=language,
                is_cached=False
            )
        except Exception as e:
            logger.warning(f"[IndicTTS] Real TTS synthesis error ({e}). Generating telephony WAV audio fallback.")
            return await self.fallback.synthesize(text, language=language)
