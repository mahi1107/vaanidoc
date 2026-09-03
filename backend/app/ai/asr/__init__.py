from backend.app.ai.asr.base import BaseASRService, ASRResult
from backend.app.ai.asr.mock_asr import MockASRService
from backend.app.ai.asr.indic_asr import IndicASRService
from backend.app.config.settings import settings

def get_asr_service(provider: str = None) -> BaseASRService:
    prov = (provider or settings.ASR_PROVIDER).lower()
    if prov == "mock":
        return MockASRService()
    return IndicASRService()

__all__ = ["BaseASRService", "ASRResult", "MockASRService", "IndicASRService", "get_asr_service"]
