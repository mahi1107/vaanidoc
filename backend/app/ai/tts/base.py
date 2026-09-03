from abc import ABC, abstractmethod
from typing import Optional
from pydantic import BaseModel

class TTSResult(BaseModel):
    audio_bytes: bytes
    audio_format: str = "wav"
    duration_seconds: float = 3.0
    text: str
    language: str = "hi"
    is_cached: bool = False

class BaseTTSService(ABC):
    @abstractmethod
    async def synthesize(self, text: str, language: str = "hi") -> TTSResult:
        """Synthesize text to speech audio bytes."""
        pass
