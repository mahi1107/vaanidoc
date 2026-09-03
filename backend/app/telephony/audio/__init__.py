from backend.app.telephony.audio.base import BaseAudioCaptureService, CapturedAudio
from backend.app.telephony.audio.exotel_audio import ExotelAudioService
from backend.app.telephony.audio.twilio_audio import TwilioAudioService
from backend.app.telephony.audio.mock_audio import MockAudioService
from backend.app.telephony.audio.retention import AudioRetentionManager

def get_audio_capture_service(provider: str = "mock") -> BaseAudioCaptureService:
    provider = provider.lower()
    if provider == "exotel":
        return ExotelAudioService()
    elif provider == "twilio":
        return TwilioAudioService()
    return MockAudioService()

__all__ = [
    "BaseAudioCaptureService",
    "CapturedAudio",
    "ExotelAudioService",
    "TwilioAudioService",
    "MockAudioService",
    "AudioRetentionManager",
    "get_audio_capture_service"
]
