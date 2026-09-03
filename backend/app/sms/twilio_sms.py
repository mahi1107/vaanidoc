import uuid
import httpx
from backend.app.sms.base import BaseSMSProvider, SMSMessage, SMSResult
from backend.app.sms.mock_sms import MockSMSProvider
from backend.app.config.settings import settings
from backend.app.utils.logger import logger

class TwilioSMSProvider(BaseSMSProvider):
    """
    Twilio SMS Provider for real SMS alerts to ASHA workers and community nurses.
    """
    def __init__(self):
        self.account_sid = settings.TWILIO_ACCOUNT_SID
        self.auth_token = settings.TWILIO_AUTH_TOKEN
        self.from_number = settings.TWILIO_PHONE_NUMBER
        self.fallback = MockSMSProvider()

    async def send_sms(self, message: SMSMessage) -> SMSResult:
        if not self.account_sid or not self.auth_token or not self.from_number:
            logger.warning("[TwilioSMS] Twilio credentials missing. Falling back to MockSMS.")
            return await self.fallback.send_sms(message)

        try:
            url = f"https://api.twilio.com/2010-04-01/Accounts/{self.account_sid}/Messages.json"
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    url,
                    data={
                        "From": self.from_number,
                        "To": message.to_number,
                        "Body": message.body
                    },
                    auth=(self.account_sid, self.auth_token)
                )
                if resp.status_code in [200, 201]:
                    data = resp.json()
                    return SMSResult(
                        success=True,
                        message_id=data.get("sid", str(uuid.uuid4())),
                        provider="twilio"
                    )
                else:
                    logger.error(f"[TwilioSMS] Send failed with status {resp.status_code}: {resp.text}")
                    return SMSResult(
                        success=False,
                        message_id="failed",
                        provider="twilio",
                        error_message=resp.text
                    )
        except Exception as e:
            logger.error(f"[TwilioSMS] Exception: {e}")
            return await self.fallback.send_sms(message)
