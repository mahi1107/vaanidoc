from typing import Dict, Any, Optional
from backend.app.ivr.base import BaseIVRProvider, IVRCallEvent
from backend.app.utils.logger import logger

class MockIVRProvider(BaseIVRProvider):
    """
    Mock IVR provider for local simulation, automated testing, and developer dashboard.
    """
    def __init__(self):
        self.active_sessions: Dict[str, Dict[str, Any]] = {}

    def handle_incoming_call(self, event: IVRCallEvent) -> Dict[str, Any]:
        logger.info(f"[MockIVR] Handling incoming call {event.call_sid} from {event.from_number}")
        self.active_sessions[event.call_sid] = {
            "status": "connected",
            "from": event.from_number,
            "turns": 0
        }
        return {
            "status": "success",
            "provider": "mock",
            "action": "gather_speech",
            "prompt": "Namaste. VaaniDoc mein aapka swagat hai. Kripya apne lakshan batayein."
        }

    def build_speech_gather_response(self, prompt_text: str, action_url: str, language: str = "hi") -> Dict[str, Any]:
        return {
            "provider": "mock",
            "action": "gather_speech",
            "prompt_text": prompt_text,
            "action_url": action_url,
            "language": language
        }

    def build_guidance_and_hangup(self, guidance_text: str, audio_url: Optional[str] = None, language: str = "hi") -> Dict[str, Any]:
        return {
            "provider": "mock",
            "action": "hangup",
            "guidance_text": guidance_text,
            "audio_url": audio_url,
            "language": language
        }
