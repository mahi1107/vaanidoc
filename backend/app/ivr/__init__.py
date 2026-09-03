from backend.app.ivr.base import BaseIVRProvider, IVRCallEvent, IVRResponseAction
from backend.app.ivr.mock import MockIVRProvider
from backend.app.ivr.twilio import TwilioIVRProvider
from backend.app.ivr.exotel import ExotelIVRProvider
from backend.app.config.settings import settings

def get_ivr_provider(provider_name: str = None) -> BaseIVRProvider:
    name = (provider_name or settings.IVR_PROVIDER).lower()
    if name == "exotel":
        return ExotelIVRProvider()
    elif name == "twilio":
        return TwilioIVRProvider()
    return MockIVRProvider()

__all__ = [
    "BaseIVRProvider",
    "IVRCallEvent",
    "IVRResponseAction",
    "MockIVRProvider",
    "TwilioIVRProvider",
    "ExotelIVRProvider",
    "get_ivr_provider"
]
