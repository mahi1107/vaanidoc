import pytest
from backend.app.ai.asr.mock_asr import MockASRService
from backend.app.ivr.twilio import TwilioIVRProvider
from backend.app.ivr.base import IVRCallEvent
from backend.app.sms.mock_sms import MockSMSProvider
from backend.app.sms.base import SMSMessage

@pytest.mark.asyncio
async def test_mock_asr_normal():
    asr = MockASRService()
    payload = "SIMULATED_SPEECH: मुझे दो दिन से खांसी है।".encode("utf-8")
    res = await asr.transcribe(payload, language="hi")
    assert res.transcript == "मुझे दो दिन से खांसी है।"
    assert res.confidence >= 0.8
    assert res.is_low_confidence is False

@pytest.mark.asyncio
async def test_mock_asr_low_confidence():
    asr = MockASRService()
    payload = "SIMULATED_SPEECH:[LOW_CONF] अस्पष्ट आवाज".encode("utf-8")
    res = await asr.transcribe(payload, language="hi")
    assert res.is_low_confidence is True
    assert res.confidence < 0.65

def test_twilio_twiml_generation():
    ivr = TwilioIVRProvider()
    event = IVRCallEvent(call_sid="CA12345", from_number="+919876543210", to_number="+911122334455")
    twiml = ivr.handle_incoming_call(event)
    assert "<Response>" in twiml
    assert "<Gather" in twiml
    assert "नमस्ते" in twiml

@pytest.mark.asyncio
async def test_mock_sms():
    sms = MockSMSProvider()
    msg = SMSMessage(to_number="+91-9451288741", body="Test alert", call_id="c-123")
    res = await sms.send_sms(msg)
    assert res.success is True
    assert len(sms.sent_messages) == 1
