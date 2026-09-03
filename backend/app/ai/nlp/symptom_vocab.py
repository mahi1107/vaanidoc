from typing import Dict, List, Set

# Comprehensive Standardized Clinical Symptom Taxonomy mapped to Hindi / Hinglish / English phrases
HINDI_SYMPTOM_TAXONOMY: Dict[str, Dict] = {
    # ─── General & Systemic ──────────────────────────────────────────
    "fever": {
        "standard_name": "fever",
        "hindi_term": "बुखार",
        "keywords": ["बुखार", "bukhaar", "bukhar", "fever", "tap", "ताप", "garam sharir", "गर्म शरीर", "high temperature", "feverish"],
        "is_red_flag_potential": True,
        "default_severity": "moderate"
    },
    "weakness": {
        "standard_name": "weakness",
        "hindi_term": "कमजोरी / थकान",
        "keywords": [
            "कमजोरी", "kamzori", "kamjori", "thakan", "थकान", "weakness", "sust", "सुस्त",
            "fatigue", "tiredness", "weak", "feel weak", "feeling weak", "lethargy",
            "unusually tired", "feeling unusually tired", "feeling tired", "tired", "exhausted"
        ],
        "is_red_flag_potential": False,
        "default_severity": "mild"
    },
    "dizziness": {
        "standard_name": "dizziness",
        "hindi_term": "चक्कर आना",
        "keywords": ["चक्कर", "chakkar", "giddiness", "dizziness", "chakkar aana", "dizzy", "lightheaded", "feel dizzy", "feeling dizzy", "sir ghumna", "सिर घूमना"],
        "is_red_flag_potential": True,
        "default_severity": "moderate"
    },
    "unconsciousness": {
        "standard_name": "unconsciousness",
        "hindi_term": "बेहोशी / मूर्छा",
        "keywords": ["बेहोश", "behosh", "behoshi", "murcha", "unconscious", "hosh nahi", "होश नहीं", "बेहोशी", "fainting", "blackout", "passed out", "fainted"],
        "is_red_flag_potential": True,
        "default_severity": "severe"
    },
    "cold_chills": {
        "standard_name": "cold_chills",
        "hindi_term": "ठंड लगना / कंपकंपी",
        "keywords": ["ठंड लगना", "thand lagna", "chills", "kapkapi", "कंपकंपी", "shivering", "thand lag rahi"],
        "is_red_flag_potential": False,
        "default_severity": "moderate"
    },

    # ─── Neurological & Head ─────────────────────────────────────────
    "headache": {
        "standard_name": "headache",
        "hindi_term": "सिर दर्द",
        "keywords": ["सिर दर्द", "सिर में दर्द", "sir dard", "sar dard", "matha dard", "माथा दर्द", "headache", "sir me dard", "head pain", "severe headache"],
        "is_red_flag_potential": False,
        "default_severity": "moderate"
    },

    # ─── Ophthalmic & Sensory (Eyes, Vision, Ears) ───────────────────
    "blurred_vision": {
        "standard_name": "blurred_vision",
        "hindi_term": "धुंधला दिखना / आंखों की परेशानी",
        "keywords": [
            "धुंधला", "धुंधला दिखना", "dhundhla", "blurry", "blurred vision", "blurry vision",
            "vision is blurry", "vision blurry", "kam dikhna", "कम दिखना", "aankhon me dhundhla",
            "eye blur", "dim vision", "double vision", "aankhon me dard", "eye pain",
            "aankhon mein jalan", "aankhon me jalan", "paani aa raha", "watering eyes", "watery eyes"
        ],
        "is_red_flag_potential": True,
        "default_severity": "moderate"
    },
    "ear_pain": {
        "standard_name": "ear_pain",
        "hindi_term": "कान में दर्द / बहाव",
        "keywords": ["कान में दर्द", "kan dard", "kaan dard", "ear pain", "earache", "kaan behna", "कान बहना", "ear has been hurting", "ear hurting"],
        "is_red_flag_potential": False,
        "default_severity": "moderate"
    },

    # ─── ENT & Respiratory ───────────────────────────────────────────
    "cold": {
        "standard_name": "cold",
        "hindi_term": "सर्दी / जुकाम",
        "keywords": [
            "सर्दी", "जुकाम", "sardi", "jukam", "cold", "common cold", "runny nose",
            "sneezing", "chheenk", "छींक", "nazla", "नज़ला", "congestion",
            "band naak", "नाक बहना", "naak behna", "naak band", "have a cold", "have cold"
        ],
        "is_red_flag_potential": False,
        "default_severity": "mild"
    },
    "cough": {
        "standard_name": "cough",
        "hindi_term": "खांसी",
        "keywords": ["खांसी", "khansi", "khasi", "cough", "dhaska", "धसका", "balgam", "बलगम", "dry cough", "coughing"],
        "is_red_flag_potential": True,
        "default_severity": "mild"
    },
    "sore_throat": {
        "standard_name": "sore_throat",
        "hindi_term": "गले में खराश / जलन / दर्द",
        "keywords": [
            "गले में खराश", "गला दर्द", "gale me dard", "sore throat", "throat pain", "gala kharab",
            "khash-khash", "गला खराब", "burning in my throat", "burning sensation in my throat",
            "throat burning", "when i swallow", "pain when swallowing", "burning in throat"
        ],
        "is_red_flag_potential": False,
        "default_severity": "mild"
    },
    "dyspnea": {
        "standard_name": "dyspnea",
        "hindi_term": "सांस लेने में तकलीफ",
        "keywords": [
            "सांस लेने में तकलीफ", "सांस फूलना", "सांस फूल रही", "सांस लेने में भारी तकलीफ", "सांस की तकलीफ",
            "saans phulna", "saas fulna", "saans lene me takleef", "dam ghutna", "दम घुटना",
            "breathing problem", "shortness of breath", "difficulty breathing", "breathlessness",
            "saans ful rahi", "saans lene mein pareshani", "breathing difficulty"
        ],
        "is_red_flag_potential": True,
        "default_severity": "severe"
    },

    # ─── Cardiovascular & Chest ──────────────────────────────────────
    "chest_pain": {
        "standard_name": "chest_pain",
        "hindi_term": "सीने में दर्द",
        "keywords": [
            "सीने में दर्द", "सीने में बहुत तेज दर्द", "सीने में तेज दर्द", "छाती में दर्द", "seene me dard",
            "seene mein dard", "chhati me dard", "chest pain", "chhati dabav", "chest tightness",
            "chest pressure", "seene me bhari dard"
        ],
        "is_red_flag_potential": True,
        "default_severity": "severe"
    },

    # ─── Gastrointestinal & Abdominal ────────────────────────────────
    "abdominal_pain": {
        "standard_name": "abdominal_pain",
        "hindi_term": "पेट दर्द",
        "keywords": [
            "पेट दर्द", "पेट में दर्द", "pet dard", "pet me dard", "pet mein dard", "stomach pain",
            "stomach ache", "stomach hurts", "stomach hurt", "belly hurts", "pet me marod", "मरोड़",
            "abdominal pain", "belly pain", "lower stomach mein pain", "lower stomach me pain",
            "lower abdominal pain", "lower stomach pain", "pet ke nichle hisse me dard"
        ],
        "is_red_flag_potential": False,
        "default_severity": "moderate"
    },
    "vomiting": {
        "standard_name": "vomiting",
        "hindi_term": "उल्टी",
        "keywords": ["उल्टी", "उल्टियां", "ulti", "ultiyan", "vomit", "vomiting", "qai", "कै", "matli", "मतली", "nausea"],
        "is_red_flag_potential": True,
        "default_severity": "moderate"
    },
    "diarrhea": {
        "standard_name": "diarrhea",
        "hindi_term": "दस्त / पेचिश",
        "keywords": ["दस्त", "dast", "loose motion", "diarrhea", "pechish", "पेचिश", "patla pakhana", "पतला पाखाना", "loose motions"],
        "is_red_flag_potential": True,
        "default_severity": "moderate"
    },
    "constipation": {
        "standard_name": "constipation",
        "hindi_term": "कब्ज",
        "keywords": ["कब्ज", "kabj", "kabz", "constipation", "pet saaf nahi", "straining"],
        "is_red_flag_potential": False,
        "default_severity": "mild"
    },

    # ─── Genitourinary & Renal ───────────────────────────────────────
    "burning_urination": {
        "standard_name": "burning_urination",
        "hindi_term": "पेशाब में जलन / दर्द",
        "keywords": [
            "पेशाब में जलन", "peshab me jalan", "urine me burning", "burning urination", "painful urination",
            "urine karte time burning", "urine karte waqt jalan", "urine me jalan", "urine mein jalan",
            "peshab karte waqt jalan", "peshab karte time jalan", "dysuria", "urine burning", "peshab me dard",
            "urine infection", "peshab ruk ruk kar aana", "peshab me takleef", "urine jalan"
        ],
        "is_red_flag_potential": False,
        "default_severity": "moderate"
    },

    # ─── Dermatological (Skin & Rash) ────────────────────────────────
    "skin_rash": {
        "standard_name": "skin_rash",
        "hindi_term": "त्वचा पर दाने / चकत्ते",
        "keywords": [
            "दाने", "dane", "rash", "skin rash", "skin rash on my arm", "skin rash on arm",
            "rash on arm", "chakatte", "चकत्ते", "allergy", "twacha par dane", "red spots"
        ],
        "is_red_flag_potential": False,
        "default_severity": "mild"
    },
    "itching": {
        "standard_name": "itching",
        "hindi_term": "खुजली",
        "keywords": ["खुजली", "khujli", "itchy", "itching", "very itchy", "pruritus", "khujlana", "body me khujli"],
        "is_red_flag_potential": False,
        "default_severity": "mild"
    },

    # ─── Musculoskeletal & Pain ──────────────────────────────────────
    "body_ache": {
        "standard_name": "body_ache",
        "hindi_term": "बदन दर्द",
        "keywords": ["बदन दर्द", "badan dard", "body pain", "body ache", "muscle pain", "badan me dard", "badan toot raha"],
        "is_red_flag_potential": False,
        "default_severity": "mild"
    },
    "joint_pain": {
        "standard_name": "joint_pain",
        "hindi_term": "जोड़ों का दर्द",
        "keywords": [
            "जोड़ों का दर्द", "jodon me dard", "joint pain", "gathiya", "ghutno me dard", "घुटनों में दर्द", "arthritis"
        ],
        "is_red_flag_potential": False,
        "default_severity": "moderate"
    },
    "back_pain": {
        "standard_name": "back_pain",
        "hindi_term": "कमर दर्द / पीठ दर्द",
        "keywords": [
            "कमर दर्द", "kamar dard", "kamar mein dard", "kamar me dard", "back pain", "backache",
            "peeth dard", "पीठ दर्द", "lower back", "lower back pain", "lower back has been hurting"
        ],
        "is_red_flag_potential": False,
        "default_severity": "moderate"
    },
    "swelling": {
        "standard_name": "swelling",
        "hindi_term": "सूजन",
        "keywords": ["सूजन", "sujan", "swelling", "swollen", "ankle swollen", "ankle is swollen", "swollen ankle", "pair me sujan"],
        "is_red_flag_potential": False,
        "default_severity": "moderate"
    },
    "lump": {
        "standard_name": "lump",
        "hindi_term": "गांठ / उभार",
        "keywords": ["गांठ", "ganth", "gilti", "गिल्टी", "lump", "painful lump", "lump on my neck", "neck lump"],
        "is_red_flag_potential": False,
        "default_severity": "moderate"
    },

    # ─── Trauma, Wounds & Bleeding ───────────────────────────────────
    "bleeding": {
        "standard_name": "bleeding",
        "hindi_term": "खून बहना / रक्तस्राव",
        "keywords": ["खून बहना", "खून", "khoon", "bleeding", "raktsrav", "rakt", "rakht", "khoon aana", "heavy bleeding", "blood loss"],
        "is_red_flag_potential": True,
        "default_severity": "severe"
    },
    "wound_injury": {
        "standard_name": "wound_injury",
        "hindi_term": "घाव / चोट",
        "keywords": [
            "घाव", "ghav", "chot", "चोट", "wound", "injury", "cut", "burn injury", "thermal burn",
            "jal gaya", "जल गया", "skin burn"
        ],
        "is_red_flag_potential": True,
        "default_severity": "moderate"
    }
}

# Negation words in Hindi, Hinglish, and English
NEGATION_MARKERS: List[str] = [
    "नहीं", "nahi", "nahin", "naa", "koi nahi", "koi dikkat nahi",
    "bina", "mukti", "dur", "nahi hai", "नहीं है", "कोई बुखार नहीं",
    "no", "not", "without", "none", "no fever", "no pain", "not having", "haven't"
]

# Severity modifiers
SEVERITY_MODIFIERS: Dict[str, List[str]] = {
    "severe": [
        "बहुत तेज", "bahut tez", "bohot tez", "asaniyah", "असहनीय", "severe", "extreme",
        "bahut zyada", "बहुत ज्यादा", "भारी", "high", "very high", "very itchy", "unbearable", "bahut"
    ],
    "moderate": ["madhyam", "theek thaak", "theek", "thek", "darmiyana", "moderate", "medium"],
    "mild": ["हल्का", "हल्की", "halka", "halki", "thoda", "thoda sa", "kam", "mild", "slight", "low", "a little"]
}

# Duration extraction map
DURATION_NUMBER_WORDS: Dict[str, int] = {
    "एक": 1, "ek": 1, "1": 1, "one": 1,
    "दो": 2, "do": 2, "2": 2, "two": 2,
    "तीन": 3, "teen": 3, "tin": 3, "3": 3, "three": 3,
    "चार": 4, "chaar": 4, "char": 4, "4": 4, "four": 4,
    "पांच": 5, "paanch": 5, "panch": 5, "5": 5, "five": 5,
    "छह": 6, "chhah": 6, "chhe": 6, "6": 6, "six": 6,
    "सात": 7, "saat": 7, "sat": 7, "7": 7, "seven": 7,
    "दस": 10, "das": 10, "10": 10,
    "kal": 1, "कल": 1, "yesterday": 1, "aaj": 0, "आज": 0, "today": 0, "subah": 0, "सुबह": 0,
    "morning": 0, "this morning": 0
}

# Demographic / Patient Context
DEMOGRAPHIC_KEYWORDS = {
    "child": ["बच्चा", "बच्ची", "बच्चे", "baby", "child", "infant", "chhota bachha", "pediatric", "ladka", "ladki"],
    "elderly": ["बुजुर्ग", "bujurg", "buddha", "elderly", "senior", "dada", "dadi", "nana", "nani", "old age"],
    "adult": ["bada", "adult", "young"]
}

PREGNANCY_KEYWORDS = [
    "गर्भवती", "garbhavati", "pregnant", "pregnancy", "garbh", "pet me bachha",
    "maheene se", "dhai maheena", "delivery", "expecting"
]
