from typing import Optional, Dict, Any
from backend.app.ivr.base import BaseIVRProvider, IVRCallEvent
from backend.app.utils.logger import logger

class ExotelIVRProvider(BaseIVRProvider):
    """
    Exotel Passthru Applet IVR Implementation for Indian telecom infrastructure.
    Returns Exotel-compliant XML / JSON response structures.
    """
    def handle_incoming_call(self, event: IVRCallEvent) -> Dict[str, Any]:
        logger.info(f"[ExotelIVR] Incoming call from {event.from_number}, CallSid={event.call_sid}")
        return {
            "select_passthru": {
                "action": "gather_and_stream",
                "greeting_hi": "Namaste, VaaniDoc mein aapka swagat hai.",
                "record_speech": True,
                "timeout": 6,
                "callback_url": "/api/webhooks/exotel/process"
            }
        }

    def build_speech_gather_response(self, prompt_text: str, action_url: str, language: str = "hi") -> Dict[str, Any]:
        return {
            "exotel_action": "play_and_record",
            "prompt_text": prompt_text,
            "action_url": action_url,
            "max_duration": 15
        }

    def build_guidance_and_hangup(self, guidance_text: str, audio_url: Optional[str] = None, language: str = "hi") -> Dict[str, Any]:
        return {
            "exotel_action": "speak_and_hangup",
            "guidance_text": guidance_text,
            "audio_url": audio_url
        }
