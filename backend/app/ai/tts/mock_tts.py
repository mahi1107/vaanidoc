import io
import wave
import math
import struct
from typing import Dict
from backend.app.ai.tts.base import BaseTTSService, TTSResult
from backend.app.utils.logger import logger

class MockTTSService(BaseTTSService):
    """
    Mock TTS service that produces valid, playable PCM WAV audio binaries with realistic
    durations and prompt caching.
    """
    def __init__(self):
        self._cache: Dict[str, bytes] = {}

    async def synthesize(self, text: str, language: str = "hi") -> TTSResult:
        cache_key = f"{language}:{text}"
        if cache_key in self._cache:
            audio_bytes = self._cache[cache_key]
            return TTSResult(
                audio_bytes=audio_bytes,
                audio_format="wav",
                duration_seconds=max(2.0, len(text.split()) * 0.35),
                text=text,
                language=language,
                is_cached=True
            )

        logger.info(f"[MockTTS] Synthesizing speech for: '{text[:50]}...' in {language}")
        audio_bytes, duration = self._generate_playable_wav(text)
        self._cache[cache_key] = audio_bytes

        return TTSResult(
            audio_bytes=audio_bytes,
            audio_format="wav",
            duration_seconds=duration,
            text=text,
            language=language,
            is_cached=False
        )

    def _generate_playable_wav(self, text: str) -> (bytes, float):
        sample_rate = 8000 # Standard 8kHz telephony audio
        word_count = max(1, len(text.split()))
        duration_sec = max(2.0, min(12.0, word_count * 0.35))
        num_samples = int(sample_rate * duration_sec)

        buffer = io.BytesIO()
        with wave.open(buffer, "wb") as wav_file:
            wav_file.setnchannels(1) # Mono
            wav_file.setsampwidth(2) # 16-bit
            wav_file.setframerate(sample_rate)

            # Generate gentle modulated harmonic chime (simulating voice carrier)
            samples = []
            for i in range(num_samples):
                t = i / sample_rate
                # Dual gentle frequencies (440Hz and 880Hz envelope)
                env = math.exp(-0.0005 * i) if i > num_samples * 0.8 else 1.0
                freq = 320 + 40 * math.sin(2 * math.pi * 3 * t)
                val = int(8000 * math.sin(2 * math.pi * freq * t) * env)
                samples.append(struct.pack("<h", max(-32767, min(32767, val))))

            wav_file.writeframes(b"".join(samples))

        return buffer.getvalue(), duration_sec
