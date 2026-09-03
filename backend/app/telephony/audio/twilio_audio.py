from typing import Optional
import httpx
from backend.app.telephony.audio.base import BaseAudioCaptureService, CapturedAudio
from backend.app.config.settings import settings
from backend.app.utils.logger import logger

class TwilioAudioService(BaseAudioCaptureService):
    """
    Twilio Voice Audio Capture & Recording Ingestion.
    Downloads call recordings directly from Twilio API endpoints using HTTP Basic Auth.
    """
    async def capture_from_url(self, recording_url: str, call_sid: Optional[str] = None) -> CapturedAudio:
        logger.info(f"[TwilioAudio] Ingesting telephony audio from {recording_url} (CallSid: {call_sid})")

        # Append .wav format if standard Twilio Recording URL without extension
        target_url = recording_url
        if not target_url.endswith(".wav") and not target_url.endswith(".mp3"):
            target_url = f"{recording_url}.wav"

        auth = None
        if settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN:
            auth = (settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)

        try:
            async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
                resp = await client.get(target_url, auth=auth)
                if resp.status_code == 200:
                    audio_bytes = resp.content
                    return self.compute_audio_metadata(audio_bytes, format="wav", recording_url=recording_url)
                else:
                    logger.warning(f"[TwilioAudio] Received status {resp.status_code} fetching recording: {resp.text[:100]}")
        except Exception as e:
            logger.error(f"[TwilioAudio] Error fetching recording from Twilio: {e}")

        return self.compute_audio_metadata(b"", format="wav", recording_url=recording_url)

    async def capture_from_stream(self, stream_payload: bytes, format: str = "wav") -> CapturedAudio:
        return self.compute_audio_metadata(stream_payload, format=format)
