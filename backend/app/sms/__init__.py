from backend.app.sms.base import BaseSMSProvider, SMSMessage, SMSResult
from backend.app.sms.mock_sms import MockSMSProvider
from backend.app.sms.twilio_sms import TwilioSMSProvider
from backend.app.config.settings import settings

def get_sms_provider(provider_name: str = None) -> BaseSMSProvider:
    name = (provider_name or settings.SMS_PROVIDER).lower()
    if name == "twilio":
        return TwilioSMSProvider()
    return MockSMSProvider()

__all__ = ["BaseSMSProvider", "SMSMessage", "SMSResult", "MockSMSProvider", "TwilioSMSProvider", "get_sms_provider"]
