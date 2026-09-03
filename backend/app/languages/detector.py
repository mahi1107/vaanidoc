import re
from typing import Dict, Any, Tuple

# Comprehensive Hindi / Hinglish lexical markers in Roman script
HINGLISH_EXCLUSIVE_WORDS = {
  "mujhe", "mera", "meri", "mere", "humko", "humein", "aapko", "tumhe", "isse", "usko",
  "hai", "hain", "tha", "the", "thi", "hoga", "hogi", "hoge", "raha", "rahi", "rahe",
  "mein", "me", "par", "ka", "ki", "ke", "ne", "aur", "ya", "lekin", "bhi",
  "bohot", "bahut", "thoda", "zyada", "kuch", "kya", "kyun", "kaise", "kab", "kahan",
  "din", "raat", "subah", "shaam", "kal", "aaj", "parso",
  "bukhaar", "bukhar", "dard", "sir", "sar", "pet", "gala", "khansi", "saans", "chakkar",
  "kamzori", "kamjori", "khana", "paani", "lag", "ho", "jaana", "karna", "chahiye",
  "karu", "karoon", "batao", "bataiye", "dawa", "dawai", "takleef", "pareshani",
  "dikkat", "seene", "chhati", "dast", "ulti", "badan"
}

# Extensive English vocabulary for healthcare and conversational discourse
ENGLISH_COMMON_WORDS = {
  "i", "have", "had", "am", "is", "are", "was", "were", "been", "being",
  "my", "me", "we", "our", "you", "your", "he", "she", "it", "they", "them",
  "fever", "cold", "pain", "headache", "cough", "breath", "breathing", "vomiting", "weakness",
  "days", "day", "hours", "hour", "since", "from", "for", "in", "on", "at", "to", "and", "or", "but",
  "severe", "mild", "high", "moderate", "doctor", "hospital", "medicine", "help", "need",
  "what", "should", "would", "could", "do", "does", "did", "doing", "done",
  "feel", "feeling", "felt", "take", "taking", "taken", "tell", "please", "can",
  "some", "any", "no", "not", "much", "very", "too", "little", "well", "better",
  "two", "three", "four", "five", "six", "seven", "one", "yesterday", "today", "tomorrow",
  "stomach", "chest", "throat", "body", "dizziness", "dizzy", "tired", "fatigue",
  "ache", "chills", "runny", "nose", "congestion", "infection", "advice", "consult"
}

class LanguageDetector:
  """
  Automatic Language & Code-Switching Detector for Indian Healthcare Discourse.
  Accurately discriminates between:
  1. Devanagari Hindi ('hi')
  2. Pure English ('en')
  3. Hinglish / Mixed Hindi-English ('hinglish')
  """

  def detect(self, text: str) -> Dict[str, Any]:
    if not text or not text.strip():
      return {
        "detected_language": "en",
        "display_name": "English",
        "confidence": 0.8,
        "is_mixed": False,
        "segments": []
      }

    cleaned = text.strip()

    # 1. Check for Devanagari Unicode script range (\u0900-\u097F)
    devanagari_chars = len(re.findall(r'[\u0900-\u097F]', cleaned))
    latin_chars = len(re.findall(r'[a-zA-Z]', cleaned))
    total_letters = devanagari_chars + latin_chars

    if total_letters > 0 and (devanagari_chars / total_letters) > 0.4:
      # Substantial Devanagari script presence
      english_words_in_devanagari = len(re.findall(r'\b[a-zA-Z]{3,}\b', cleaned))
      if english_words_in_devanagari >= 2:
        return {
          "detected_language": "hinglish",
          "display_name": "Hinglish (Devanagari + English)",
          "confidence": 0.94,
          "is_mixed": True,
          "primary_script": "devanagari"
        }
      return {
        "detected_language": "hi",
        "display_name": "Hindi (हिंदी)",
        "confidence": 0.98,
        "is_mixed": False,
        "primary_script": "devanagari"
      }

    # 2. Roman Script Analysis (Hinglish vs English)
    words = re.findall(r'\b[a-zA-Z]+\b', cleaned.lower())
    if not words:
      return {
        "detected_language": "hi" if devanagari_chars > 0 else "en",
        "display_name": "Hindi" if devanagari_chars > 0 else "English",
        "confidence": 0.7,
        "is_mixed": False
      }

    hinglish_matches = sum(1 for w in words if w in HINGLISH_EXCLUSIVE_WORDS)
    english_matches = sum(1 for w in words if w in ENGLISH_COMMON_WORDS)
    total_words = len(words)

    # If the text consists predominantly of English words with no Hinglish-exclusive grammar
    if english_matches >= 2 and hinglish_matches == 0:
      return {
        "detected_language": "en",
        "display_name": "English",
        "confidence": 0.96,
        "is_mixed": False
      }

    # Code-switching detected (e.g. "Mujhe two days se fever hai")
    if hinglish_matches >= 2 and english_matches >= 1:
      return {
        "detected_language": "hinglish",
        "display_name": "Hinglish",
        "confidence": 0.95,
        "is_mixed": True,
        "hinglish_words_count": hinglish_matches,
        "english_words_count": english_matches
      }

    # Hinglish grammar markers present
    if hinglish_matches >= 2:
      return {
        "detected_language": "hinglish",
        "display_name": "Hinglish",
        "confidence": 0.92,
        "is_mixed": True
      }

    if english_matches > hinglish_matches:
      return {
        "detected_language": "en",
        "display_name": "English",
        "confidence": 0.90,
        "is_mixed": False
      }

    if hinglish_matches > 0:
      return {
        "detected_language": "hinglish",
        "display_name": "Hinglish",
        "confidence": 0.85,
        "is_mixed": True
      }

    return {
      "detected_language": "en",
      "display_name": "English",
      "confidence": 0.80,
      "is_mixed": False
    }

language_detector = LanguageDetector()
