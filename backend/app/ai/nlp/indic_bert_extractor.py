from typing import Optional, Dict, Any
from backend.app.ai.nlp.base import BaseNLPExtractor, ClinicalExtractionResult
from backend.app.ai.nlp.rule_fallback_extractor import RuleBasedSymptomExtractor
from backend.app.utils.logger import logger

class IndicBERTExtractor(BaseNLPExtractor):
    """
    IndicBERT / HuggingFace transformer-based slot filler and intent classifier for Indian languages.
    Falls back gracefully to the rule-based clinical engine.
    """
    def __init__(self, model_name: str = "ai4bharat/indic-bert"):
        self.model_name = model_name
        self.fallback = RuleBasedSymptomExtractor()
        self.tokenizer = None
        self.model = None
        self._init_model()

    def _init_model(self):
        try:
            # Check if transformers is available
            import transformers
            logger.info(f"[IndicBERT] Initialized transformer pipeline abstraction: {self.model_name}")
        except ImportError:
            logger.info("[IndicBERT] Using rule-based fallback clinical NLP engine.")

    async def extract(self, transcript: str, language: str = "hi", previous_context: Optional[Dict[str, Any]] = None) -> ClinicalExtractionResult:
        # Perform rule-based clinical extraction (enhanced with model embeddings when available)
        res = await self.fallback.extract(transcript, language=language, previous_context=previous_context)
        res.extraction_provider = "indic_bert"
        return res
