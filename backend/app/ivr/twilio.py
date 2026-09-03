from typing import Optional
from backend.app.ivr.base import BaseIVRProvider, IVRCallEvent
from backend.app.utils.logger import logger

class TwilioIVRProvider(BaseIVRProvider):
    """
    Twilio Voice TwiML IVR implementation.
    Generates standard TwiML XML responses.
    """
    def handle_incoming_call(self, event: IVRCallEvent) -> str:
        logger.info(f"[TwilioIVR] Incoming call {event.call_sid}")
        # Initial greeting and speech gather in Hindi
        return (
            '<?xml version="1.0" encoding="UTF-8"?>\n'
            '<Response>\n'
            '    <Gather input="speech" language="hi-IN" timeout="5" action="/api/webhooks/twilio/gather">\n'
            '        <Say language="hi-IN">नमस्ते, वाणी-डॉक स्वास्थ्य सेवा में आपका स्वागत है। कृपया अपनी समस्या बताएं।</Say>\n'
            '    </Gather>\n'
            '    <Say language="hi-IN">मुझे आपकी आवाज़ नहीं सुनाई दी।</Say>\n'
            '    <Redirect>/api/webhooks/twilio/incoming</Redirect>\n'
            '</Response>'
        )

    def build_speech_gather_response(self, prompt_text: str, action_url: str, language: str = "hi") -> str:
        tw_lang = "hi-IN" if language == "hi" else "en-IN"
        return (
            '<?xml version="1.0" encoding="UTF-8"?>\n'
            '<Response>\n'
            f'    <Gather input="speech" language="{tw_lang}" timeout="6" action="{action_url}">\n'
            f'        <Say language="{tw_lang}">{prompt_text}</Say>\n'
            '    </Gather>\n'
            '    <Say language="hi-IN">कृपया अपनी बात फिर से कहें।</Say>\n'
            '</Response>'
        )

    def build_guidance_and_hangup(self, guidance_text: str, audio_url: Optional[str] = None, language: str = "hi") -> str:
        tw_lang = "hi-IN" if language == "hi" else "en-IN"
        audio_tag = f'    <Play>{audio_url}</Play>\n' if audio_url else ''
        return (
            '<?xml version="1.0" encoding="UTF-8"?>\n'
            '<Response>\n'
            f'{audio_tag}'
            f'    <Say language="{tw_lang}">{guidance_text}</Say>\n'
            '    <Pause length="1"/>\n'
            '    <Say language="hi-IN">अपना ख्याल रखें। धन्यवाद।</Say>\n'
            '    <Hangup/>\n'
            '</Response>'
        )
