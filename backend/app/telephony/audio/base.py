import io
import wave
import struct
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime, timedelta
from backend.app.config.settings import settings
from backend.app.utils.logger import logger

class CapturedAudio(BaseModel):
    audio_bytes: bytes
    format: str = "wav" # "wav" or "mp3"
    sample_rate_hz: int = 8000
    channels: int = 1
    duration_ms: int = 0
    size_bytes: int = 0
    recording_url: Optional[str] = None
    retention_expiry: Optional[datetime] = None

class BaseAudioCaptureService(ABC):
    """
    Abstract Base Class for Telephony Audio Ingestion & Streaming.
    Captures patient speech binaries directly from telecom provider gateways.
    """
    @abstractmethod
    async def capture_from_url(self, recording_url: str, call_sid: Optional[str] = None) -> CapturedAudio:
        """Download or stream recording bytes from the telecom gateway."""
        pass

    @abstractmethod
    async def capture_from_stream(self, stream_payload: bytes, format: str = "wav") -> CapturedAudio:
        """Ingest real-time incoming audio stream chunk."""
        pass

    def compute_audio_metadata(self, audio_bytes: bytes, format: str = "wav", recording_url: Optional[str] = None) -> CapturedAudio:
        """
        Analyze raw audio bytes to compute telephony sample rate, channels, duration, and retention expiry.
        """
        size = len(audio_bytes)
        sample_rate = 8000
        channels = 1
        duration_ms = 0

        if format.lower() == "wav" and size >= 44:
            try:
                with wave.open(io.BytesIO(audio_bytes), "rb") as wf:
                    channels = wf.getnchannels()
                    sample_rate = wf.getframerate()
                    nframes = wf.getnframes()
                    if sample_rate > 0:
                        duration_ms = int((nframes / sample_rate) * 1000)
            except Exception as e:
                # Estimate for PCM 16-bit 8kHz mono
                duration_ms = int((size / 16000) * 1000)
        else:
            # Fallback estimation for MP3 / raw telephony streams
            duration_ms = max(2000, int((size / 3200) * 1000))

        retention_expiry = datetime.utcnow() + timedelta(days=settings.AUDIO_RETENTION_DAYS)

        return CapturedAudio(
            audio_bytes=audio_bytes,
            format=format,
            sample_rate_hz=sample_rate,
            channels=channels,
            duration_ms=duration_ms,
            size_bytes=size,
            recording_url=recording_url,
            retention_expiry=retention_expiry
        )
