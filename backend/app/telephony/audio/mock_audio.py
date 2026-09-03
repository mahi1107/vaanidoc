import io
import wave
import math
import struct
from typing import Optional
from backend.app.telephony.audio.base import BaseAudioCaptureService, CapturedAudio
from backend.app.utils.logger import logger

class MockAudioService(BaseAudioCaptureService):
    """
    Developer Mock Audio Service producing compliant 8kHz telephony PCM WAV binaries.
    """
    async def capture_from_url(self, recording_url: str, call_sid: Optional[str] = None) -> CapturedAudio:
        logger.info(f"[MockAudio] Generating mock telephony audio for {recording_url}")
        audio_bytes = self._generate_telephony_pcm()
        return self.compute_audio_metadata(audio_bytes, format="wav", recording_url=recording_url)

    async def capture_from_stream(self, stream_payload: bytes, format: str = "wav") -> CapturedAudio:
        if not stream_payload:
            stream_payload = self._generate_telephony_pcm()
        return self.compute_audio_metadata(stream_payload, format=format)

    def _generate_telephony_pcm(self, duration_sec: float = 3.0) -> bytes:
        sample_rate = 8000
        num_samples = int(sample_rate * duration_sec)
        buffer = io.BytesIO()
        with wave.open(buffer, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(sample_rate)
            samples = []
            for i in range(num_samples):
                t = i / sample_rate
                val = int(6000 * math.sin(2 * math.pi * 440 * t))
                samples.append(struct.pack("<h", max(-32767, min(32767, val))))
            wf.writeframes(b"".join(samples))
        return buffer.getvalue()
