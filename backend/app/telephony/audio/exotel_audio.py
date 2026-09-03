from typing import Optional
import httpx
from backend.app.telephony.audio.base import BaseAudioCaptureService, CapturedAudio
from backend.app.config.settings import settings
from backend.app.utils.logger import logger

class ExotelAudioService(BaseAudioCaptureService):
    """
    Exotel Telecom Audio Capture & Recording Ingestion.
    Downloads call recordings directly from Exotel's media infrastructure.
    """
    async def capture_from_url(self, recording_url: str, call_sid: Optional[str] = None) -> CapturedAudio:
        logger.info(f"[ExotelAudio] Ingesting telephony audio from {recording_url} (CallSid: {call_sid})")
        
        auth = None
        if settings.EXOTEL_API_KEY and settings.EXOTEL_API_TOKEN:
            auth = (settings.EXOTEL_API_KEY, settings.EXOTEL_API_TOKEN)

        try:
            async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
                resp = await client.get(recording_url, auth=auth)
                if resp.status_code == 200:
                    audio_bytes = resp.content
                    fmt = "wav" if "wav" in recording_url.lower() or "audio/wav" in resp.headers.get("content-type", "") else "mp3"
                    return self.compute_audio_metadata(audio_bytes, format=fmt, recording_url=recording_url)
                else:
                    logger.warning(f"[ExotelAudio] Received status {resp.status_code} fetching recording: {resp.text[:100]}")
        except Exception as e:
            logger.error(f"[ExotelAudio] Error fetching recording from Exotel: {e}")

        # Graceful fallback: produce structured audio format
        return self.compute_audio_metadata(b"", format="wav", recording_url=recording_url)

    async def capture_from_stream(self, stream_payload: bytes, format: str = "wav") -> CapturedAudio:
        return self.compute_audio_metadata(stream_payload, format=format)
