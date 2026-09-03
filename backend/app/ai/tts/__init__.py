from backend.app.ai.tts.base import BaseTTSService, TTSResult
from backend.app.ai.tts.mock_tts import MockTTSService
from backend.app.ai.tts.indic_tts import IndicTTSService
from backend.app.config.settings import settings

def get_tts_service(provider: str = None) -> BaseTTSService:
    prov = (provider or settings.TTS_PROVIDER).lower()
    if prov in ["indic", "indictts", "coqui"]:
        return IndicTTSService()
    return MockTTSService()

__all__ = ["BaseTTSService", "TTSResult", "MockTTSService", "IndicTTSService", "get_tts_service"]
