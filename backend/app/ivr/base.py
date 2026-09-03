from abc import ABC, abstractmethod
from typing import Optional, Dict, Any, List
from pydantic import BaseModel

class IVRCallEvent(BaseModel):
    call_sid: str
    from_number: str
    to_number: str
    event_type: str = "incoming"  # incoming, speech_result, recording_ready, hangup
    speech_result: Optional[str] = None
    recording_url: Optional[str] = None
    digits: Optional[str] = None
    language: str = "hi"
    raw_payload: Optional[Dict[str, Any]] = None

class IVRResponseAction(BaseModel):
    action_type: str  # speak, play_audio, gather_speech, hangup
    text_to_speak: Optional[str] = None
    audio_url: Optional[str] = None
    language: str = "hi"
    action_url: Optional[str] = None
    timeout_seconds: int = 5

class BaseIVRProvider(ABC):
    @abstractmethod
    def handle_incoming_call(self, event: IVRCallEvent) -> Any:
        """Handle incoming call webhook and return telephony XML/TwiML/JSON response."""
        pass

    @abstractmethod
    def build_speech_gather_response(self, prompt_text: str, action_url: str, language: str = "hi") -> Any:
        """Prompt user with audio/voice and gather speech input."""
        pass

    @abstractmethod
    def build_guidance_and_hangup(self, guidance_text: str, audio_url: Optional[str] = None, language: str = "hi") -> Any:
        """Speak final guidance, wait for playback, and hangup."""
        pass
