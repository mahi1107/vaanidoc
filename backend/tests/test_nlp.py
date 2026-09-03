import pytest
from backend.app.ai.nlp.rule_fallback_extractor import RuleBasedSymptomExtractor

@pytest.mark.asyncio
async def test_simple_fever_extraction():
    extractor = RuleBasedSymptomExtractor()
    text = "मुझे तीन दिन से बहुत तेज बुखार है और सिर दर्द हो रहा है।"
    res = await extractor.extract(text, language="hi")
    
    active_symptoms = [s for s in res.symptoms if not s.is_negated]
    names = [s.name for s in active_symptoms]
    
    assert "fever" in names
    assert "headache" in names
    
    fever_sym = next(s for s in active_symptoms if s.name == "fever")
    assert fever_sym.duration_val == 3
    assert fever_sym.duration_unit == "days"
    assert fever_sym.severity == "severe"

@pytest.mark.asyncio
async def test_negation_extraction():
    extractor = RuleBasedSymptomExtractor()
    text = "मुझे खांसी है लेकिन कोई बुखार नहीं है।"
    res = await extractor.extract(text, language="hi")
    
    cough_sym = next(s for s in res.symptoms if s.name == "cough")
    fever_sym = next(s for s in res.symptoms if s.name == "fever")
    
    assert cough_sym.is_negated is False
    assert fever_sym.is_negated is True

@pytest.mark.asyncio
async def test_emergency_red_flag_detection():
    extractor = RuleBasedSymptomExtractor()
    text = "सीने में बहुत तेज दर्द है और सांस फूल रही है।"
    res = await extractor.extract(text, language="hi")
    
    active_symptoms = [s for s in res.symptoms if not s.is_negated]
    names = [s.name for s in active_symptoms]
    
    assert "chest_pain" in names
    assert "dyspnea" in names
    assert len(res.detected_red_flags) > 0

@pytest.mark.asyncio
async def test_pediatric_context():
    extractor = RuleBasedSymptomExtractor()
    text = "बच्चे को कल से उल्टी और दस्त हो रहे हैं।"
    res = await extractor.extract(text, language="hi")
    
    assert res.age_group == "child"
    active_symptoms = [s for s in res.symptoms if not s.is_negated]
    names = [s.name for s in active_symptoms]
    assert "vomiting" in names
    assert "diarrhea" in names
