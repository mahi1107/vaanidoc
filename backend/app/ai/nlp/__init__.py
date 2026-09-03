from backend.app.ai.nlp.base import BaseNLPExtractor, ExtractedSymptom, ClinicalExtractionResult
from backend.app.ai.nlp.rule_fallback_extractor import RuleBasedSymptomExtractor
from backend.app.ai.nlp.indic_bert_extractor import IndicBERTExtractor
from backend.app.config.settings import settings

def get_nlp_service(provider: str = None) -> BaseNLPExtractor:
    prov = (provider or settings.NLP_PROVIDER).lower()
    if prov in ["indic", "indicbert", "huggingface"]:
        return IndicBERTExtractor()
    return RuleBasedSymptomExtractor()

__all__ = [
    "BaseNLPExtractor",
    "ExtractedSymptom",
    "ClinicalExtractionResult",
    "RuleBasedSymptomExtractor",
    "IndicBERTExtractor",
    "get_nlp_service"
]
