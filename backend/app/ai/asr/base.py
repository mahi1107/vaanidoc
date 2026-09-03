from abc import ABC, abstractmethod
from typing import Optional
from pydantic import BaseModel

class ASRResult(BaseModel):
    transcript: str
    confidence: float
    language: str
    is_low_confidence: bool = False
    raw_response: Optional[dict] = None

class BaseASRService(ABC):
    @abstractmethod
    async def transcribe(self, audio_bytes: bytes, language: str = "hi", filename: Optional[str] = None) -> ASRResult:
        """Transcribe audio bytes into text with confidence score."""
        pass
