import pytest
from backend.app.ai.nlp.rule_fallback_extractor import RuleBasedSymptomExtractor
from backend.app.ai.triage.engine import TriageEngine

@pytest.mark.asyncio
async def test_emergency_level_4_triage():
    extractor = RuleBasedSymptomExtractor()
    engine = TriageEngine()
    
    text = "सीने में बहुत तेज दर्द है और सांस लेने में भारी तकलीफ है।"
    extracted = await extractor.extract(text, language="hi")
    decision = engine.evaluate(extracted, language="hi")
    
    assert decision.level == 4
    assert decision.category == "emergency"
    assert decision.rule_id in ["EMERG-RED-001", "EMERG-RED-002"]
    assert "108" in decision.voice_guidance_text

@pytest.mark.asyncio
async def test_prolonged_fever_level_3_triage():
    extractor = RuleBasedSymptomExtractor()
    engine = TriageEngine()
    
    text = "मुझे 6 दिन से बहुत तेज बुखार है और कमजोरी है।"
    extracted = await extractor.extract(text, language="hi")
    decision = engine.evaluate(extracted, language="hi")
    
    assert decision.level == 3
    assert decision.category == "hospital"
    assert "HOSP-FEV-001" in decision.rule_id

@pytest.mark.asyncio
async def test_moderate_fever_level_2_phc():
    extractor = RuleBasedSymptomExtractor()
    engine = TriageEngine()
    
    text = "मुझे दो दिन से बुखार है और सिर दर्द है।"
    extracted = await extractor.extract(text, language="hi")
    decision = engine.evaluate(extracted, language="hi")
    
    assert decision.level == 2
    assert decision.category == "phc"

@pytest.mark.asyncio
async def test_mild_cold_level_1_home_care():
    extractor = RuleBasedSymptomExtractor()
    engine = TriageEngine()
    
    text = "हल्की खांसी है एक दिन से।"
    extracted = await extractor.extract(text, language="hi")
    decision = engine.evaluate(extracted, language="hi")
    
    assert decision.level == 1
    assert decision.category == "home_care"
