from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class ClinicalProtocol(BaseModel):
    rule_id: str
    level: int  # 1: Home Care, 2: PHC, 3: Hospital, 4: Emergency
    category: str
    name: str
    condition_description: str
    action_guidance_hi: str
    action_guidance_en: str
    urgency: str
    reference_guideline: str = "WHO IMCI / ICMR Standard Treatment Guidelines"

CLINICAL_PROTOCOLS_CATALOG: List[ClinicalProtocol] = [
    # ─── Level 4 — Emergency Protocols ─────────────────────────────────
    ClinicalProtocol(
        rule_id="EMERG-RED-001",
        level=4,
        category="emergency",
        name="Severe Respiratory Distress / Dyspnea",
        condition_description="Patient reporting severe breathing difficulty, gasping, or suffocation.",
        action_guidance_hi="तुरंत आपातकालीन नंबर 108 पर कॉल करें या नजदीकी अस्पताल की इमरजेंसी में जाएं। सांस लेने में गंभीर रुकावट है।",
        action_guidance_en="Call emergency ambulance 108 or go to nearest emergency hospital immediately.",
        urgency="immediate",
        reference_guideline="ICMR Emergency Triage & WHO IMCI Danger Signs"
    ),
    ClinicalProtocol(
        rule_id="EMERG-RED-002",
        level=4,
        category="emergency",
        name="Acute Severe Chest Pain",
        condition_description="Severe chest pain, heavy pressure, or radiation to left arm/jaw.",
        action_guidance_hi="सीने में तेज दर्द हृदय संबंधी आपातकाल हो सकता है। तुरंत 108 पर कॉल करें या निकटतम अस्पताल जाएं।",
        action_guidance_en="Immediate cardiac emergency protocol. Call 108 ambulance immediately.",
        urgency="immediate",
        reference_guideline="Standard Emergency Medicine Guidelines"
    ),
    ClinicalProtocol(
        rule_id="EMERG-RED-003",
        level=4,
        category="emergency",
        name="Altered Consciousness or Unconsciousness",
        condition_description="Caller reports fainting, unresponsiveness, or severe lethargy.",
        action_guidance_hi="मरीज की बेहोशी या सुस्ती एक गंभीर आपातकाल है। मरीज को करवट लिटाएं और तुरंत आपातकालीन अस्पताल ले जाएं।",
        action_guidance_en="Unconsciousness / severe altered mental status. Immediate emergency transfer required.",
        urgency="immediate",
        reference_guideline="WHO Integrated Management of Emergency Care"
    ),
    ClinicalProtocol(
        rule_id="EMERG-RED-004",
        level=4,
        category="emergency",
        name="Severe Active Bleeding",
        condition_description="Uncontrolled or massive bleeding.",
        action_guidance_hi="रक्तस्राव रोकने के लिए साफ कपड़े से दबाव बनाएं और बिना देर किए तुरंत अस्पताल जाएं।",
        action_guidance_en="Uncontrolled hemorrhage. Apply direct pressure and seek immediate emergency care.",
        urgency="immediate",
        reference_guideline="Emergency First Response Protocols"
    ),
    
    # ─── Level 3 — Hospital / CHC Protocols ────────────────────────────
    ClinicalProtocol(
        rule_id="HOSP-NEURO-001",
        level=3,
        category="hospital",
        name="Acute Sudden Dizziness & Vision Disturbance",
        condition_description="Sudden onset dizziness, blurred vision, or acute neurological/vestibular symptoms.",
        action_guidance_hi="अचानक चक्कर और आंखों में धुंधलापन आना गंभीर स्थिति का संकेत हो सकता है। कृपया तुरंत नजदीकी सामुदायिक स्वास्थ्य केंद्र (CHC) या अस्पताल में डॉक्टर से जांच करवाएं।",
        action_guidance_en="Sudden onset dizziness and visual disturbance warrants urgent clinical evaluation at a Community Health Centre (CHC) or Hospital.",
        urgency="within_24h",
        reference_guideline="Neurological Clinical Safety & Triage Guidelines"
    ),
    ClinicalProtocol(
        rule_id="HOSP-FEV-001",
        level=3,
        category="hospital",
        name="Prolonged / High-Grade Fever (> 5-7 days)",
        condition_description="Fever persisting for 5 or more days with severe weakness or body pain.",
        action_guidance_hi="बुखार कई दिनों से है, यह टाइफाइड, डेंगू या अन्य संक्रमण हो सकता है। कृपया सामुदायिक स्वास्थ्य केंद्र (CHC) या जिला अस्पताल में रक्त जांच करवाएं।",
        action_guidance_en="Prolonged fever requires blood investigation and physician review at CHC/Hospital.",
        urgency="within_24h",
        reference_guideline="NVBDCP / ICMR Fever Management Guidelines"
    ),
    ClinicalProtocol(
        rule_id="HOSP-PED-001",
        level=3,
        category="hospital",
        name="Pediatric Dehydration with Persistent Vomiting & Diarrhea",
        condition_description="Child with persistent diarrhea and inability to retain fluids.",
        action_guidance_hi="बच्चे में उल्टी-दस्त से पानी की भारी कमी (डिहाइड्रेशन) का खतरा है। ओआरएस (ORS) घोल पिलाते रहें और आज ही नजदीकी अस्पताल ले जाएं।",
        action_guidance_en="Pediatric dehydration risk. Administer ORS and visit hospital for clinical hydration management.",
        urgency="within_24h",
        reference_guideline="WHO IMCI Diarrhea with Moderate/Severe Dehydration"
    ),
    ClinicalProtocol(
        rule_id="HOSP-MAT-001",
        level=3,
        category="hospital",
        name="Maternal Health Warning Signs in Pregnancy",
        condition_description="Pregnant patient with severe abdominal pain, high fever, or vomiting.",
        action_guidance_hi="गर्भावस्था के दौरान यह लक्षण विशेष डॉक्टरी देखभाल मांगते हैं। कृपया तुरंत अपनी आशा दीदी से संपर्क करें या जिला अस्पताल जाएं।",
        action_guidance_en="Obstetric warning signs. Urgent hospital/FRU evaluation required.",
        urgency="within_24h",
        reference_guideline="Pradhan Mantri Surakshit Matritva Abhiyan (PMSMA)"
    ),

    # ─── Level 2 — PHC (Primary Health Centre) Protocols ───────────────
    ClinicalProtocol(
        rule_id="PHC-ABD-001",
        level=2,
        category="phc",
        name="Abdominal / Stomach Pain Evaluation",
        condition_description="Patient reporting ongoing or progressive stomach / abdominal discomfort.",
        action_guidance_hi="पेट में दर्द की स्थिति में अगले 24 से 48 घंटों में प्राथमिक स्वास्थ्य केंद्र (PHC) जाकर डॉक्टर से पेट की जांच करवाएं। हल्का सुपाच्य भोजन लें।",
        action_guidance_en="For ongoing stomach pain, visit your local Primary Health Centre (PHC) within 24-48 hours for clinical palpation and assessment.",
        urgency="within_48h",
        reference_guideline="ICMR Primary Care Clinical Guidelines"
    ),
    ClinicalProtocol(
        rule_id="PHC-UTI-001",
        level=2,
        category="phc",
        name="Dysuria / Urinary Discomfort Protocol",
        condition_description="Patient experiencing burning sensation or pain during urination.",
        action_guidance_hi="पेशाब में जलन संभावित मूत्र संक्रमण (UTI) का लक्षण हो सकता है। खूब पानी पिएं और 24-48 घंटे में प्राथमिक स्वास्थ्य केंद्र (PHC) जाकर जांच करवाएं।",
        action_guidance_en="Urinary burning indicates potential urinary tract inflammation. Maintain high hydration and visit your local PHC for routine urinalysis.",
        urgency="within_48h",
        reference_guideline="National Health Mission UTI Protocols"
    ),
    ClinicalProtocol(
        rule_id="PHC-ENT-001",
        level=2,
        category="phc",
        name="Otalgia / Ear Pain Clinical Evaluation",
        condition_description="Patient experiencing ear pain, discharge, or discomfort.",
        action_guidance_hi="कान में दर्द के लिए कान में तेल या कोई नुस्खा न डालें। 24 से 48 घंटे में प्राथमिक स्वास्थ्य केंद्र (PHC) जाकर डॉक्टर से कान की जांच करवाएं।",
        action_guidance_en="Avoid instilling home drops. Visit your nearest Primary Health Centre (PHC) within 24-48 hours for an otoscopic examination.",
        urgency="within_48h",
        reference_guideline="Ayushman Bharat ENT Primary Assessment"
    ),
    ClinicalProtocol(
        rule_id="PHC-DERM-001",
        level=2,
        category="phc",
        name="Dermatological Rash & Itching Protocol",
        condition_description="Patient reporting localized or generalized skin rash with pruritus.",
        action_guidance_hi="त्वचा पर चकत्ते और खुजली के लिए त्वचा को साफ रखें और खरोंचने से बचें। 24-48 घंटे में प्राथमिक स्वास्थ्य केंद्र (PHC) जाकर डॉक्टर से दिखाएं।",
        action_guidance_en="Keep skin clean and avoid scratching. Visit your local PHC within 24-48 hours for a topical clinical review.",
        urgency="within_48h",
        reference_guideline="Dermatology Primary Care Guidelines"
    ),
    ClinicalProtocol(
        rule_id="PHC-FEV-001",
        level=2,
        category="phc",
        name="Moderate Fever (2-4 days) or Associated Headache",
        condition_description="Fever lasting 2 to 4 days with moderate headache or fatigue.",
        action_guidance_hi="आपके बुखार और सिर दर्द को देखते हुए सलाह है कि आप 24 से 48 घंटे में अपने नजदीकी प्राथमिक स्वास्थ्य केंद्र (PHC) में डॉक्टर को दिखाएं।",
        action_guidance_en="Visit Primary Health Centre within 24-48 hours for clinical evaluation and basic vitals.",
        urgency="within_48h",
        reference_guideline="National Health Mission PHC Clinical Protocols"
    ),
    ClinicalProtocol(
        rule_id="PHC-URI-001",
        level=2,
        category="phc",
        name="Persistent Cough with Phlegm or Mild Wheeze",
        condition_description="Cough lasting 3+ days without severe dyspnea.",
        action_guidance_hi="खांसी कई दिनों से है, इसलिए प्राथमिक स्वास्थ्य केंद्र (PHC) जाकर सीने की जांच करवाएं। गर्म पानी पिएं।",
        action_guidance_en="Persistent respiratory tract cough. PHC physician auscultation recommended.",
        urgency="within_48h",
        reference_guideline="RNTCP / National TB & Respiratory Protocols"
    ),
    ClinicalProtocol(
        rule_id="PHC-GI-001",
        level=2,
        category="phc",
        name="Mild to Moderate Diarrhea / Loose Motions",
        condition_description="Adult with 2-3 episodes of loose motions without severe dehydration.",
        action_guidance_hi="ओआरएस (ORS) या नमक-चीनी का घोल बार-बार पिएं। यदि 24 घंटे में आराम न मिले तो नजदीकी पीएचसी में जाकर दवा लें।",
        action_guidance_en="Oral rehydration solution therapy and visit local PHC for symptomatic assessment.",
        urgency="within_48h",
        reference_guideline="WHO Oral Rehydration Therapy"
    ),

    # ─── Level 1 — Home Care / Self-Care Protocols ─────────────────────
    ClinicalProtocol(
        rule_id="HOME-COLD-001",
        level=1,
        category="home_care",
        name="Mild Common Cold / Slight Fever (< 2 days)",
        condition_description="Mild nasal congestion, throat irritation, or low-grade brief fever.",
        action_guidance_hi="यह सामान्य मौसमी सर्दी-जुकाम लग रहा है। गुनगुना पानी पिएं, भाप लें और पूरा आराम करें। यदि 2 दिन में तबियत न सुधरे तो पीएचसी जाएं।",
        action_guidance_en="Mild viral upper respiratory symptoms. Rest, hydration, steam inhalation, and home monitoring.",
        urgency="routine",
        reference_guideline="ICMR Self-Care & Community Health Guidelines"
    ),
    ClinicalProtocol(
        rule_id="HOME-ACHE-001",
        level=1,
        category="home_care",
        name="Mild Body Ache / Fatigue",
        condition_description="Mild generalized tiredness or muscular soreness.",
        action_guidance_hi="थकान और बदन दर्द के लिए पर्याप्त आराम करें, पौष्टिक आहार लें और पानी पिएं।",
        action_guidance_en="Mild fatigue/myalgia. Rest, adequate fluid intake and monitoring.",
        urgency="routine",
        reference_guideline="Ayushman Bharat Health & Wellness Centre Advisory"
    ),
    ClinicalProtocol(
        rule_id="FALLBACK-SAFE-001",
        level=2,
        category="phc",
        name="Uncertain Symptoms Conservative Escalation",
        condition_description="Symptoms unclear or combination not fitting single benign pattern.",
        action_guidance_hi="आपकी सुरक्षा के लिए सलाह दी जाती है कि आप एक बार अपने नजदीकी स्वास्थ्य केंद्र (PHC) में डॉक्टर को दिखा लें।",
        action_guidance_en="Conservative clinical fallback: recommend in-person PHC check-up.",
        urgency="within_48h",
        reference_guideline="Conservative AI Clinical Safety Policy"
    )
]

def get_protocol_by_id(rule_id: str) -> ClinicalProtocol:
    for p in CLINICAL_PROTOCOLS_CATALOG:
        if p.rule_id == rule_id:
            return p
    return CLINICAL_PROTOCOLS_CATALOG[-1]
