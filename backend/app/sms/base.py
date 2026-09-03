from abc import ABC, abstractmethod
from typing import Optional
from pydantic import BaseModel

class SMSMessage(BaseModel):
    to_number: str
    body: str
    call_id: Optional[str] = None
    triage_level: Optional[int] = None
    worker_id: Optional[str] = None

class SMSResult(BaseModel):
    success: bool
    message_id: str
    provider: str
    error_message: Optional[str] = None

class BaseSMSProvider(ABC):
    @abstractmethod
    async def send_sms(self, message: SMSMessage) -> SMSResult:
        """Send an SMS alert to ASHA worker or patient."""
        pass
