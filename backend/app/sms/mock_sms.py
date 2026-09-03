import uuid
from typing import List
from backend.app.sms.base import BaseSMSProvider, SMSMessage, SMSResult
from backend.app.utils.logger import logger

class MockSMSProvider(BaseSMSProvider):
    """
    Mock SMS provider for local testing and developer inspection.
    """
    def __init__(self):
        self.sent_messages: List[SMSMessage] = []

    async def send_sms(self, message: SMSMessage) -> SMSResult:
        msg_id = f"mock_sms_{uuid.uuid4().hex[:10]}"
        logger.info(f"[MockSMS] [SMS SENT] to {message.to_number} (Call: {message.call_id}):\n>>> {message.body}")
        self.sent_messages.append(message)
        return SMSResult(
            success=True,
            message_id=msg_id,
            provider="mock"
        )
